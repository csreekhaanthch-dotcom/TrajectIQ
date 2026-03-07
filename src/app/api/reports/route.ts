import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { generateShareToken } from '@/lib/utils/encryption';
import { generateScoreExplanation, generateComparisonReport } from '@/lib/scoring';
import { z } from 'zod';

const createReportSchema = z.object({
  type: z.enum(['CANDIDATE_SCORECARD', 'CANDIDATE_COMPARISON', 'REQUIREMENT_SUMMARY']),
  candidateId: z.string().optional(),
  requirementId: z.string().optional(),
  comparedCandidateIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const organizationId = session.organizationId;
    const body = await request.json();
    const validatedData = createReportSchema.parse(body);

    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        data: {
          id: 'demo-report-' + Date.now(),
          title: `Demo ${validatedData.type} Report`,
          type: validatedData.type,
          content: '# Demo Report\n\nThis is a demo report generated in demo mode.\n\n## Summary\n- Candidate Score: 78.5\n- Grade: B+\n- Recommendation: STRONG_REVIEW',
          shareToken: 'demo-token-' + Date.now(),
          createdAt: new Date().toISOString(),
        },
      });
    }

    let content = '';
    let title = '';

    if (validatedData.type === 'CANDIDATE_SCORECARD' && validatedData.candidateId) {
      // Get candidate with score
      const candidate = await prisma!.candidate.findFirst({
        where: {
          id: validatedData.candidateId,
          organizationId,
        },
        include: {
          scores: {
            include: { requirement: true },
          },
          resumes: true,
        },
      });

      if (!candidate) {
        return NextResponse.json(
          { success: false, error: 'Candidate not found' },
          { status: 404 }
        );
      }

      const score = candidate.scores[0];
      if (!score) {
        return NextResponse.json(
          { success: false, error: 'No score found for candidate' },
          { status: 400 }
        );
      }

      // Generate report content
      const scoreData = JSON.parse(score.scoreBreakdown);
      content = generateScoreExplanation(scoreData);
      title = `Scorecard: ${candidate.firstName} ${candidate.lastName}`;
    } else if (validatedData.type === 'CANDIDATE_COMPARISON' && validatedData.comparedCandidateIds) {
      // Get all candidates with scores
      const candidates = await prisma!.candidate.findMany({
        where: {
          id: { in: validatedData.comparedCandidateIds },
          organizationId,
        },
        include: {
          scores: true,
        },
      });

      if (candidates.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Need at least 2 candidates for comparison' },
          { status: 400 }
        );
      }

      const results = candidates.map(c => {
        const scoreData = JSON.parse(c.scores[0]?.scoreBreakdown || '{}');
        return scoreData;
      }).filter(Boolean);

      content = generateComparisonReport(results);
      title = `Candidate Comparison Report`;
    } else if (validatedData.type === 'REQUIREMENT_SUMMARY' && validatedData.requirementId) {
      // Get requirement with candidates and scores
      const requirement = await prisma!.requirement.findFirst({
        where: {
          id: validatedData.requirementId,
          organizationId,
        },
        include: {
          candidates: {
            include: {
              scores: true,
            },
          },
        },
      });

      if (!requirement) {
        return NextResponse.json(
          { success: false, error: 'Requirement not found' },
          { status: 404 }
        );
      }

      // Generate summary
      const candidates = requirement.candidates;
      const avgScore = candidates.reduce((sum, c) => {
        const score = c.scores[0]?.finalScore || 0;
        return sum + score;
      }, 0) / (candidates.length || 1);

      content = `# ${requirement.title} - Summary Report

## Overview
- **Total Candidates:** ${candidates.length}
- **Average Score:** ${Math.round(avgScore)}
- **Status:** ${requirement.status}

## Top Candidates
${candidates
  .sort((a, b) => (b.scores[0]?.finalScore || 0) - (a.scores[0]?.finalScore || 0))
  .slice(0, 5)
  .map((c, i) => `${i + 1}. ${c.firstName} ${c.lastName} - Score: ${c.scores[0]?.finalScore || 'N/A'}`)
  .join('\n')}

## Requirements
- **Experience Required:** ${requirement.experienceRequired} years
- **Skills:** ${JSON.parse(requirement.requiredSkills).map((s: { name: string }) => s.name).join(', ')}
`;
      title = `Summary: ${requirement.title}`;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid report parameters' },
        { status: 400 }
      );
    }

    // Create report
    const report = await prisma!.report.create({
      data: {
        organizationId,
        requirementId: validatedData.requirementId,
        candidateId: validatedData.candidateId,
        createdById: session.userId,
        type: validatedData.type,
        title,
        content,
        comparedCandidateIds: validatedData.comparedCandidateIds ? JSON.stringify(validatedData.comparedCandidateIds) : null,
        shareToken: generateShareToken(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        title: report.title,
        type: report.type,
        content: report.content,
        shareToken: report.shareToken,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create report error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        data: [
          { id: '1', type: 'CANDIDATE_SCORECARD', title: 'Scorecard: John Smith', content: '# Score Report', shareToken: 'token1', createdAt: new Date().toISOString(), candidate: { firstName: 'John', lastName: 'Smith' }, requirement: null },
          { id: '2', type: 'REQUIREMENT_SUMMARY', title: 'Summary: Senior Developer', content: '# Summary Report', shareToken: 'token2', createdAt: new Date(Date.now() - 86400000).toISOString(), candidate: null, requirement: { title: 'Senior Developer' } },
        ],
      });
    }

    const reports = await prisma!.report.findMany({
      where: {
        organizationId: session.organizationId,
        ...(type && { type: type as 'CANDIDATE_SCORECARD' | 'CANDIDATE_COMPARISON' | 'REQUIREMENT_SUMMARY' | 'HIRING_PIPELINE' | 'ANALYTICS_DASHBOARD' }),
      },
      include: {
        candidate: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        requirement: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
