// ============================================
// Skill Extraction API - Proxy to Python Backend
// ============================================

import { NextRequest, NextResponse } from 'next/server';

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${AI_BACKEND_URL}/skills/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Skill extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Skill extraction failed' },
      { status: 503 }
    );
  }
}
