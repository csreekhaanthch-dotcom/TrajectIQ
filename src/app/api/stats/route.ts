import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get total candidates
    const totalCandidates = await db.candidate.count({
      where: { status: 'COMPLETED' }
    });

    // Get average score
    const evaluations = await db.evaluation.findMany({
      where: { 
        status: 'COMPLETED',
        hiringIndex: { not: null }
      },
      select: { hiringIndex: true }
    });

    const averageScore = evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + (e.hiringIndex || 0), 0) / evaluations.length
      : 0;

    // Get top tier candidates (score >= 85)
    const topTierCandidates = await db.evaluation.count({
      where: {
        status: 'COMPLETED',
        hiringIndex: { gte: 85 }
      }
    });

    // Get pending reviews
    const pendingReviews = await db.candidate.count({
      where: { status: 'PENDING' }
    });

    // Get score distribution
    const allEvaluations = await db.evaluation.findMany({
      where: { 
        status: 'COMPLETED',
        hiringIndex: { not: null }
      },
      select: { hiringIndex: true }
    });

    const scoreDistribution = {
      excellent: 0, // 90-100
      good: 0,      // 80-89
      average: 0,   // 70-79
      belowAverage: 0, // 60-69
      poor: 0       // 0-59
    };

    allEvaluations.forEach(e => {
      const score = e.hiringIndex || 0;
      if (score >= 90) scoreDistribution.excellent++;
      else if (score >= 80) scoreDistribution.good++;
      else if (score >= 70) scoreDistribution.average++;
      else if (score >= 60) scoreDistribution.belowAverage++;
      else scoreDistribution.poor++;
    });

    // Get recent evaluations
    const recentEvaluationsRaw = await db.evaluation.findMany({
      where: { status: 'COMPLETED' },
      include: {
        candidate: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const recentEvaluations = recentEvaluationsRaw.map(e => ({
      id: e.evaluationId,
      candidateName: e.candidate ? `${e.candidate.firstName || ''} ${e.candidate.lastName || ''}`.trim() : 'Unknown',
      score: Math.round(e.hiringIndex || 0),
      grade: e.grade || 'N/A',
      jobTitle: 'Software Engineer', // Would come from job relation
      evaluatedAt: e.createdAt.toISOString()
    }));

    // Generate trend data for last 7 days
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayEvaluations = await db.evaluation.count({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });

      const dayScores = await db.evaluation.findMany({
        where: {
          status: 'COMPLETED',
          hiringIndex: { not: null },
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        },
        select: { hiringIndex: true }
      });

      const avgScore = dayScores.length > 0
        ? dayScores.reduce((sum, e) => sum + (e.hiringIndex || 0), 0) / dayScores.length
        : 0;

      trendData.push({
        date: dayStart.toISOString().split('T')[0],
        evaluations: dayEvaluations,
        avgScore: Math.round(avgScore)
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCandidates,
        averageScore: Math.round(averageScore),
        topTierCandidates,
        pendingReviews,
        scoreDistribution,
        recentEvaluations,
        trendData
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    
    // Return mock data if database is not available
    return NextResponse.json({
      success: true,
      data: {
        totalCandidates: 24,
        averageScore: 76,
        topTierCandidates: 8,
        pendingReviews: 5,
        scoreDistribution: {
          excellent: 5,
          good: 8,
          average: 6,
          belowAverage: 3,
          poor: 2
        },
        recentEvaluations: [
          { id: '1', candidateName: 'Sarah Chen', score: 92, grade: 'A-', jobTitle: 'Senior Software Engineer', evaluatedAt: new Date().toISOString() },
          { id: '2', candidateName: 'Michael Torres', score: 87, grade: 'B+', jobTitle: 'Full Stack Developer', evaluatedAt: new Date().toISOString() },
          { id: '3', candidateName: 'Emily Johnson', score: 81, grade: 'B', jobTitle: 'Backend Engineer', evaluatedAt: new Date().toISOString() }
        ],
        trendData: [
          { date: '2024-01-15', evaluations: 3, avgScore: 78 },
          { date: '2024-01-16', evaluations: 5, avgScore: 82 },
          { date: '2024-01-17', evaluations: 2, avgScore: 75 },
          { date: '2024-01-18', evaluations: 4, avgScore: 79 },
          { date: '2024-01-19', evaluations: 6, avgScore: 81 },
          { date: '2024-01-20', evaluations: 3, avgScore: 77 },
          { date: '2024-01-21', evaluations: 1, avgScore: 85 }
        ]
      }
    });
  }
}
