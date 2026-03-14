// ============================================
// Candidate Recommendations API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/rbac';
import { prisma, isDatabaseAvailable, canConnectToDatabase } from '@/lib/db';
import { z } from 'zod';

// ============================================
// Validation Schemas
// ============================================

const recommendRequestSchema = z.object({
  job_description: z.string().min(50, 'Job description must be at least 50 characters'),
  top_k: z.number().min(1).max(50).default(10),
  diversity_factor: z.number().min(0).max(1).default(0),
  organization_id: z.string().optional(),
});

// ============================================
// POST /api/recommend/candidates
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

    // Parse and validate request
    const body = await request.json();
    const validatedData = recommendRequestSchema.parse(body);

    // Check database
    if (!isDatabaseAvailable() || !(await canConnectToDatabase())) {
      return NextResponse.json({
        success: false,
        recommendations: [],
        diversity_applied: false,
        error: 'Database not available',
      }, { status: 503 });
    }

    const organizationId = validatedData.organization_id || user.organizationId;

    // Fetch candidates
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const candidates = await prisma!.candidate.findMany({
      where,
      include: {
        resumes: true,
      },
      take: 100,
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        diversity_applied: false,
      });
    }

    // Extract key terms from job description
    const jdTerms = extractKeyTerms(validatedData.job_description);

    // Score candidates
    let scoredCandidates = candidates.map(candidate => {
      const resume = candidate.resumes[0];
      let score = 0;
      const matchReasons: string[] = [];

      // Title match
      if (candidate.currentTitle) {
        const titleTerms = candidate.currentTitle.toLowerCase().split(/\s+/);
        const titleMatches = jdTerms.filter(t => titleTerms.some(tt => tt.includes(t) || t.includes(tt)));
        if (titleMatches.length > 0) {
          score += 0.3;
          matchReasons.push(`Current role aligns: ${candidate.currentTitle}`);
        }
      }

      // Skills match
      if (resume?.skills) {
        try {
          const skills = JSON.parse(resume.skills);
          const skillNames = skills.map((s: any) => (s.name || s).toLowerCase());

          const matchedSkills = skillNames.filter((skill: string) =>
            jdTerms.some(term => skill.includes(term) || term.includes(skill))
          );

          if (matchedSkills.length > 0) {
            score += Math.min(0.4, matchedSkills.length * 0.08);
            matchReasons.push(`Has relevant skills: ${matchedSkills.slice(0, 3).join(', ')}`);
          }
        } catch {
          // Ignore
        }
      }

      // Experience match
      if (candidate.yearsExperience) {
        const jdLower = validatedData.job_description.toLowerCase();
        if (jdLower.includes('senior') && candidate.yearsExperience >= 5) {
          score += 0.2;
          matchReasons.push('Has senior-level experience');
        } else if (jdLower.includes('junior') && candidate.yearsExperience <= 3) {
          score += 0.1;
          matchReasons.push('Appropriate experience level');
        } else if (candidate.yearsExperience >= 3) {
          score += 0.1;
        }
      }

      // Base score
      if (resume) score += 0.1;

      // Normalize
      score = Math.min(1, Math.max(0, score));

      return {
        candidate,
        score,
        matchReasons,
      };
    });

    // Sort by score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Apply diversity if requested
    if (validatedData.diversity_factor > 0) {
      scoredCandidates = applyDiversity(scoredCandidates, validatedData.diversity_factor);
    }

    // Build recommendations
    const recommendations = scoredCandidates.slice(0, validatedData.top_k).map((item, index) => ({
      rank: index + 1,
      candidate_id: item.candidate.id,
      name: `${item.candidate.firstName} ${item.candidate.lastName}`,
      email: item.candidate.email,
      current_title: item.candidate.currentTitle,
      current_company: item.candidate.currentCompany,
      years_experience: item.candidate.yearsExperience,
      skills: item.candidate.resumes[0]?.skills ? (() => {
        try {
          const s = JSON.parse(item.candidate.resumes[0].skills);
          return s.map((skill: any) => skill.name || skill).slice(0, 10);
        } catch { return []; }
      })() : [],
      similarity_score: Math.round(item.score * 100) / 100,
      recommendation_strength: item.score >= 0.85 ? 'strong' : item.score >= 0.7 ? 'moderate' : 'weak',
      match_reasons: item.matchReasons,
    }));

    return NextResponse.json({
      success: true,
      recommendations,
      diversity_applied: validatedData.diversity_factor > 0,
      search_time_ms: Date.now() - startTime,
      model_used: 'local',
    });

  } catch (error) {
    console.error('[Recommend] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Recommendation failed' },
      { status: 500 }
    );
  }
}

// ============================================
// Helper Functions
// ============================================

function extractKeyTerms(text: string): string[] {
  // Common tech skills and terms to look for
  const skillPatterns = [
    'python', 'javascript', 'typescript', 'java', 'react', 'angular', 'vue',
    'node', 'sql', 'postgresql', 'mongodb', 'aws', 'azure', 'docker',
    'kubernetes', 'machine learning', 'data science', 'devops', 'backend',
    'frontend', 'full stack', 'mobile', 'ios', 'android', 'golang', 'rust',
    'microservices', 'api', 'rest', 'graphql', 'ci/cd', 'git', 'agile',
    'scrum', 'leadership', 'senior', 'junior', 'architect', 'engineer',
  ];

  const textLower = text.toLowerCase();
  return skillPatterns.filter(skill => textLower.includes(skill));
}

function applyDiversity(
  candidates: any[],
  diversityFactor: number
): any[] {
  const companyCounts: Record<string, number> = {};
  const diverseResults: any[] = [];
  const remaining: any[] = [];

  for (const item of candidates) {
    const company = item.candidate.currentCompany || 'Unknown';
    companyCounts[company] = (companyCounts[company] || 0) + 1;

    if (companyCounts[company] <= 2) {
      diverseResults.push(item);
    } else {
      remaining.push(item);
    }
  }

  // Fill remaining spots
  return [...diverseResults, ...remaining];
}
