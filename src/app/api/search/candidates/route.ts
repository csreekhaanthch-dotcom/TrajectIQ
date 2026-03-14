// ============================================
// Semantic Candidate Search API Route
// Vector Search Intelligence Layer
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/rbac';
import { prisma, isDatabaseAvailable, canConnectToDatabase } from '@/lib/db';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

const searchRequestSchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters'),
  limit: z.number().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.5),
  organization_id: z.string().optional(),
  skills_filter: z.array(z.string()).optional(),
  experience_min: z.number().optional(),
  experience_max: z.number().optional(),
});

// ============================================
// POST /api/search/candidates - Semantic Search
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication
    const authResult = await requirePermission('candidates:read');

    if (!authResult.authorized || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const user = authResult.user;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = searchRequestSchema.parse(body);

    // Check database availability
    if (!isDatabaseAvailable() || !(await canConnectToDatabase())) {
      // Try to connect to Python backend for vector search
      const pythonResult = await searchViaPythonBackend(validatedData, user.organizationId);
      if (pythonResult) {
        return NextResponse.json(pythonResult);
      }

      // Fallback to demo response with database candidates
      return NextResponse.json({
        success: true,
        query: validatedData.query,
        results: [],
        total_count: 0,
        search_time_ms: Date.now() - startTime,
        model_used: 'demo',
        message: 'Vector search not available. Database candidates shown with basic matching.',
      });
    }

    const organizationId = validatedData.organization_id || user.organizationId;

    // Build the where clause for candidate filtering
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }
    if (validatedData.experience_min !== undefined) {
      where.yearsExperience = { gte: validatedData.experience_min };
    }
    if (validatedData.experience_max !== undefined) {
      where.yearsExperience = {
        ...where.yearsExperience,
        lte: validatedData.experience_max,
      };
    }

    // Fetch candidates with their embeddings and resumes
    const candidates = await prisma!.candidate.findMany({
      where,
      include: {
        resumes: true,
        embeddings: true,
      },
      take: 100, // Limit for performance
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        query: validatedData.query,
        results: [],
        total_count: 0,
        search_time_ms: Date.now() - startTime,
        model_used: 'none',
      });
    }

    // Try to use Python backend for semantic search
    const pythonResult = await searchViaPythonBackend(validatedData, organizationId);
    if (pythonResult && pythonResult.results?.length > 0) {
      return NextResponse.json(pythonResult);
    }

    // Fallback: Use stored embeddings for similarity computation
    const results = await computeSimilarityLocally(
      validatedData.query,
      candidates,
      validatedData.threshold,
      validatedData.limit,
      validatedData.skills_filter
    );

    return NextResponse.json({
      success: true,
      query: validatedData.query,
      results,
      total_count: results.length,
      search_time_ms: Date.now() - startTime,
      model_used: 'local',
    });

  } catch (error) {
    console.error('[Search] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

// ============================================
// Helper Functions
// ============================================

async function searchViaPythonBackend(
  params: z.infer<typeof searchRequestSchema>,
  organizationId: string | null
): Promise<any | null> {
  try {
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';

    const response = await fetch(`${pythonBackendUrl}/api/search/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: params.query,
        limit: params.limit,
        threshold: params.threshold,
        organization_id: organizationId,
        skills_filter: params.skills_filter,
        experience_min: params.experience_min,
        experience_max: params.experience_max,
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn('[Search] Python backend returned:', response.status);
      return null;
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.warn('[Search] Python backend unavailable:', error);
    return null;
  }
}

async function computeSimilarityLocally(
  query: string,
  candidates: any[],
  threshold: number,
  limit: number,
  skillsFilter?: string[]
): Promise<any[]> {
  // Simple keyword-based matching as fallback
  // In production, this would use the embedding engine

  const queryTerms = query.toLowerCase().split(/\s+/);

  const results = candidates.map(candidate => {
    // Get resume data
    const resume = candidate.resumes[0];
    const embedding = candidate.embeddings[0];

    let score = 0;
    const highlights: string[] = [];

    // Check title match
    if (candidate.currentTitle) {
      const titleTerms = candidate.currentTitle.toLowerCase().split(/\s+/);
      const titleMatches = queryTerms.filter(t => titleTerms.some(tt => tt.includes(t) || t.includes(tt)));
      if (titleMatches.length > 0) {
        score += 0.3;
        highlights.push(`Title matches: ${candidate.currentTitle}`);
      }
    }

    // Check skills match
    if (resume?.skills) {
      try {
        const skills = JSON.parse(resume.skills);
        const skillNames = skills.map((s: any) => (s.name || s).toLowerCase());

        // Check against query terms
        const matchedSkills = skillNames.filter((skill: string) =>
          queryTerms.some(term => skill.includes(term) || term.includes(skill))
        );

        if (matchedSkills.length > 0) {
          score += Math.min(0.5, matchedSkills.length * 0.1);
          highlights.push(`Skills match: ${matchedSkills.slice(0, 3).join(', ')}`);
        }

        // Check against skills filter
        if (skillsFilter) {
          const filterMatch = skillsFilter.filter(s =>
            skillNames.some((sn: string) => sn.includes(s.toLowerCase()) || s.toLowerCase().includes(sn))
          );
          if (filterMatch.length === skillsFilter.length) {
            score += 0.2;
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Check experience match
    if (candidate.yearsExperience) {
      const expMatch = queryTerms.some(t =>
        (t.includes('senior') && candidate.yearsExperience >= 5) ||
        (t.includes('junior') && candidate.yearsExperience <= 3) ||
        (t.includes('experienced') && candidate.yearsExperience >= 3)
      );
      if (expMatch) {
        score += 0.1;
        highlights.push(`Experience level matches: ${candidate.yearsExperience} years`);
      }
    }

    // Use stored embedding score if available
    if (embedding?.embedding) {
      // For now, give a small boost if embedding exists
      score += 0.1;
    }

    // Base score for having a resume
    if (resume) {
      score += 0.1;
    }

    // Ensure score is between 0 and 1
    score = Math.min(1, Math.max(0, score));

    return {
      candidate_id: candidate.id,
      similarity_score: score,
      match_level: score >= 0.8 ? 'excellent' : score >= 0.6 ? 'high' : score >= 0.4 ? 'medium' : 'low',
      name: `${candidate.firstName} ${candidate.lastName}`,
      email: candidate.email,
      current_title: candidate.currentTitle,
      current_company: candidate.currentCompany,
      years_experience: candidate.yearsExperience,
      skills: resume?.skills ? (() => {
        try {
          const s = JSON.parse(resume.skills);
          return s.map((skill: any) => skill.name || skill).slice(0, 10);
        } catch { return []; }
      })() : [],
      highlights,
    };
  });

  // Filter by threshold and sort
  return results
    .filter(r => r.similarity_score >= threshold)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);
}

// ============================================
// GET /api/search/candidates - Status Check
// ============================================

export async function GET() {
  try {
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';

    // Check Python backend status
    let pythonStatus = 'unavailable';
    try {
      const response = await fetch(`${pythonBackendUrl}/api/search/status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        pythonStatus = data.status || 'available';
      }
    } catch {
      // Python backend not available
    }

    return NextResponse.json({
      success: true,
      status: pythonStatus === 'available' ? 'available' : 'limited',
      features: {
        semantic_search: pythonStatus === 'available',
        job_matching: pythonStatus === 'available',
        recommendations: pythonStatus === 'available',
        fallback_matching: true,
      },
      python_backend: pythonStatus,
      database: isDatabaseAvailable(),
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      error: 'Failed to check search status',
    });
  }
}
