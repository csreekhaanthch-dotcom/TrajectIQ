import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { z } from 'zod';
import type { User, Role } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Check if database is available
    if (!isDatabaseAvailable()) {
      // Demo mode - allow any login for demo purposes
      const demoUser: User = {
        id: 'demo-user',
        email: validatedData.email.toLowerCase(),
        firstName: 'Demo',
        lastName: 'User',
        role: 'ADMIN',
        organizationId: 'demo-org',
        isActive: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

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
    }

    // Find user
    const dbUser = await prisma!.user.findUnique({
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
    await prisma!.user.update({
      where: { id: dbUser.id },
      data: { lastLoginAt: new Date() },
    });

    // Cast to User type
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role as Role,
      organizationId: dbUser.organizationId,
      isActive: dbUser.isActive,
      lastLoginAt: dbUser.lastLoginAt,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    };

    // Create session
    const token = await createSession(user);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
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
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
