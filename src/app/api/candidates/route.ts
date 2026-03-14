// ============================================
// Candidates API Route
// With RBAC and Subscription Limits Enforcement
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireResourceAccess, logAuditEvent } from '@/lib/auth/rbac';
import { enforceLimit, recordUsage, canCreateResource } from '@/lib/subscription/limits';
import { prisma, isDatabaseAvailable, canConnectToDatabase } from '@/lib/db';
import { parseResume } from '@/lib/parsing/resume-parser';
import { sha256 } from '@/lib/utils/encryption';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

const createCandidateSchema = z.object({
  requirementId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  resumeContent: z.string().optional(), // Base64 encoded
  source: z.enum(['EMAIL', 'ATS_GREENHOUSE', 'ATS_LEVER', 'ATS_WORKDAY', 'MANUAL_UPLOAD', 'API']).optional(),
});

// ============================================
// POST /api/candidates - Create Candidate
// ============================================

export async function POST(request: NextRequest) {
  // Check authentication and permission
  const authResult = await requirePermission('candidates:create');
  
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  // Check database availability
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      success: false,
      error: 'Database not configured',
      message: 'Please set DATABASE_URL environment variable.',
    }, { status: 503 });
  }

  // Test actual connection
  if (!(await canConnectToDatabase())) {
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      message: 'Database URL is set but connection failed.',
    }, { status: 503 });
  }

  const organizationId = user.organizationId;
  if (!organizationId) {
    return NextResponse.json(
      { success: false, error: 'No organization associated with user' },
      { status: 400 }
    );
  }

  try {
    // Check subscription limits
    const limitCheck = await canCreateResource(organizationId, 'CANDIDATES');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: limitCheck.reason,
          code: 'LIMIT_EXCEEDED',
          current: limitCheck.current,
          limit: limitCheck.limit,
        },
        { status: 402 } // Payment Required
      );
    }

    const body = await request.json();
    const validatedData = createCandidateSchema.parse(body);

    // Verify requirement exists and user has access
    const requirement = await prisma!.requirement.findFirst({
      where: {
        id: validatedData.requirementId,
        organizationId,
      },
    });

    if (!requirement) {
      return NextResponse.json(
        { success: false, error: 'Requirement not found' },
        { status: 404 }
      );
    }

    let candidateData: {
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      location: string | null;
      linkedinUrl: string | null;
      githubUrl: string | null;
      portfolioUrl: string | null;
      currentTitle: string | null;
      currentCompany: string | null;
      rawResumeText: string | null;
      skills: { name: string; level: string; yearsOfExperience: number; lastUsed: string | null }[];
      experience: unknown[];
      education: unknown[];
      projects: unknown[];
    } = {
      firstName: validatedData.firstName || 'Unknown',
      lastName: validatedData.lastName || '',
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      location: null,
      linkedinUrl: null,
      githubUrl: null,
      portfolioUrl: null,
      currentTitle: null,
      currentCompany: null,
      rawResumeText: null,
      skills: [],
      experience: [],
      education: [],
      projects: [],
    };

    // Parse resume if provided
    if (validatedData.resumeContent) {
      const resumeBuffer = Buffer.from(validatedData.resumeContent, 'base64');
      const resumeText = resumeBuffer.toString('utf-8');
      const parseResult = await parseResume(resumeText);

      if (parseResult.success && parseResult.data) {
        candidateData = {
          firstName: parseResult.data.firstName || candidateData.firstName,
          lastName: parseResult.data.lastName || candidateData.lastName,
          email: parseResult.data.email || candidateData.email,
          phone: parseResult.data.phone || candidateData.phone,
          location: parseResult.data.location,
          linkedinUrl: parseResult.data.linkedinUrl,
          githubUrl: parseResult.data.githubUrl,
          portfolioUrl: parseResult.data.portfolioUrl,
          currentTitle: parseResult.data.currentTitle,
          currentCompany: parseResult.data.currentCompany,
          rawResumeText: resumeText,
          skills: parseResult.data.skills,
          experience: parseResult.data.experience,
          education: parseResult.data.education,
          projects: parseResult.data.projects,
        };
      }
    }

    // Check for duplicate
    if (candidateData.email) {
      const existingCandidate = await prisma!.candidate.findFirst({
        where: {
          organizationId,
          email: candidateData.email,
        },
      });

      if (existingCandidate) {
        return NextResponse.json({
          success: true,
          data: {
            id: existingCandidate.id,
            isDuplicate: true,
            message: 'Candidate already exists',
          },
        });
      }
    }

    // Create candidate
    const candidate = await prisma!.candidate.create({
      data: {
        organizationId,
        requirementId: validatedData.requirementId,
        createdById: user.id,
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        email: candidateData.email,
        phone: candidateData.phone,
        location: candidateData.location,
        linkedinUrl: candidateData.linkedinUrl,
        githubUrl: candidateData.githubUrl,
        portfolioUrl: candidateData.portfolioUrl,
        currentTitle: candidateData.currentTitle,
        currentCompany: candidateData.currentCompany,
        rawResumeText: candidateData.rawResumeText,
        status: 'NEW',
        source: validatedData.source || 'MANUAL_UPLOAD',
      },
    });

    // Create resume record
    if (candidateData.skills.length > 0 || candidateData.experience.length > 0) {
      await prisma!.resume.create({
        data: {
          candidateId: candidate.id,
          skills: JSON.stringify(candidateData.skills),
          experience: JSON.stringify(candidateData.experience),
          education: JSON.stringify(candidateData.education),
          projects: JSON.stringify(candidateData.projects),
          parsedAt: new Date(),
          parseVersion: '1.0',
        },
      });
    }

    // Record usage
    await recordUsage({
      organizationId,
      resourceType: 'CANDIDATES',
      action: 'CREATE',
      metadata: { candidateId: candidate.id },
    });

    // Log audit event
    await logAuditEvent({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      entityType: 'CANDIDATE',
      entityId: candidate.id,
      newValue: JSON.stringify({ 
        firstName: candidate.firstName, 
        lastName: candidate.lastName, 
        email: candidate.email 
      }),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: candidate.id,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        status: candidate.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create candidate error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/candidates - List Candidates
// ============================================

export async function GET(request: NextRequest) {
  // Check authentication and permission
  const authResult = await requirePermission('candidates:read');
  
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  // Check database availability
  if (!isDatabaseAvailable() || !(await canConnectToDatabase())) {
    return NextResponse.json({
      success: false,
      error: 'Database not available',
      message: 'Please configure DATABASE_URL to view real candidate data.',
      data: [],
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
    }, { status: 503 });
  }

  const organizationId = user.organizationId;
  if (!organizationId) {
    return NextResponse.json({ 
      success: true, 
      data: [], 
      pagination: { total: 0, limit: 20, offset: 0, hasMore: false } 
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requirementId = searchParams.get('requirementId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = {
      organizationId,
      ...(requirementId && { requirementId }),
      ...(status && { status: status as 'NEW' | 'SCREENING' | 'INTERVIEWED' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN' }),
    };

    const [candidates, total] = await Promise.all([
      prisma!.candidate.findMany({
        where,
        include: {
          scores: {
            include: {
              requirement: {
                select: { title: true },
              },
            },
          },
          resumes: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma!.candidate.count({ where }),
    ]);

    const data = candidates.map(c => {
      const topScore = c.scores.length > 0 
        ? c.scores.reduce((top, s) => s.finalScore > top ? s.finalScore : top, 0)
        : null;

      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        location: c.location,
        currentTitle: c.currentTitle,
        currentCompany: c.currentCompany,
        status: c.status,
        source: c.source,
        topScore,
        yearsExperience: c.yearsExperience,
        createdAt: c.createdAt,
        skills: c.resumes.length > 0 ? JSON.parse(c.resumes[0].skills) : [],
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
