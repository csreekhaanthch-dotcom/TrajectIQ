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
        requirement: {
          id,
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          requiredSkills: JSON.stringify([{ name: 'TypeScript', required: true, weight: 10, category: 'technical' }]),
          preferredSkills: JSON.stringify([{ name: 'AWS', required: false, weight: 5, category: 'technical' }]),
          experienceRequired: 5,
          _count: { candidates: 24 }
        }
      })
    }

    const requirement = await db!.requirement.findFirst({
      where: {
        id,
        organizationId: user.organizationId
      },
      include: {
        emailAccount: {
          select: {
            id: true,
            email: true,
            provider: true
          }
        },
        thread: {
          select: {
            id: true,
            subject: true,
            senderEmail: true,
            receivedAt: true
          }
        },
        _count: {
          select: { candidates: true }
        }
      }
    })

    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
    }

    return NextResponse.json({ requirement })
  } catch (error) {
    console.error('Get requirement error:', error)
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
        requirement: {
          id,
          title: body.title || 'Updated Requirement',
          department: body.department,
          location: body.location,
          status: body.status || 'ACTIVE'
        }
      })
    }

    // Verify requirement exists
    const existing = await db!.requirement.findFirst({
      where: { id, organizationId: user.organizationId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
    }

    const requirement = await db!.requirement.update({
      where: { id },
      data: {
        title: body.title,
        department: body.department,
        location: body.location,
        employmentType: body.employmentType,
        salaryRange: body.salaryRange,
        requiredSkills: JSON.stringify(body.requiredSkills || []),
        preferredSkills: JSON.stringify(body.preferredSkills || []),
        experienceRequired: body.experienceRequired,
        experiencePreferred: body.experiencePreferred,
        educationLevel: body.educationLevel,
        certifications: JSON.stringify(body.certifications || []),
        status: body.status,
        deadline: body.deadline ? new Date(body.deadline) : null,
        sdiWeight: body.sdiWeight,
        csigWeight: body.csigWeight,
        iaeWeight: body.iaeWeight,
        ctaWeight: body.ctaWeight,
        errWeight: body.errWeight
      }
    })

    return NextResponse.json({ requirement })
  } catch (error) {
    console.error('Update requirement error:', error)
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

    // Verify requirement exists
    const existing = await db!.requirement.findFirst({
      where: { id, organizationId: user.organizationId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })
    }

    // Delete related records first
    await db!.score.deleteMany({
      where: {
        requirementId: id
      }
    })

    await db!.candidate.deleteMany({
      where: {
        requirementId: id
      }
    })

    await db!.requirement.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete requirement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
