import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return demo user if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        data: {
          id: session.userId,
          email: session.email,
          firstName: 'Demo',
          lastName: 'User',
          role: session.role,
          isActive: true,
          lastLoginAt: new Date(),
          organization: {
            id: 'demo-org',
            name: 'Demo Organization',
            slug: 'demo-org',
            plan: 'FREE',
            maxUsers: 5,
            maxCandidates: 1000,
          },
          createdAt: new Date(),
        },
      });
    }

    const user = await prisma!.user.findUnique({
      where: { id: session.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            maxUsers: true,
            maxCandidates: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        organization: user.organization,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
