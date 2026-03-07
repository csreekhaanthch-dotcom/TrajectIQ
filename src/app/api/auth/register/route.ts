import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { hashPassword, createSession, validatePassword } from '@/lib/auth';
import { z } from 'zod';
import type { User, Role } from '@/types';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  organizationName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Validate password strength
    const passwordValidation = validatePassword(validatedData.password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Check if database is available
    if (!isDatabaseAvailable()) {
      // Demo mode - return a demo user
      const demoUser: User = {
        id: 'demo-' + Date.now(),
        email: validatedData.email.toLowerCase(),
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: 'RECRUITER',
        organizationId: null,
        isActive: true,
        lastLoginAt: null,
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
          },
          token,
        },
      });
    }

    // Check if user already exists
    const existingUser = await prisma!.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Create organization if provided
    let organizationId: string | null = null;
    if (validatedData.organizationName) {
      const slug = validatedData.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');

      const organization = await prisma!.organization.create({
        data: {
          name: validatedData.organizationName,
          slug,
        },
      });
      organizationId = organization.id;
    }

    // Create user
    const dbUser = await prisma!.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: organizationId ? 'ADMIN' : 'RECRUITER',
        organizationId,
      },
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

    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
