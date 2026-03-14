// ============================================
// Job-Candidate Matching API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/rbac';
import { prisma, isDatabaseAvailable, canConnectToDatabase } from '@/lib/db';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

const jobMatchRequestSchema = z.object({
  job_description: z.string().min(50, 'Job description must be at least 50 characters'),
  required_skills: z.array(z.string()).optional(),
  preferred_skills: z.array(z.string()).optional(),
  experience_required: z.number().optional(),
  limit: z.number().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.5),
  organization_id: z.string().optional(),
});

// ============================================
// POST /api/search/jobs - Match Candidates to Job
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
    const validatedData = jobMatchRequestSchema.parse(body);

    // Check database availability
    if (!isDatabaseAvailable() || !(await canConnectToDatabase())) {
      return NextResponse.json({
        success: false,
        error: 'Database not available',
      }, { status: 503 });
    }

    const organizationId = validatedData.organization_id || user.organizationId;

    // Build the where clause
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }
    if (validatedData.experience_required) {
      where.yearsExperience = { gte: validatedData.experience_required };
    }

    // Fetch candidates
    const candidates = await prisma!.candidate.findMany({
      where,
      include: {
        resumes: true,
        embeddings: true,
      },
      take: 100,
    });

    // Compute matches
    const results = candidates.map(candidate => {
      const resume = candidate.resumes[0];
      let score = 0;
      let skillMatchPercentage: number | null = null;

      // Check skills match
      if (resume?.skills && validatedData.required_skills) {
        try {
          const skills = JSON.parse(resume.skills);
          const skillNames = skills.map((s: any) => (s.name || s).toLowerCase());
          const requiredSkillsLower = validatedData.required_skills.map(s => s.toLowerCase());

          const matchedSkills = requiredSkillsLower.filter(s =>
            skillNames.some((sn: string) => sn.includes(s) || s.includes(sn))
          );

          skillMatchPercentage = (matchedSkills.length / requiredSkillsLower.length) * 100;
          score += skillMatchPercentage / 200; // Weight: 50% for skills
        } catch {
          // Ignore parse errors
        }
      }

      // Check experience
      if (candidate.yearsExperience && validatedData.experience_required) {
        if (candidate.yearsExperience >= validatedData.experience_required) {
          score += 0.3;
        }
      }

      // Base score for having resume
      if (resume) {
        score += 0.2;
      }

      // Normalize score
      score = Math.min(1, Math.max(0, score));

      return {
        candidate_id: candidate.id,
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
        similarity_score: Math.round(score * 100) / 100,
        skill_match_percentage: skillMatchPercentage ? Math.round(skillMatchPercentage) : null,
        match_level: score >= 0.8 ? 'excellent' : score >= 0.6 ? 'high' : score >= 0.4 ? 'medium' : 'low',
      };
    });

    // Filter and sort
    const filteredResults = results
      .filter(r => r.similarity_score >= validatedData.threshold)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, validatedData.limit);

    return NextResponse.json({
      success: true,
      results: filteredResults,
      total_count: filteredResults.length,
      search_time_ms: Date.now() - startTime,
      model_used: 'local',
    });

  } catch (error) {
    console.error('[JobMatch] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Job matching failed' },
      { status: 500 }
    );
  }
}
