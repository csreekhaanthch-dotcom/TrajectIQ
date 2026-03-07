import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, isDatabaseAvailable } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalRequirements: 12,
            activeRequirements: 8,
            totalCandidates: 156,
            newCandidates: 23,
            averageScore: 72.5,
            topGrade: 'B_PLUS',
            hiredCount: 18,
            rejectedCount: 34,
          },
          scoreDistribution: [
            { grade: 'A', count: 12, percentage: 8 },
            { grade: 'B_PLUS', count: 28, percentage: 18 },
            { grade: 'B', count: 35, percentage: 22 },
            { grade: 'B_MINUS', count: 25, percentage: 16 },
            { grade: 'C_PLUS', count: 22, percentage: 14 },
            { grade: 'C', count: 18, percentage: 12 },
            { grade: 'C_MINUS', count: 10, percentage: 6 },
            { grade: 'F', count: 6, percentage: 4 },
          ],
          recentActivity: {
            candidates: [
              { id: '1', firstName: 'John', lastName: 'Smith', currentTitle: 'Senior Engineer', status: 'NEW', createdAt: new Date().toISOString() },
              { id: '2', firstName: 'Jane', lastName: 'Doe', currentTitle: 'Full Stack Developer', status: 'SCREENING', createdAt: new Date(Date.now() - 3600000).toISOString() },
              { id: '3', firstName: 'Mike', lastName: 'Johnson', currentTitle: 'Python Developer', status: 'NEW', createdAt: new Date(Date.now() - 7200000).toISOString() },
            ],
            requirements: [
              { id: '1', title: 'Senior Software Engineer', status: 'ACTIVE', createdAt: new Date().toISOString(), _count: { candidates: 24 } },
              { id: '2', title: 'Full Stack Developer', status: 'ACTIVE', createdAt: new Date(Date.now() - 86400000).toISOString(), _count: { candidates: 18 } },
              { id: '3', title: 'Python Developer', status: 'ACTIVE', createdAt: new Date(Date.now() - 172800000).toISOString(), _count: { candidates: 12 } },
            ],
          },
        },
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
    
    // Return mock data if no organization
    if (!organizationId) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalRequirements: 12,
            activeRequirements: 8,
            totalCandidates: 156,
            newCandidates: 23,
            averageScore: 72.5,
            topGrade: 'B_PLUS',
            hiredCount: 18,
            rejectedCount: 34,
          },
          scoreDistribution: [
            { grade: 'A', count: 12, percentage: 8 },
            { grade: 'B_PLUS', count: 28, percentage: 18 },
            { grade: 'B', count: 35, percentage: 22 },
            { grade: 'B_MINUS', count: 25, percentage: 16 },
          ],
          recentActivity: {
            candidates: [],
            requirements: [],
          },
        },
      });
    }

    // Get basic counts
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
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
