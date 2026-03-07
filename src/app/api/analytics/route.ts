import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { db, isDatabaseAvailable } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        overview: {
          totalRequirements: 12,
          activeRequirements: 8,
          totalCandidates: 156,
          newCandidates: 23,
          hiredCandidates: 18,
          rejectedCandidates: 34,
          averageHiringScore: 72.5
        },
        distributions: {
          grades: { 'A': 12, 'B+': 28, 'B': 35, 'B-': 25, 'C+': 22, 'C': 18, 'C-': 10, 'F': 6 },
          tiers: { 1: 15, 2: 35, 3: 55, 4: 32, 5: 19 },
          recommendations: { 'HIRE': 18, 'STRONG_REVIEW': 45, 'REVIEW': 62, 'PASS': 31 }
        },
        recentCandidates: [
          { id: '1', firstName: 'John', lastName: 'Smith', currentTitle: 'Senior Engineer', status: 'NEW', scores: [{ finalScore: 78.5, grade: 'B+', recommendation: 'STRONG_REVIEW' }] },
          { id: '2', firstName: 'Jane', lastName: 'Doe', currentTitle: 'Full Stack Developer', status: 'SCREENING', scores: [{ finalScore: 85.2, grade: 'A', recommendation: 'HIRE' }] },
          { id: '3', firstName: 'Mike', lastName: 'Johnson', currentTitle: 'Python Developer', status: 'NEW', scores: [{ finalScore: 65.8, grade: 'B', recommendation: 'REVIEW' }] }
        ],
        topCandidates: [
          { id: '2', firstName: 'Jane', lastName: 'Doe', currentTitle: 'Full Stack Developer', scores: [{ finalScore: 85.2, grade: 'A', recommendation: 'HIRE' }] },
          { id: '4', firstName: 'Sarah', lastName: 'Williams', currentTitle: 'Tech Lead', scores: [{ finalScore: 82.1, grade: 'A', recommendation: 'HIRE' }] },
          { id: '5', firstName: 'Alex', lastName: 'Brown', currentTitle: 'Backend Developer', scores: [{ finalScore: 79.8, grade: 'B+', recommendation: 'STRONG_REVIEW' }] }
        ]
      })
    }

    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const organizationId = user.organizationId
    if (!organizationId) {
      return NextResponse.json({ 
        overview: {
          totalRequirements: 0,
          activeRequirements: 0,
          totalCandidates: 0,
          newCandidates: 0,
          hiredCandidates: 0,
          rejectedCandidates: 0,
          averageHiringScore: 0
        },
        distributions: {
          grades: {},
          tiers: {},
          recommendations: {}
        },
        recentCandidates: [],
        topCandidates: []
      })
    }

    // Get counts
    const [
      totalRequirements,
      activeRequirements,
      totalCandidates,
      newCandidates,
      hiredCandidates,
      rejectedCandidates
    ] = await Promise.all([
      db!.requirement.count({ where: { organizationId } }),
      db!.requirement.count({ where: { organizationId, status: 'ACTIVE' } }),
      db!.candidate.count({ where: { organizationId } }),
      db!.candidate.count({ where: { organizationId, status: 'NEW' } }),
      db!.candidate.count({ where: { organizationId, status: 'HIRED' } }),
      db!.candidate.count({ where: { organizationId, status: 'REJECTED' } })
    ])

    // Get score distribution
    const candidatesWithScores = await db!.candidate.findMany({
      where: { organizationId },
      include: { scores: true }
    })

    const gradeDistribution: Record<string, number> = {
      'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0
    }
    const tierDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const recommendationDistribution: Record<string, number> = {
      'HIRE': 0, 'STRONG_REVIEW': 0, 'REVIEW': 0, 'PASS': 0
    }

    candidatesWithScores.forEach(candidate => {
      const latestScore = candidate.scores?.[0]
      if (latestScore) {
        gradeDistribution[latestScore.grade] = (gradeDistribution[latestScore.grade] || 0) + 1
        tierDistribution[latestScore.tier] = (tierDistribution[latestScore.tier] || 0) + 1
        recommendationDistribution[latestScore.recommendation] = 
          (recommendationDistribution[latestScore.recommendation] || 0) + 1
      }
    })

    // Get recent candidates
    const recentCandidates = await db!.candidate.findMany({
      where: { organizationId },
      include: {
        scores: { select: { finalScore: true, grade: true, recommendation: true }, take: 1 },
        requirement: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Get top candidates
    const topCandidates = await db!.candidate.findMany({
      where: {
        organizationId,
        scores: { some: {} }
      },
      include: {
        scores: { select: { finalScore: true, grade: true, recommendation: true }, take: 1, orderBy: { createdAt: 'desc' } },
        requirement: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Average scores
    const allScores = candidatesWithScores
      .flatMap(c => c.scores)
      .map(s => s.finalScore)

    const averageHiringScore = allScores.length > 0 
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 100) / 100
      : 0

    return NextResponse.json({
      overview: {
        totalRequirements,
        activeRequirements,
        totalCandidates,
        newCandidates,
        hiredCandidates,
        rejectedCandidates,
        averageHiringScore
      },
      distributions: {
        grades: gradeDistribution,
        tiers: tierDistribution,
        recommendations: recommendationDistribution
      },
      recentCandidates,
      topCandidates
    })
  } catch (error) {
    console.error('Get analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
