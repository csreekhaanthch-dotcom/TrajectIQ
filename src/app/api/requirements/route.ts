import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db, isDatabaseAvailable, canConnectToDatabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check database availability
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured',
        message: 'Please set DATABASE_URL environment variable to a PostgreSQL database.',
        requirements: [],
        pagination: { total: 0, limit: 50, offset: 0 }
      }, { status: 503 })
    }

    // Test actual connection
    if (!(await canConnectToDatabase())) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        message: 'Database URL is set but connection failed. Check credentials.',
        requirements: [],
        pagination: { total: 0, limit: 50, offset: 0 }
      }, { status: 503 })
    }

    const user = await getCurrentUser()
    if (!user || !user.organizationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated or no organization',
        requirements: [],
        pagination: { total: 0, limit: 50, offset: 0 }
      }, { status: 401 })
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
      success: true,
      requirements,
      pagination: { total, limit, offset }
    })
  } catch (error) {
    console.error('Get requirements error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      requirements: [],
      pagination: { total: 0, limit: 50, offset: 0 }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check database availability
    if (!isDatabaseAvailable() || !(await canConnectToDatabase())) {
      return NextResponse.json({
        success: false,
        error: 'Database not available',
        message: 'Please configure DATABASE_URL to create requirements.',
      }, { status: 503 })
    }

    const user = await getCurrentUser()
    if (!user || !user.organizationId) {
      return NextResponse.json({ 
        success: false,
        error: 'Not authenticated or no organization' 
      }, { status: 401 })
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
        { success: false, error: 'Title is required' },
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

    return NextResponse.json({ success: true, requirement }, { status: 201 })
  } catch (error) {
    console.error('Create requirement error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
