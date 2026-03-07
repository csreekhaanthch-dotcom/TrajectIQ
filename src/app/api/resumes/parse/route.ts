import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth'
import { parseResume, calculateContentHash } from '@/lib/parsing/resume-parser'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null

    if (!file && !text) {
      return NextResponse.json(
        { error: 'Either file or text is required' },
        { status: 400 }
      )
    }

    let rawText = ''
    let fileName = ''
    let fileType = ''

    if (file) {
      fileName = file.name
      fileType = file.type
      const buffer = Buffer.from(await file.arrayBuffer())
      rawText = buffer.toString('utf-8')
    } else if (text) {
      fileName = 'text-input.txt'
      fileType = 'text/plain'
      rawText = text
    }

    const parsedResume = parseResume(rawText)
    const contentHash = calculateContentHash(rawText)

    return NextResponse.json({
      parsed: {
        ...parsedResume,
        fileName,
        fileType,
        contentHash
      }
    })
  } catch (error) {
    console.error('Parse resume error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
