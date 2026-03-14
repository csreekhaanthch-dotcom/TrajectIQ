// ============================================
// Jobs/Requirements API Route
// With RBAC and Subscription Limits Enforcement
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, logAuditEvent } from '@/lib/auth/rbac';
import { canCreateResource, recordUsage } from '@/lib/subscription/limits';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { parseRequirementFromText } from '@/lib/parsing/requirement-parser';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  department: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'CONTRACT_TO_HIRE', 'INTERNSHIP']).optional(),
  salaryRange: z.string().optional(),
  requiredSkills: z.array(z.object({
    name: z.string(),
    required: z.boolean(),
    weight: z.number(),
    category: z.enum(['technical', 'soft', 'domain', 'tool']),
  })).optional(),
  preferredSkills: z.array(z.object({
    name: z.string(),
    required: z.boolean(),
    weight: z.number(),
    category: z.enum(['technical', 'soft', 'domain', 'tool']),
  })).optional(),
  experienceRequired: z.number().optional(),
  experiencePreferred: z.number().optional(),
  educationLevel: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  sourceEmailSubject: z.string().optional(),
  sourceEmailBody: z.string().optional(),
});

// ============================================
// POST /api/jobs - Create Job Requirement
// ============================================

export async function POST(request: NextRequest) {
  // Check authentication and permission
  const authResult = await requirePermission('jobs:create');
  
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  try {
    const body = await request.json();
    const validatedData = createJobSchema.parse(body);

    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        data: {
          id: 'demo-' + Date.now(),
          title: validatedData.title,
          status: 'ACTIVE',
        },
      });
    }

    const organizationId = user.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    // Check subscription limits
    const limitCheck = await canCreateResource(organizationId, 'JOBS');
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

    // If source email body is provided, parse requirements from it
    if (validatedData.sourceEmailBody) {
      const parseResult = await parseRequirementFromText(
        `${validatedData.sourceEmailSubject || ''}\n\n${validatedData.sourceEmailBody}`
      );

      if (parseResult.success && parseResult.data) {
        // Use parsed data if not explicitly provided
        if (!validatedData.requiredSkills?.length) {
          validatedData.requiredSkills = parseResult.data.requiredSkills;
        }
        if (!validatedData.preferredSkills?.length) {
          validatedData.preferredSkills = parseResult.data.preferredSkills;
        }
        if (!validatedData.experienceRequired) {
          validatedData.experienceRequired = parseResult.data.experienceRequired;
        }
      }
    }

    // Create requirement
    const requirement = await prisma!.requirement.create({
      data: {
        organizationId,
        createdById: user.id,
        title: validatedData.title,
        department: validatedData.department,
        location: validatedData.location,
        employmentType: validatedData.employmentType || 'FULL_TIME',
        salaryRange: validatedData.salaryRange,
        requiredSkills: JSON.stringify(validatedData.requiredSkills || []),
        preferredSkills: JSON.stringify(validatedData.preferredSkills || []),
        experienceRequired: validatedData.experienceRequired || 0,
        experiencePreferred: validatedData.experiencePreferred,
        educationLevel: validatedData.educationLevel,
        certifications: JSON.stringify(validatedData.certifications || []),
        sourceEmailSubject: validatedData.sourceEmailSubject,
        sourceEmailBody: validatedData.sourceEmailBody,
        status: 'ACTIVE',
      },
    });

    // Record usage
    await recordUsage({
      organizationId,
      resourceType: 'JOBS',
      action: 'CREATE',
      metadata: { requirementId: requirement.id, title: requirement.title },
    });

    // Log audit event
    await logAuditEvent({
      userId: user.id,
      organizationId,
      action: 'CREATE',
      entityType: 'REQUIREMENT',
      entityId: requirement.id,
      newValue: JSON.stringify({ title: requirement.title, department: requirement.department }),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: requirement.id,
        title: requirement.title,
        status: requirement.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create job error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/jobs - List Job Requirements
// ============================================

export async function GET(request: NextRequest) {
  // Check authentication and permission
  const authResult = await requirePermission('jobs:read');
  
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.statusCode }
    );
  }

  const user = authResult.user;

  // Return demo data if database is not available
  if (!isDatabaseAvailable()) {
    return NextResponse.json({
      success: true,
      data: [
        { id: '1', title: 'Senior Software Engineer', department: 'Engineering', location: 'Remote', employmentType: 'FULL_TIME', status: 'ACTIVE', experienceRequired: 5, candidateCount: 24, createdAt: new Date().toISOString(), requiredSkills: [{ name: 'TypeScript', required: true, weight: 10, category: 'technical' }] },
        { id: '2', title: 'Full Stack Developer', department: 'Engineering', location: 'Hybrid', employmentType: 'FULL_TIME', status: 'ACTIVE', experienceRequired: 3, candidateCount: 18, createdAt: new Date(Date.now() - 86400000).toISOString(), requiredSkills: [{ name: 'React', required: true, weight: 10, category: 'technical' }] },
        { id: '3', title: 'Python Developer', department: 'Data', location: 'Remote', employmentType: 'FULL_TIME', status: 'ACTIVE', experienceRequired: 2, candidateCount: 12, createdAt: new Date(Date.now() - 172800000).toISOString(), requiredSkills: [{ name: 'Python', required: true, weight: 10, category: 'technical' }] },
      ],
      pagination: { total: 3, limit: 20, offset: 0, hasMore: false },
    });
  }

  const organizationId = user.organizationId;
  if (!organizationId) {
    return NextResponse.json({ success: true, data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = {
      organizationId,
      ...(status && { status: status as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED' }),
    };

    const [requirements, total] = await Promise.all([
      prisma!.requirement.findMany({
        where,
        include: {
          _count: {
            select: { candidates: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma!.requirement.count({ where }),
    ]);

    const data = requirements.map(r => ({
      id: r.id,
      title: r.title,
      department: r.department,
      location: r.location,
      employmentType: r.employmentType,
      status: r.status,
      experienceRequired: r.experienceRequired,
      candidateCount: r._count.candidates,
      createdAt: r.createdAt,
      requiredSkills: JSON.parse(r.requiredSkills),
    }));

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
    console.error('Get jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
