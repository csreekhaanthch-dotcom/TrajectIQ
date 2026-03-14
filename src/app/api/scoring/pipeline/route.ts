import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { runFullPipeline, calculateHiringScore } from '@/lib/scoring/pipeline'
import { prisma } from '@/lib/db'

/**
 * POST /api/scoring/pipeline
 * 
 * Complete scoring pipeline that:
 * 1. Accepts resume file or text
 * 2. Parses and extracts data
 * 3. Scores against job requirements
 * 4. Returns comprehensive results
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get organization
    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const organizationId = user.organizationId

    // Parse request
    const contentType = request.headers.get('content-type') || ''
    
    let resumeFile: { filename: string; mimeType: string; content: Buffer } | undefined
    let resumeText: string | undefined
    let requirementId: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      const file = formData.get('file') as File | null
      const text = formData.get('text') as string | null
      requirementId = formData.get('requirementId') as string | undefined

      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer())
        resumeFile = {
          filename: file.name,
          mimeType: file.type,
          content: buffer,
        }
      } else if (text) {
        resumeText = text
      }
    } else {
      const body = await request.json()
      resumeText = body.text
      requirementId = body.requirementId
    }

    if (!resumeFile && !resumeText) {
      return NextResponse.json(
        { error: 'Either file or text is required' },
        { status: 400 }
      )
    }

    // Run the pipeline
    const result = await runFullPipeline({
      resumeFile,
      resumeText,
      organizationId,
      requirementId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Pipeline failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      candidateId: result.candidateId,
      score: result.result,
    })
  } catch (error) {
    console.error('Scoring pipeline error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/scoring/pipeline?candidateId=xxx&requirementId=xxx
 * 
 * Calculate score for an existing candidate
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const candidateId = searchParams.get('candidateId')
    const requirementId = searchParams.get('requirementId')

    if (!candidateId || !requirementId) {
      return NextResponse.json(
        { error: 'candidateId and requirementId are required' },
        { status: 400 }
      )
    }

    // Check database
    if (!prisma) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      )
    }

    // Verify access
    const candidate = await prisma.candidate.findFirst({
      where: {
        id: candidateId,
        organizationId: user.organizationId || undefined,
      },
    })

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found or access denied' },
        { status: 404 }
      )
    }

    // Calculate score
    const result = await calculateHiringScore({
      candidateId,
      requirementId,
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to calculate score' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error('Score calculation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
