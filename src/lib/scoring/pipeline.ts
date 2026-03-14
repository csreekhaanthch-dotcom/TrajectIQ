// ============================================
// Complete Scoring Pipeline
// ============================================
// End-to-end pipeline that:
// 1. Extracts text from PDF/DOCX resumes
// 2. Parses resume into structured data
// 3. Executes the APEX scoring engine
// 4. Stores results for UI display

import { prisma } from '@/lib/db'
import { parseResume, calculateContentHash } from '@/lib/parsing/resume-parser'
import { extractTextFromFile } from '@/lib/parsing/text-extractor'
import { detectAIContent } from '@/lib/scoring/ai-detection'
import { calculateSDI } from '@/lib/scoring/sdi'
import { calculateCSIG } from '@/lib/scoring/csig'
import { calculateIAE } from '@/lib/scoring/iae'
import { calculateCTA } from '@/lib/scoring/cta'
import { calculateERR } from '@/lib/scoring/err'
import {
  DEFAULT_WEIGHTS,
  scoreToGrade,
  scoreToTier,
  getRecommendation,
  type ScoringWeights,
} from '@/lib/scoring/types'
import type { ResumeSkill, Skill, ResumeExperience, ResumeProject, ResumeEducation } from '@/types'

// ============================================
// Types
// ============================================

export interface PipelineInput {
  candidateId?: string
  requirementId?: string
  resumeFile?: {
    filename: string
    mimeType: string
    content: Buffer
  }
  resumeText?: string
  organizationId: string
}

export interface PipelineResult {
  success: boolean
  candidateId?: string
  scoreId?: string
  result?: ScoringResult
  error?: string
}

export interface ScoringResult {
  candidateId: string
  requirementId: string
  sdi: { score: number; weight: number; weightedScore: number; breakdown: Record<string, unknown> }
  csig: { score: number; weight: number; weightedScore: number; breakdown: Record<string, unknown> }
  iae: { score: number; weight: number; weightedScore: number; breakdown: Record<string, unknown> }
  cta: { score: number; weight: number; weightedScore: number; breakdown: Record<string, unknown> }
  err: { score: number; weight: number; weightedScore: number; breakdown: Record<string, unknown> }
  finalScore: number
  grade: string
  tier: number
  recommendation: string
  scoringVersion: string
  timestamp: Date
}

// ============================================
// Main Pipeline Function
// ============================================

export async function calculateHiringScore(input: {
  candidateId: string
  requirementId: string
  weights?: ScoringWeights
}): Promise<ScoringResult | null> {
  const { candidateId, requirementId, weights = DEFAULT_WEIGHTS } = input

  // Check database availability
  if (!prisma) {
    console.error('[ScoringPipeline] Database not available')
    return null
  }

  // Fetch candidate and requirement data
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  })

  const requirement = await prisma.requirement.findUnique({
    where: { id: requirementId },
  })

  if (!candidate || !requirement) {
    console.error('[ScoringPipeline] Candidate or requirement not found')
    return null
  }

  // Parse resume text if available
  let resumeData: {
    skills?: ResumeSkill[]
    experience?: ResumeExperience[]
    education?: ResumeEducation[]
    projects?: ResumeProject[]
    summary?: string
    rawText?: string
  } = {}
  
  if (candidate.rawResumeText) {
    try {
      resumeData = JSON.parse(candidate.rawResumeText)
    } catch {
      // Resume text is raw text, not JSON
      resumeData = { rawText: candidate.rawResumeText }
    }
  }

  // Build skills array
  const candidateSkills: ResumeSkill[] = (resumeData.skills || []).map((s) => ({
    name: s.name,
    level: s.level || 'intermediate',
    yearsOfExperience: s.yearsOfExperience || 1,
    lastUsed: s.lastUsed || null,
  }))

  // Parse requirement skills
  let requiredSkills: Skill[] = []
  try {
    const parsed = JSON.parse(requirement.requiredSkills)
    requiredSkills = Array.isArray(parsed) ? parsed.map((s: string | Skill) => 
      typeof s === 'string' 
        ? { name: s, required: true, weight: 1, category: 'technical' }
        : { ...s, category: s.category || 'technical' }
    ) : []
  } catch {
    requiredSkills = []
  }

  // Get resume data components
  const experience: ResumeExperience[] = resumeData.experience || []
  const projects: ResumeProject[] | null = resumeData.projects || null
  const education: ResumeEducation[] = resumeData.education || []
  const summary: string | null = resumeData.summary || null

  // Calculate component scores
  const sdiResult = calculateSDI(candidateSkills, requiredSkills, experience, projects)
  const csigResult = calculateCSIG(candidateSkills, requiredSkills)
  const iaeResult = calculateIAE(experience, projects, summary)
  const ctaResult = calculateCTA(experience, education)
  const errResult = calculateERR(experience, projects, requiredSkills)

  // Calculate weighted final score
  const finalScore =
    sdiResult.score * weights.sdi +
    csigResult.score * weights.csig +
    iaeResult.score * weights.iae +
    ctaResult.score * weights.cta +
    errResult.score * weights.err

  // Determine grade and recommendation
  const grade = scoreToGrade(finalScore)
  const tier = scoreToTier(finalScore)
  const recommendation = getRecommendation(finalScore, csigResult.score)

  // AI Detection
  const rawText = resumeData.rawText || candidate.rawResumeText || ''
  const aiDetection = detectAIContent(rawText)

  // Build result object
  const scoringResult: ScoringResult = {
    candidateId,
    requirementId,
    sdi: {
      score: sdiResult.score,
      weight: weights.sdi,
      weightedScore: sdiResult.score * weights.sdi,
      breakdown: sdiResult.breakdown as unknown as Record<string, unknown>,
    },
    csig: {
      score: csigResult.score,
      weight: weights.csig,
      weightedScore: csigResult.score * weights.csig,
      breakdown: csigResult.breakdown as unknown as Record<string, unknown>,
    },
    iae: {
      score: iaeResult.score,
      weight: weights.iae,
      weightedScore: iaeResult.score * weights.iae,
      breakdown: iaeResult.breakdown as unknown as Record<string, unknown>,
    },
    cta: {
      score: ctaResult.score,
      weight: weights.cta,
      weightedScore: ctaResult.score * weights.cta,
      breakdown: ctaResult.breakdown as unknown as Record<string, unknown>,
    },
    err: {
      score: errResult.score,
      weight: weights.err,
      weightedScore: errResult.score * weights.err,
      breakdown: errResult.breakdown as unknown as Record<string, unknown>,
    },
    finalScore,
    grade,
    tier,
    recommendation: recommendation as string,
    scoringVersion: '2.0.0',
    timestamp: new Date(),
  }

  // Store score in database
  await prisma.score.create({
    data: {
      candidateId,
      requirementId,
      sdiScore: sdiResult.score,
      csigScore: csigResult.score,
      iaeScore: iaeResult.score,
      ctaScore: ctaResult.score,
      errScore: errResult.score,
      sdiWeighted: sdiResult.score * weights.sdi,
      csigWeighted: csigResult.score * weights.csig,
      iaeWeighted: iaeResult.score * weights.iae,
      ctaWeighted: ctaResult.score * weights.cta,
      errWeighted: errResult.score * weights.err,
      finalScore,
      grade,
      tier,
      recommendation: recommendation as string,
      scoreBreakdown: JSON.stringify({
        sdi: sdiResult.breakdown,
        csig: csigResult.breakdown,
        iae: iaeResult.breakdown,
        cta: ctaResult.breakdown,
        err: errResult.breakdown,
        aiDetection: {
          isAIGenerated: aiDetection.isAIGenerated,
          confidence: aiDetection.confidence,
          riskLevel: aiDetection.riskLevel,
        },
      }),
    },
  })

  console.log(`[ScoringPipeline] Created score for candidate ${candidateId}`)

  return scoringResult
}

