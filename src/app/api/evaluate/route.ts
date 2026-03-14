import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { calculateHiringScore, rankCandidates, type ScoringInput } from '@/lib/scoring';
import { DEFAULT_WEIGHTS } from '@/lib/scoring/types';
import { z } from 'zod';

const evaluateSchema = z.object({
  candidateId: z.string(),
  requirementId: z.string(),
});

const batchEvaluateSchema = z.object({
  requirementId: z.string(),
  candidateIds: z.array(z.string()).optional(), // If not provided, evaluate all
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

    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        data: {
          id: 'demo-score-' + Date.now(),
          candidateId: 'demo-candidate',
          requirementId: 'demo-requirement',
          finalScore: 78.5,
          grade: 'B_PLUS',
          tier: 2,
          recommendation: 'STRONG_REVIEW',
          components: {
            sdi: { score: 82, weight: 0.40, weightedScore: 32.8, strengths: ['TypeScript', 'React'], weaknesses: ['Python'] },
            csig: { score: 75, weight: 0.15, weightedScore: 11.25, matchedSkills: ['TypeScript', 'React', 'Node.js'], missingSkills: ['AWS'] },
            iae: { score: 80, weight: 0.20, weightedScore: 16.0, strengths: ['Led team of 5'], weaknesses: ['Limited startup experience'] },
            cta: { score: 70, weight: 0.15, weightedScore: 10.5, strengths: ['Promoted twice'], weaknesses: ['Changed jobs frequently'] },
            err: { score: 85, weight: 0.10, weightedScore: 8.5, relevanceRatio: 0.85 },
          },
        },
      });
    }

    // Check if batch evaluation
    if ('candidateIds' in body || !('candidateId' in body)) {
      return handleBatchEvaluation(body, session.userId, organizationId);
    }

    const validatedData = evaluateSchema.parse(body);

    // Get candidate with resume data
    const candidate = await prisma!.candidate.findFirst({
      where: {
        id: validatedData.candidateId,
        organizationId,
      },
      include: {
        resumes: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Get requirement
    const requirement = await prisma!.requirement.findFirst({
      where: {
        id: validatedData.requirementId,
        organizationId,
      },
    });

    if (!requirement) {
      return NextResponse.json(
        { success: false, error: 'Requirement not found' },
        { status: 404 }
      );
    }

    // Get resume data
    const resume = candidate.resumes[0];
    if (!resume) {
      return NextResponse.json(
        { success: false, error: 'No resume data found for candidate' },
        { status: 400 }
      );
    }

    // Parse resume data
    const skills = JSON.parse(resume.skills || '[]');
    const experience = JSON.parse(resume.experience || '[]');
    const education = JSON.parse(resume.education || '[]');
    const projects = JSON.parse(resume.projects || 'null');

    // Parse requirement skills
    const requiredSkills = JSON.parse(requirement.requiredSkills || '[]');
    const preferredSkills = JSON.parse(requirement.preferredSkills || '[]');

    // Build scoring input
    const scoringInput: ScoringInput = {
      candidateId: candidate.id,
      requirementId: requirement.id,
      skills,
      experience,
      education,
      projects,
      summary: resume.summary || candidate.rawResumeText?.slice(0, 500) || null,
      requiredSkills,
      preferredSkills,
      experienceRequired: requirement.experienceRequired,
      experiencePreferred: requirement.experiencePreferred,
      weights: {
        sdi: requirement.sdiWeight || DEFAULT_WEIGHTS.sdi,
        csig: requirement.csigWeight || DEFAULT_WEIGHTS.csig,
        iae: requirement.iaeWeight || DEFAULT_WEIGHTS.iae,
        cta: requirement.ctaWeight || DEFAULT_WEIGHTS.cta,
        err: requirement.errWeight || DEFAULT_WEIGHTS.err,
      },
    };

    // Calculate score
    const result = await calculateHiringScore(scoringInput);

    // Save score to database
    const score = await prisma!.score.create({
      data: {
        candidateId: candidate.id,
        requirementId: requirement.id,
        sdiScore: result.sdi.score,
        csigScore: result.csig.score,
        iaeScore: result.iae.score,
        ctaScore: result.cta.score,
        errScore: result.err.score,
        sdiWeighted: result.sdi.weightedScore,
        csigWeighted: result.csig.weightedScore,
        iaeWeighted: result.iae.weightedScore,
        ctaWeighted: result.cta.weightedScore,
        errWeighted: result.err.weightedScore,
        finalScore: result.finalScore,
        grade: result.grade,
        tier: result.tier,
        recommendation: result.recommendation,
        scoreBreakdown: JSON.stringify(result),
        skillMatches: JSON.stringify(result.csig.breakdown),
        scoringVersion: result.scoringVersion,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: score.id,
        candidateId: candidate.id,
        requirementId: requirement.id,
        finalScore: result.finalScore,
        grade: result.grade,
        tier: result.tier,
        recommendation: result.recommendation,
        components: {
          sdi: {
            score: Math.round(result.sdi.score),
            weight: result.sdi.weight,
            weightedScore: Math.round(result.sdi.weightedScore),
            strengths: result.sdi.breakdown.strengths,
            weaknesses: result.sdi.breakdown.weaknesses,
          },
          csig: {
            score: Math.round(result.csig.score),
            weight: result.csig.weight,
            weightedScore: Math.round(result.csig.weightedScore),
            matchedSkills: (result.csig.breakdown as { matchedSkills?: string[] }).matchedSkills || [],
            missingSkills: (result.csig.breakdown as { missingSkills?: string[] }).missingSkills || [],
          },
          iae: {
            score: Math.round(result.iae.score),
            weight: result.iae.weight,
            weightedScore: Math.round(result.iae.weightedScore),
            strengths: result.iae.breakdown.strengths,
            weaknesses: result.iae.breakdown.weaknesses,
          },
          cta: {
            score: Math.round(result.cta.score),
            weight: result.cta.weight,
            weightedScore: Math.round(result.cta.weightedScore),
            strengths: result.cta.breakdown.strengths,
            weaknesses: result.cta.breakdown.weaknesses,
          },
          err: {
            score: Math.round(result.err.score),
            weight: result.err.weight,
            weightedScore: Math.round(result.err.weightedScore),
            relevanceRatio: (result.err.breakdown as { relevanceRatio?: number }).relevanceRatio || 0,
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Evaluate error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleBatchEvaluation(body: unknown, userId: string, organizationId: string) {
  const validatedData = batchEvaluateSchema.parse(body);

  // Return demo response if database is not available
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      success: true,
      data: [
        { rank: 1, candidateId: 'demo-1', finalScore: 85.2, grade: 'A', tier: 1, recommendation: 'HIRE' },
        { rank: 2, candidateId: 'demo-2', finalScore: 78.5, grade: 'B_PLUS', tier: 2, recommendation: 'STRONG_REVIEW' },
        { rank: 3, candidateId: 'demo-3', finalScore: 72.1, grade: 'B', tier: 2, recommendation: 'REVIEW' },
      ],
      meta: { totalEvaluated: 3, averageScore: 78.6 },
    });
  }

  // Get requirement
  const requirement = await prisma!.requirement.findFirst({
    where: {
      id: validatedData.requirementId,
      organizationId,
    },
  });

  if (!requirement) {
    return NextResponse.json(
      { success: false, error: 'Requirement not found' },
      { status: 404 }
    );
  }

  // Get candidates
  const candidates = await prisma!.candidate.findMany({
    where: {
      requirementId: validatedData.requirementId,
      organizationId,
      ...(validatedData.candidateIds && { id: { in: validatedData.candidateIds } }),
    },
    include: {
      resumes: true,
    },
  });

  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
      message: 'No candidates to evaluate',
    });
  }

  // Parse requirement skills
  const requiredSkills = JSON.parse(requirement.requiredSkills || '[]');
  const preferredSkills = JSON.parse(requirement.preferredSkills || '[]');
  const weights = {
    sdi: requirement.sdiWeight || DEFAULT_WEIGHTS.sdi,
    csig: requirement.csigWeight || DEFAULT_WEIGHTS.csig,
    iae: requirement.iaeWeight || DEFAULT_WEIGHTS.iae,
    cta: requirement.ctaWeight || DEFAULT_WEIGHTS.cta,
    err: requirement.errWeight || DEFAULT_WEIGHTS.err,
  };

  // Evaluate each candidate
  const scoringInputs: ScoringInput[] = [];
  
  for (const candidate of candidates) {
    const resume = candidate.resumes[0];
    if (!resume) continue;

    scoringInputs.push({
      candidateId: candidate.id,
      requirementId: requirement.id,
      skills: JSON.parse(resume.skills || '[]'),
      experience: JSON.parse(resume.experience || '[]'),
      education: JSON.parse(resume.education || '[]'),
      projects: JSON.parse(resume.projects || 'null'),
      summary: resume.summary || candidate.rawResumeText?.slice(0, 500) || null,
      requiredSkills,
      preferredSkills,
      experienceRequired: requirement.experienceRequired,
      experiencePreferred: requirement.experiencePreferred,
      weights,
    });
  }

  // Calculate all scores
  const results = await Promise.all(
    scoringInputs.map(input => calculateHiringScore(input))
  );

  // Save all scores
  for (const result of results) {
    await prisma!.score.upsert({
      where: {
        candidateId_requirementId: {
          candidateId: result.candidateId,
          requirementId: result.requirementId,
        },
      },
      update: {
        sdiScore: result.sdi.score,
        csigScore: result.csig.score,
        iaeScore: result.iae.score,
        ctaScore: result.cta.score,
        errScore: result.err.score,
        sdiWeighted: result.sdi.weightedScore,
        csigWeighted: result.csig.weightedScore,
        iaeWeighted: result.iae.weightedScore,
        ctaWeighted: result.cta.weightedScore,
        errWeighted: result.err.weightedScore,
        finalScore: result.finalScore,
        grade: result.grade,
        tier: result.tier,
        recommendation: result.recommendation,
        scoreBreakdown: JSON.stringify(result),
        skillMatches: JSON.stringify(result.csig.breakdown),
      },
      create: {
        candidateId: result.candidateId,
        requirementId: result.requirementId,
        sdiScore: result.sdi.score,
        csigScore: result.csig.score,
        iaeScore: result.iae.score,
        ctaScore: result.cta.score,
        errScore: result.err.score,
        sdiWeighted: result.sdi.weightedScore,
        csigWeighted: result.csig.weightedScore,
        iaeWeighted: result.iae.weightedScore,
        ctaWeighted: result.cta.weightedScore,
        errWeighted: result.err.weightedScore,
        finalScore: result.finalScore,
        grade: result.grade,
        tier: result.tier,
        recommendation: result.recommendation,
        scoreBreakdown: JSON.stringify(result),
        skillMatches: JSON.stringify(result.csig.breakdown),
      },
    });
  }

  // Rank candidates
  const ranked = rankCandidates(results);

  return NextResponse.json({
    success: true,
    data: ranked.map((r, index) => ({
      rank: index + 1,
      candidateId: r.candidateId,
      finalScore: r.score.finalScore,
      grade: r.score.grade,
      tier: r.score.tier,
      recommendation: r.score.recommendation,
    })),
    meta: {
      totalEvaluated: results.length,
      averageScore: results.reduce((sum, r) => sum + r.finalScore, 0) / results.length,
    },
  });
}
