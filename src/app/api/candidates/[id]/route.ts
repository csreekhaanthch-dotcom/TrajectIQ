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

    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        candidate: {
          id,
          firstName: 'Demo',
          lastName: 'Candidate',
          email: 'demo@example.com',
          currentTitle: 'Software Engineer',
          status: 'NEW',
          requirement: { id: '1', title: 'Senior Developer' },
          resumes: [],
          scores: [{ finalScore: 78.5, grade: 'B_PLUS', recommendation: 'STRONG_REVIEW' }]
        }
      })
    }

    const candidate = await db!.candidate.findFirst({
      where: {
        id,
        organizationId: user.organizationId
      },
      include: {
        requirement: true,
        resumes: true,
        scores: true
      }
    })

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    return NextResponse.json({ candidate })
  } catch (error) {
    console.error('Get candidate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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

    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        candidate: {
          id,
          firstName: body.firstName || 'Demo',
          lastName: body.lastName || 'Candidate',
          email: body.email || 'demo@example.com',
          status: body.status || 'NEW'
        }
      })
    }

    const existingCandidate = await db!.candidate.findFirst({
      where: { id, organizationId: user.organizationId }
    })

    if (!existingCandidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    const candidate = await db!.candidate.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        status: body.status
      }
    })

    // Create audit log for status change
    if (body.status && body.status !== existingCandidate.status) {
      await db!.auditLog.create({
        data: {
          userId: user.id,
          action: 'CANDIDATE_STATUS_CHANGED',
          entityType: 'Candidate',
          entityId: id,
          oldValue: JSON.stringify({ status: existingCandidate.status }),
          newValue: JSON.stringify({ status: body.status }),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })
    }

    return NextResponse.json({ candidate })
  } catch (error) {
    console.error('Update candidate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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
      return NextResponse.json({ success: true })
    }

    const existingCandidate = await db!.candidate.findFirst({
      where: { id, organizationId: user.organizationId }
    })

    if (!existingCandidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
    }

    // Delete related records first
    await db!.score.deleteMany({ where: { candidateId: id } })
    await db!.resume.deleteMany({ where: { candidateId: id } })
    await db!.candidate.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete candidate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
