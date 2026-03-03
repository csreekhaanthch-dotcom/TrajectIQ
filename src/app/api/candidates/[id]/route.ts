import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const candidate = await db.candidate.findFirst({
      where: { candidateId: id },
      include: {
        evaluations: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        job: true
      }
    });

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: 'Candidate not found' },
        { status: 404 }
      );
    }

    const latestEvaluation = candidate.evaluations[0];

    const transformedCandidate = {
      id: candidate.candidateId,
      name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown',
      email: candidate.email || '',
      score: Math.round(latestEvaluation?.hiringIndex || 0),
      grade: latestEvaluation?.grade || 'N/A',
      recommendation: getRecommendationText(latestEvaluation?.recommendation),
      status: candidate.status.toLowerCase(),
      jobId: candidate.jobId || '',
      jobTitle: candidate.job?.title || 'Not Assigned',
      currentRole: '',
      company: '',
      evaluatedAt: latestEvaluation?.createdAt?.toISOString() || candidate.createdAt.toISOString(),
      skills: [],
      experience: 0,
      education: '',
      summary: latestEvaluation?.explanation || '',
      strengths: latestEvaluation?.strengths ? JSON.parse(latestEvaluation.strengths) : [],
      improvements: latestEvaluation?.concerns ? JSON.parse(latestEvaluation.concerns) : [],
      skillsScore: latestEvaluation?.skillScore || 0,
      impactScore: latestEvaluation?.impactScore || 0,
      trajectoryScore: latestEvaluation?.trajectoryScore || 0,
      experienceScore: latestEvaluation?.experienceScore || 0,
      aiRisk: latestEvaluation?.aiDetectionScore || 0,
      csigScore: latestEvaluation?.csigScore || 0,
      processingTimeMs: latestEvaluation?.processingTimeMs || 0,
      riskFlags: []
    };

    return NextResponse.json({
      success: true,
      data: transformedCandidate
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch candidate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.candidate.delete({
      where: { candidateId: id }
    });

    return NextResponse.json({
      success: true,
      message: 'Candidate deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete candidate' },
      { status: 500 }
    );
  }
}

function getRecommendationText(recommendation: string | null | undefined): string {
  switch (recommendation) {
    case 'strong_hire': return 'Strongly Recommend';
    case 'hire': return 'Recommend';
    case 'consider': return 'Consider';
    case 'pass': return 'Not Recommended';
    case 'strong_pass': return 'Strongly Not Recommended';
    default: return 'Pending';
  }
}
