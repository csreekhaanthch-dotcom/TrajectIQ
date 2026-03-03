import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/data/mock-data';

export async function GET() {
  try {
    const stats = getDashboardStats();
    
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
