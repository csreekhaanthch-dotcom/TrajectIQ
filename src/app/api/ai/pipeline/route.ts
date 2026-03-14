// ============================================
// AI Pipeline API - Proxy to Python Backend
// ============================================

import { NextRequest, NextResponse } from 'next/server';

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${AI_BACKEND_URL}/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('AI pipeline error:', error);
    return NextResponse.json(
      { success: false, error: 'AI backend request failed' },
      { status: 503 }
    );
  }
}
