import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { hashPassword, createSession, validatePassword } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  organizationName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    console.log('[Register] Starting registration process...');
    
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Register] Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    console.log('[Register] Request body received:', { 
      email: body.email, 
      firstName: body.firstName, 
      lastName: body.lastName,
      hasOrgName: !!body.organizationName 
    });
    
    // Validate input
    let validatedData;
    try {
      validatedData = registerSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('[Register] Validation error:', validationError.errors);
        return NextResponse.json(
          { success: false, error: validationError.errors[0].message },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Validate password strength
    const passwordValidation = validatePassword(validatedData.password);
    if (!passwordValidation.isValid) {
      console.log('[Register] Password validation failed:', passwordValidation.errors);
      return NextResponse.json(
        { success: false, error: passwordValidation.errors.join(', ') },
        { status: 400 }
      );
    }
    console.log('[Register] Password validation passed');

    // Check if database is available
    let dbAvailable = false;
    try {
      dbAvailable = isDatabaseAvailable();
    } catch (dbCheckError) {
      console.error('[Register] Error checking database availability:', dbCheckError);
      dbAvailable = false;
    }
    
    console.log('[Register] Database available:', dbAvailable);
    
    if (!dbAvailable || !prisma) {
      // Demo mode - create a session without database
      console.log('[Register] Running in demo mode (no database)');
      
      const demoUser = {
        id: 'demo-' + Date.now(),
        email: validatedData.email.toLowerCase(),
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: (validatedData.organizationName ? 'ADMIN' : 'RECRUITER') as 'ADMIN' | 'RECRUITER' | 'VIEWER',
        organizationId: validatedData.organizationName ? 'demo-org' : null,
        isActive: true,
        lastLoginAt: null as Date | null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('[Register] Demo user created:', demoUser.id);

      try {
        const token = await createSession(demoUser);
        console.log('[Register] Demo session created successfully');

        return NextResponse.json({
          success: true,
          data: {
            user: {
              id: demoUser.id,
              email: demoUser.email,
              firstName: demoUser.firstName,
              lastName: demoUser.lastName,
              role: demoUser.role,
              organizationId: demoUser.organizationId,
            },
            token,
          },
        });
      } catch (sessionError) {
        console.error('[Register] Demo session creation error:', sessionError);
        const errorMessage = sessionError instanceof Error ? sessionError.message : 'Unknown session error';
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create session. Please try again.',
            details: errorMessage
          },
          { status: 500 }
        );
      }
    }

    // Production mode with database
    console.log('[Register] Checking for existing user...');
    
    // Check if user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email.toLowerCase() },
      });
    } catch (findError) {
      console.error('[Register] Error finding existing user:', findError);
      const errorMessage = findError instanceof Error ? findError.message : 'Unknown database error';
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection error. Please try again.',
          details: errorMessage
        },
        { status: 500 }
      );
    }

    if (existingUser) {
      console.log('[Register] User already exists:', validatedData.email);
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    console.log('[Register] No existing user found, proceeding with registration');

    // Hash password
    console.log('[Register] Hashing password...');
    let passwordHash;
    try {
      passwordHash = await hashPassword(validatedData.password);
    } catch (hashError) {
      console.error('[Register] Password hashing error:', hashError);
      return NextResponse.json(
        { success: false, error: 'Failed to process password. Please try again.' },
        { status: 500 }
      );
    }

    // Create organization if provided
    let organizationId: string | null = null;
    if (validatedData.organizationName) {
      console.log('[Register] Creating organization:', validatedData.organizationName);
      const slug = validatedData.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      try {
        const organization = await prisma.organization.create({
          data: {
            name: validatedData.organizationName,
            slug: slug || `org-${Date.now()}`,
          },
        });
        organizationId = organization.id;
        console.log('[Register] Organization created:', organizationId);
      } catch (orgError) {
        console.error('[Register] Organization creation error:', orgError);
        const errorMessage = orgError instanceof Error ? orgError.message : 'Unknown error';
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create organization. Please try again.',
            details: errorMessage
          },
          { status: 500 }
        );
      }
    }

    // Create user
    console.log('[Register] Creating user...');
    let dbUser;
    try {
      dbUser = await prisma.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          passwordHash,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          role: organizationId ? 'ADMIN' : 'RECRUITER',
          organizationId,
        },
      });
      console.log('[Register] User created:', dbUser.id);
    } catch (userError) {
      console.error('[Register] User creation error:', userError);
      const errorMessage = userError instanceof Error ? userError.message : 'Unknown error';
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create user account. Please try again.',
          details: errorMessage
        },
        { status: 500 }
      );
    }

    // Create session
    console.log('[Register] Creating session...');
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
      console.log('[Register] Session created successfully');
    } catch (sessionError) {
      console.error('[Register] Session creation error:', sessionError);
      return NextResponse.json(
        { success: false, error: 'Account created but session failed. Please try logging in.' },
        { status: 500 }
      );
    }

    console.log('[Register] Registration complete for:', dbUser.email);
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          role: dbUser.role,
          organizationId: dbUser.organizationId,
        },
        token,
      },
    });
  } catch (error) {
    console.error('[Register] Unhandled registration error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Register] Error details:', errorMessage);
    console.error('[Register] Error stack:', errorStack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Registration failed. Please check your input and try again.',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
