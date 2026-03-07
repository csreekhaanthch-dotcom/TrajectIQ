import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { db, isDatabaseAvailable } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        requirements: [
          { id: '1', title: 'Senior Software Engineer', department: 'Engineering', location: 'Remote', status: 'ACTIVE', createdAt: new Date().toISOString(), _count: { candidates: 24 } },
          { id: '2', title: 'Full Stack Developer', department: 'Engineering', location: 'Hybrid', status: 'ACTIVE', createdAt: new Date(Date.now() - 86400000).toISOString(), _count: { candidates: 18 } },
          { id: '3', title: 'Python Developer', department: 'Data', location: 'Remote', status: 'ACTIVE', createdAt: new Date(Date.now() - 172800000).toISOString(), _count: { candidates: 12 } },
          { id: '4', title: 'Frontend Engineer', department: 'Engineering', location: 'On-site', status: 'PAUSED', createdAt: new Date(Date.now() - 259200000).toISOString(), _count: { candidates: 8 } },
          { id: '5', title: 'DevOps Engineer', department: 'Infrastructure', location: 'Remote', status: 'CLOSED', createdAt: new Date(Date.now() - 345600000).toISOString(), _count: { candidates: 15 } },
        ],
        pagination: { total: 5, limit: 50, offset: 0 }
      })
    }

    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Invalid token or no organization' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { organizationId: user.organizationId }
    if (status) {
      where.status = status
    }

    const requirements = await db!.requirement.findMany({
      where,
      include: {
        _count: {
          select: { candidates: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await db!.requirement.count({ where })

    return NextResponse.json({
      requirements,
      pagination: { total, limit, offset }
    })
  } catch (error) {
    console.error('Get requirements error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      const body = await request.json()
      return NextResponse.json({
        requirement: {
          id: 'demo-' + Date.now(),
          title: body.title || 'New Requirement',
          department: body.department || 'Engineering',
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }
      }, { status: 201 })
    }

    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'Invalid token or no organization' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      department,
      location,
      employmentType,
      requiredSkills,
      preferredSkills,
      experienceRequired,
      sourceEmailSubject,
      sourceEmailBody
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const requirement = await db!.requirement.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        title,
        department,
        location,
        employmentType: employmentType || 'FULL_TIME',
        requiredSkills: JSON.stringify(requiredSkills || []),
        preferredSkills: JSON.stringify(preferredSkills || []),
        experienceRequired: experienceRequired || 0,
        sourceEmailSubject,
        sourceEmailBody,
        status: 'ACTIVE'
      }
    })

    return NextResponse.json({ requirement }, { status: 201 })
  } catch (error) {
    console.error('Create requirement error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
