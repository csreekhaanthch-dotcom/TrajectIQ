import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { parseResume, calculateContentHash } from '@/lib/parsing/resume-parser'
import { extractTextFromFile } from '@/lib/parsing/text-extractor'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
      
      // Extract text based on file type (PDF, DOCX, TXT, etc.)
      try {
        const extracted = await extractTextFromFile(buffer, fileType, fileName)
        rawText = extracted.text
      } catch (extractError) {
        return NextResponse.json(
          { error: extractError instanceof Error ? extractError.message : 'Failed to extract text from file' },
          { status: 400 }
        )
      }
      
      if (!rawText || rawText.trim().length === 0) {
        return NextResponse.json(
          { error: 'No text content could be extracted from the file' },
          { status: 400 }
        )
      }
    } else if (text) {
      fileName = 'text-input.txt'
      fileType = 'text/plain'
      rawText = text
    }

    // FIX: Add await - parseResume is async and returns a Promise<ParseResult>
    const parseResult = await parseResume(rawText, fileName)
    
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { error: parseResult.error || 'Failed to parse resume' },
        { status: 400 }
      )
    }

    const contentHash = calculateContentHash(rawText)

    return NextResponse.json({
      parsed: {
        ...parseResult.data,
        fileName,
        fileType,
        contentHash,
        confidence: parseResult.confidence
      }
    })
  } catch (error) {
    console.error('Parse resume error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
