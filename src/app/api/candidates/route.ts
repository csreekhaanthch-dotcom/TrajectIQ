import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { parseResume } from '@/lib/parsing/resume-parser';
import { sha256 } from '@/lib/utils/encryption';
import { z } from 'zod';

const createCandidateSchema = z.object({
  requirementId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  resumeContent: z.string().optional(), // Base64 encoded
  source: z.enum(['EMAIL', 'ATS_GREENHOUSE', 'ATS_LEVER', 'ATS_WORKDAY', 'MANUAL_UPLOAD', 'API']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      const body = await request.json();
      return NextResponse.json({
        success: true,
        data: {
          id: 'demo-' + Date.now(),
          firstName: body.firstName || 'Demo',
          lastName: body.lastName || 'Candidate',
          email: body.email || 'demo@example.com',
          status: 'NEW',
        },
      });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const organizationId = session.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No organization associated with user' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createCandidateSchema.parse(body);

    // Verify requirement exists
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
    const contentHash = validatedData.resumeContent 
      ? sha256(validatedData.resumeContent) 
      : null;

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
        createdById: session.userId,
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

export async function GET(request: NextRequest) {
  try {
    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        data: [
          { id: '1', firstName: 'John', lastName: 'Smith', email: 'john@example.com', currentTitle: 'Senior Engineer', status: 'NEW', topScore: 78.5, yearsExperience: 8, createdAt: new Date().toISOString(), skills: ['TypeScript', 'React', 'Node.js'] },
          { id: '2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', currentTitle: 'Full Stack Developer', status: 'SCREENING', topScore: 85.2, yearsExperience: 5, createdAt: new Date(Date.now() - 3600000).toISOString(), skills: ['Python', 'Django', 'PostgreSQL'] },
          { id: '3', firstName: 'Mike', lastName: 'Johnson', email: 'mike@example.com', currentTitle: 'Python Developer', status: 'NEW', topScore: 65.8, yearsExperience: 3, createdAt: new Date(Date.now() - 7200000).toISOString(), skills: ['Python', 'FastAPI', 'AWS'] },
          { id: '4', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@example.com', currentTitle: 'Tech Lead', status: 'INTERVIEWED', topScore: 82.1, yearsExperience: 10, createdAt: new Date(Date.now() - 10800000).toISOString(), skills: ['Leadership', 'Java', 'Spring Boot'] },
          { id: '5', firstName: 'Alex', lastName: 'Brown', email: 'alex@example.com', currentTitle: 'Backend Developer', status: 'NEW', topScore: 79.8, yearsExperience: 4, createdAt: new Date(Date.now() - 14400000).toISOString(), skills: ['Go', 'Kubernetes', 'Docker'] },
        ],
        pagination: { total: 5, limit: 20, offset: 0, hasMore: false },
      });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const organizationId = session.organizationId;
    if (!organizationId) {
      return NextResponse.json({ success: true, data: [], pagination: { total: 0, limit: 20, offset: 0, hasMore: false } });
    }

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
