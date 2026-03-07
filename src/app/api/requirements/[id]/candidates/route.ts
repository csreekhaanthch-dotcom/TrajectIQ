import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { db, isDatabaseAvailable } from '@/lib/db'

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
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        candidates: [
          { id: '1', firstName: 'John', lastName: 'Smith', email: 'john@example.com', currentTitle: 'Senior Engineer', status: 'NEW', scores: [{ finalScore: 78.5 }], resumes: [] },
          { id: '2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', currentTitle: 'Full Stack Developer', status: 'SCREENING', scores: [{ finalScore: 85.2 }], resumes: [] },
          { id: '3', firstName: 'Mike', lastName: 'Johnson', email: 'mike@example.com', currentTitle: 'Python Developer', status: status || 'NEW', scores: [{ finalScore: 65.8 }], resumes: [] },
        ],
        requirement: { id, title: 'Senior Software Engineer', status: 'ACTIVE' }
      })
    }

    // Verify requirement exists and belongs to user's organization
    const requirement = await db!.requirement.findFirst({
      where: { id, organizationId: user.organizationId }
    })

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { requirementId: id }
    if (status) {
      where.status = status
    }

    const candidates = await db!.candidate.findMany({
      where,
      include: {
        resumes: true,
        scores: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ candidates, requirement })
  } catch (error) {
    console.error('Get candidates error:', error)
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
    const body = await request.json()
    const { email, firstName, lastName, rawResumeContent } = body

    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        candidate: {
          id: 'demo-' + Date.now(),
          email: email || 'demo@example.com',
          firstName: firstName || 'Demo',
          lastName: lastName || 'Candidate',
          status: 'NEW',
          resumes: [],
          scores: []
        }
      }, { status: 201 })
    }

    // Verify requirement exists
    const requirement = await db!.requirement.findFirst({
      where: { id, organizationId: user.organizationId }
    })

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Create candidate
    const candidate = await db!.candidate.create({
      data: {
        organizationId: user.organizationId,
        requirementId: id,
        createdById: user.id,
        email,
        firstName: firstName || 'Unknown',
        lastName: lastName || '',
        rawResumeText: rawResumeContent || null,
        status: 'NEW',
        source: 'MANUAL_UPLOAD'
      }
    })

    // Fetch the complete candidate with resume and score
    const completeCandidate = await db!.candidate.findUnique({
      where: { id: candidate.id },
      include: { resumes: true, scores: true }
    })

    return NextResponse.json({ candidate: completeCandidate }, { status: 201 })
  } catch (error) {
    console.error('Create candidate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
