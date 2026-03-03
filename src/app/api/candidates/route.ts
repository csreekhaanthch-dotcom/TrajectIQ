import { NextResponse } from 'next/server';
import { mockCandidates } from '@/lib/data/mock-data';

export async function GET() {
  try {
    // Sort candidates by score (highest first)
    const sortedCandidates = [...mockCandidates].sort((a, b) => b.score - a.score);
    
    return NextResponse.json({
      success: true,
      data: sortedCandidates,
      total: sortedCandidates.length,
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch candidates' },
      { status: 500 }
    );
  }
}
