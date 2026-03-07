import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { db, isDatabaseAvailable } from '@/lib/db'
import { calculateScore } from '@/lib/scoring/engine'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Invalid token or no organization' }, { status: 401 })
    }

    const { id } = await params

    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        candidate: {
          id,
          firstName: 'Demo',
          lastName: 'Candidate',
          email: 'demo@example.com',
          currentTitle: 'Software Engineer',
          status: 'NEW'
        },
        score: {
          id: 'demo-score',
          finalScore: 78.5,
          grade: 'B_PLUS',
          tier: 2,
          recommendation: 'STRONG_REVIEW',
          sdiScore: 82,
          csigScore: 75,
          iaeScore: 80,
          ctaScore: 70,
          errScore: 85
        }
      })
    }

    const candidate = await db!.candidate.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { resumes: true, scores: true, requirement: true }
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    return NextResponse.json({ candidate, score: candidate.scores[0] || null })
  } catch (error) {
    console.error('Get candidate score error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Invalid token or no organization' }, { status: 401 })
    }

    const { id } = await params

    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        score: {
          id: 'demo-score-' + Date.now(),
          candidateId: id,
          requirementId: 'demo-req',
          finalScore: 78.5,
          grade: 'B_PLUS',
          tier: 2,
          recommendation: 'STRONG_REVIEW',
          sdiScore: 82,
          csigScore: 75,
          iaeScore: 80,
          ctaScore: 70,
          errScore: 85
        }
      })
    }

    const candidate = await db!.candidate.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { resumes: true, requirement: true }
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    if (!candidate.requirement) {
      return NextResponse.json({ error: 'Candidate has no requirement assigned' }, { status: 400 })
    }

    if (!candidate.resumes[0]) {
      return NextResponse.json({ error: 'Candidate has no resume' }, { status: 400 })
    }

    const resume = candidate.resumes[0]
    const requirement = candidate.requirement

    // Calculate score using scoring engine
    const scoreBreakdown = calculateScore(
      {
        skills: JSON.parse(resume.skills || '[]'),
        technologies: [],
        experience: calculateYearsOfExperience(JSON.parse(resume.experience || '[]')),
        companies: extractCompanies(JSON.parse(resume.experience || '[]')),
        projects: [],
        education: JSON.parse(resume.education || '[]'),
        summary: resume.summary || '',
        rawText: candidate.rawResumeText || ''
      },
      {
        requiredSkills: JSON.parse(requirement.requiredSkills || '[]').map((s: { name: string }) => s.name),
        optionalSkills: JSON.parse(requirement.preferredSkills || '[]').map((s: { name: string }) => s.name),
        experienceRequired: requirement.experienceRequired,
        role: requirement.title
      }
    )

    // Save score to database
    const score = await db!.score.create({
      data: {
        candidateId: candidate.id,
        requirementId: requirement.id,
        sdiScore: scoreBreakdown.sdi,
        csigScore: scoreBreakdown.csig,
        iaeScore: scoreBreakdown.iae,
        ctaScore: scoreBreakdown.cta,
        errScore: scoreBreakdown.err,
        sdiWeighted: scoreBreakdown.sdi * (requirement.sdiWeight || 0.40),
        csigWeighted: scoreBreakdown.csig * (requirement.csigWeight || 0.15),
        iaeWeighted: scoreBreakdown.iae * (requirement.iaeWeight || 0.20),
        ctaWeighted: scoreBreakdown.cta * (requirement.ctaWeight || 0.15),
        errWeighted: scoreBreakdown.err * (requirement.errWeight || 0.10),
        finalScore: scoreBreakdown.hiringScore,
        grade: scoreBreakdown.grade as 'A_PLUS' | 'A' | 'A_MINUS' | 'B_PLUS' | 'B' | 'B_MINUS' | 'C_PLUS' | 'C' | 'C_MINUS' | 'D_PLUS' | 'D' | 'D_MINUS' | 'F',
        tier: scoreBreakdown.tier,
        recommendation: scoreBreakdown.recommendation as 'STRONG_HIRE' | 'HIRE' | 'STRONG_CONSIDER' | 'CONSIDER' | 'REVIEW' | 'WEAK_REVIEW' | 'PASS' | 'STRONG_PASS',
        scoreBreakdown: JSON.stringify(scoreBreakdown)
      }
    })

    return NextResponse.json({ success: true, score })
  } catch (error) {
    console.error('Score candidate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function calculateYearsOfExperience(experience: unknown[]): number {
  if (!Array.isArray(experience)) return 0
  let totalMonths = 0
  experience.forEach(exp => {
    if (exp && typeof exp === 'object' && 'startDate' in exp) {
      const start = new Date((exp as { startDate: string }).startDate)
      const end = (exp as { endDate?: string }).endDate ? new Date((exp as { endDate?: string }).endDate!) : new Date()
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
      totalMonths += Math.max(0, months)
    }
  })
  return Math.round(totalMonths / 12)
}

function extractCompanies(experience: unknown[]): string[] {
  if (!Array.isArray(experience)) return []
  return experience
    .filter(exp => exp && typeof exp === 'object' && 'company' in exp)
    .map(exp => (exp as { company: string }).company)
    .filter(Boolean)
}