// ============================================
// Full Pipeline from File
// ============================================

export async function runFullPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { resumeFile, resumeText, organizationId, requirementId } = input

  // Check database availability
  if (!prisma) {
    return {
      success: false,
      error: 'Database not available',
    }
  }

  try {
    // Step 1: Get resume text
    let rawText = ''
    let filename = ''

    if (resumeFile) {
      // Properly extract text from PDF/DOCX files
      try {
        const extracted = await extractTextFromFile(
          resumeFile.content,
          resumeFile.mimeType,
          resumeFile.filename
        )
        rawText = extracted.text
        filename = resumeFile.filename
      } catch (extractError) {
        console.error('[ScoringPipeline] Text extraction error:', extractError)
        return {
          success: false,
          error: extractError instanceof Error ? extractError.message : 'Failed to extract text from file',
        }
      }
    } else if (resumeText) {
      rawText = resumeText
      filename = 'text-input.txt'
    } else {
      return {
        success: false,
        error: 'No resume provided',
      }
    }

    // Step 2: Parse resume
    const parseResult = await parseResume(rawText, filename)
    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        error: parseResult.error || 'Failed to parse resume',
      }
    }

    const resumeData = parseResult.data
    const contentHash = calculateContentHash(rawText)

    // Step 3: Check for duplicate
    const existingCandidate = resumeData.email
      ? await prisma.candidate.findFirst({
          where: {
            organizationId,
            email: resumeData.email,
          },
        })
      : null

    let candidateId: string

    // Get user for createdById
    const user = await prisma.user.findFirst({
      where: { organizationId },
    })

    if (!user) {
      return {
        success: false,
        error: 'No user found for organization',
      }
    }

    if (existingCandidate) {
      candidateId = existingCandidate.id

      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          firstName: resumeData.firstName || existingCandidate.firstName,
          lastName: resumeData.lastName || existingCandidate.lastName,
          currentTitle: resumeData.currentTitle || existingCandidate.currentTitle,
          rawResumeText: JSON.stringify(resumeData),
          updatedAt: new Date(),
        },
      })
    } else {
      const candidate = await prisma.candidate.create({
        data: {
          organizationId,
          email: resumeData.email || `${Date.now()}@unknown.com`,
          firstName: resumeData.firstName || '',
          lastName: resumeData.lastName || '',
          currentTitle: resumeData.currentTitle || null,
          rawResumeText: JSON.stringify(resumeData),
          status: 'NEW',
          source: 'UPLOAD',
          createdById: user.id,
        },
      })

      candidateId = candidate.id
    }

    // Step 4: Score against requirement(s)
    let requirementsToScore: string[] = []

    if (requirementId) {
      requirementsToScore = [requirementId]
    } else {
      const requirements = await prisma.requirement.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
        },
        select: { id: true },
      })
      requirementsToScore = requirements.map((r) => r.id)
    }

    const scores: ScoringResult[] = []

    for (const reqId of requirementsToScore) {
      const score = await calculateHiringScore({
        candidateId,
        requirementId: reqId,
      })
      if (score) scores.push(score)
    }

    return {
      success: true,
      candidateId,
      scoreId: scores[0]?.requirementId,
      result: scores[0],
    }
  } catch (error) {
    console.error('[ScoringPipeline] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
