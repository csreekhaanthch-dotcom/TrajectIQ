import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, isDatabaseAvailable, canConnectToDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check if database is actually available AND can connect
    const dbAvailable = isDatabaseAvailable();
    
    if (!dbAvailable) {
      // Return meaningful error instead of demo data
      return NextResponse.json({
        success: false,
        error: 'Database not configured',
        message: 'Please set DATABASE_URL environment variable to a PostgreSQL database.',
        isDemo: true,
        data: getEmptyStats(),
      });
    }

    // Test if we can actually connect
    const canConnect = await canConnectToDatabase();
    if (!canConnect) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        message: 'Database URL is set but connection failed. Check credentials.',
        isDemo: true,
        data: getEmptyStats(),
      });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const organizationId = session.organizationId;
    
    // Return empty stats if no organization
    if (!organizationId) {
      return NextResponse.json({
        success: true,
        data: getEmptyStats(),
      });
    }

    // Get basic counts from REAL database
    const [
      totalRequirements,
      activeRequirements,
      totalCandidates,
      newCandidates,
      hiredCount,
      rejectedCount,
      scores,
    ] = await Promise.all([
      prisma!.requirement.count({
        where: { organizationId },
      }),
      prisma!.requirement.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      prisma!.candidate.count({
        where: { organizationId },
      }),
      prisma!.candidate.count({
        where: { organizationId, status: 'NEW' },
      }),
      prisma!.candidate.count({
        where: { organizationId, status: 'HIRED' },
      }),
      prisma!.candidate.count({
        where: { organizationId, status: 'REJECTED' },
      }),
      prisma!.score.findMany({
        where: {
          candidate: { organizationId },
        },
        select: {
          finalScore: true,
          grade: true,
        },
      }),
    ]);

    // Calculate average score
    const averageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.finalScore, 0) / scores.length
      : 0;

    // Find most common grade
    const gradeCounts: Record<string, number> = {};
    scores.forEach(s => {
      gradeCounts[s.grade] = (gradeCounts[s.grade] || 0) + 1;
    });
    const topGrade = Object.entries(gradeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Score distribution
    const gradeOrder = ['A_PLUS', 'A', 'A_MINUS', 'B_PLUS', 'B', 'B_MINUS', 'C_PLUS', 'C', 'C_MINUS', 'D_PLUS', 'D', 'D_MINUS', 'F'];
    const scoreDistribution = gradeOrder.map(grade => ({
      grade,
      count: gradeCounts[grade] || 0,
      percentage: scores.length > 0 ? ((gradeCounts[grade] || 0) / scores.length) * 100 : 0,
    })).filter(d => d.count > 0);

    // Get recent activity
    const recentCandidates = await prisma!.candidate.findMany({
      where: { organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentTitle: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentRequirements = await prisma!.requirement.findMany({
      where: { organizationId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        _count: {
          select: { candidates: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      isDemo: false,
      data: {
        overview: {
          totalRequirements,
          activeRequirements,
          totalCandidates,
          newCandidates,
          averageScore: Math.round(averageScore * 10) / 10,
          topGrade,
          hiredCount,
          rejectedCount,
        },
        scoreDistribution,
        recentActivity: {
          candidates: recentCandidates,
          requirements: recentRequirements,
        },
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        isDemo: true,
        data: getEmptyStats(),
      },
      { status: 500 }
    );
  }
}

function getEmptyStats() {
  return {
    overview: {
      totalRequirements: 0,
      activeRequirements: 0,
      totalCandidates: 0,
      newCandidates: 0,
      averageScore: 0,
      topGrade: null,
      hiredCount: 0,
      rejectedCount: 0,
    },
    scoreDistribution: [],
    recentActivity: {
      candidates: [],
      requirements: [],
    },
  };
}
