import { NextResponse } from 'next/server';
import { mockJobs } from '@/lib/data/mock-data';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: mockJobs,
      total: mockJobs.length,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
