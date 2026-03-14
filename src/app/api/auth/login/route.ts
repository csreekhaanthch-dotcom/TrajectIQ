import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Check if database is available
    if (!isDatabaseAvailable() || !prisma) {
      // Demo mode - allow any login
      console.log('Database not available, running in demo mode');
      
      const demoUser = {
        id: 'demo-user',
        email: validatedData.email.toLowerCase(),
        firstName: 'Demo',
        lastName: 'User',
        role: 'ADMIN' as const,
        organizationId: 'demo-org',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        const token = await createSession(demoUser);

        return NextResponse.json({
          success: true,
          data: {
            user: {
              id: demoUser.id,
              email: demoUser.email,
              firstName: demoUser.firstName,
              lastName: demoUser.lastName,
              role: demoUser.role,
              organization: {
                id: 'demo-org',
                name: 'Demo Organization',
                plan: 'FREE',
              },
            },
            token,
          },
        });
      } catch (sessionError) {
        console.error('Session creation error:', sessionError);
        return NextResponse.json(
          { success: false, error: 'Failed to create session. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Find user
    const dbUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
      include: {
        organization: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(validatedData.password, dbUser.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!dbUser.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Update last login
    try {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (updateError) {
      console.error('Failed to update last login:', updateError);
      // Continue anyway, not critical
    }

    // Create session
    let token;
    try {
      token = await createSession({
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.role as 'ADMIN' | 'RECRUITER' | 'VIEWER',
        organizationId: dbUser.organizationId,
        isActive: dbUser.isActive,
        lastLoginAt: dbUser.lastLoginAt,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      });
    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Login failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          role: dbUser.role,
          organization: dbUser.organization ? {
            id: dbUser.organization.id,
            name: dbUser.organization.name,
            plan: dbUser.organization.plan,
          } : null,
        },
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Login failed. Please try again.',
      },
      { status: 500 }
    );
  }
}
