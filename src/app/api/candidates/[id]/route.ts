import { NextResponse } from 'next/server';
import { getCandidateById } from '@/lib/data/mock-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidate = getCandidateById(id);
    
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: 'Candidate not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: candidate,
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch candidate' },
      { status: 500 }
    );
  }
}
