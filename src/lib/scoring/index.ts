// ============================================
// TrajectIQ Scoring Engine - Main Entry Point
// ============================================
// The Hiring Intelligence Core that produces
// deterministic, explainable hiring scores.

import type {
  ResumeSkill,
  ResumeExperience,
  ResumeEducation,
  ResumeProject,
  Skill,
  Grade,
  Recommendation,
  Score,
} from '@/types';

import { calculateSDI } from './sdi';
import { calculateCSIG, analyzeSkillGaps } from './csig';
import { calculateIAE } from './iae';
import { calculateCTA } from './cta';
import { calculateERR } from './err';

import type { ScoringInput, ScoringResult, ScoringWeights } from './types';
import {
  DEFAULT_WEIGHTS,
  scoreToGrade,
  scoreToTier,
  getRecommendation,
} from './types';

// ============================================
// Main Scoring Function
// ============================================

export async function calculateHiringScore(
  input: ScoringInput
): Promise<ScoringResult> {
  const weights = input.weights || DEFAULT_WEIGHTS;
  
  // 1. Calculate SDI (Skill Depth Index)
  const sdiResult = calculateSDI(
    input.skills,
    input.requiredSkills,
    input.experience,
    input.projects
  );
  
  // 2. Calculate CSIG (Critical Skill Integrity Gate)
  const csigResult = calculateCSIG(input.skills, input.requiredSkills);
  
  // 3. Calculate IAE (Impact Authenticity Engine)
  const iaeResult = calculateIAE(input.experience, input.projects, input.summary);
  
  // 4. Calculate CTA (Career Trajectory Analyzer)
  const ctaResult = calculateCTA(input.experience, input.education);
  
  // 5. Calculate ERR (Experience Relevance Ratio)
  const errResult = calculateERR(input.experience, input.projects, input.requiredSkills);
  
  // Calculate weighted scores
  const sdiWeighted = sdiResult.score * weights.sdi;
  const csigWeighted = csigResult.score * weights.csig;
  const iaeWeighted = iaeResult.score * weights.iae;
  const ctaWeighted = ctaResult.score * weights.cta;
  const errWeighted = errResult.score * weights.err;
  
  // Calculate final score
  const finalScore = Math.round(
    sdiWeighted + csigWeighted + iaeWeighted + ctaWeighted + errWeighted
  );
  
  // Determine grade and recommendation
  const grade = scoreToGrade(finalScore);
  const tier = scoreToTier(finalScore);
  const recommendation = getRecommendation(finalScore, csigResult.score);
  
  return {
    candidateId: input.candidateId,
    requirementId: input.requirementId,
    
    // Component scores
    sdi: {
      score: sdiResult.score,
      weight: weights.sdi,
      weightedScore: sdiWeighted,
      breakdown: sdiResult.breakdown,
    },
    csig: {
      score: csigResult.score,
      weight: weights.csig,
      weightedScore: csigWeighted,
      breakdown: csigResult.breakdown,
    },
    iae: {
      score: iaeResult.score,
      weight: weights.iae,
      weightedScore: iaeWeighted,
      breakdown: iaeResult.breakdown,
    },
    cta: {
      score: ctaResult.score,
      weight: weights.cta,
      weightedScore: ctaWeighted,
      breakdown: ctaResult.breakdown,
    },
    err: {
      score: errResult.score,
      weight: weights.err,
      weightedScore: errWeighted,
      breakdown: errResult.breakdown,
    },
    
    // Final result
    finalScore,
    grade,
    tier,
    recommendation,
    
    // Metadata
    scoringVersion: '1.0.0',
    timestamp: new Date(),
  };
}

// ============================================
// Batch Scoring Function
// ============================================

export async function batchCalculateScores(
  candidates: ScoringInput[]
): Promise<ScoringResult[]> {
  return Promise.all(candidates.map(calculateHiringScore));
}

// ============================================
// Ranking Function
// ============================================

export interface RankedCandidate {
  candidateId: string;
  score: ScoringResult;
  rank: number;
}

export function rankCandidates(scores: ScoringResult[]): RankedCandidate[] {
  return scores
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((score, index) => ({
      candidateId: score.candidateId,
      score,
      rank: index + 1,
    }));
}

// ============================================
// Explainability Functions
// ============================================

export function generateScoreExplanation(result: ScoringResult): string {
  const parts: string[] = [];
  
  // Overall assessment
  parts.push(`## Hiring Score: ${result.finalScore}/100 (${result.grade})`);
  parts.push(`**Recommendation:** ${formatRecommendation(result.recommendation)}`);
  parts.push(`**Tier:** ${result.tier}`);
  parts.push('');
  
  // Component breakdown
  parts.push('### Score Components');
  parts.push('');
  parts.push(`**Skill Depth Index (${Math.round(result.sdi.weight * 100)}% weight):** ${Math.round(result.sdi.score)}/100`);
  parts.push(`Contribution: ${Math.round(result.sdi.weightedScore)} points`);
  parts.push('');
  
  parts.push(`**Critical Skill Integrity (${Math.round(result.csig.weight * 100)}% weight):** ${Math.round(result.csig.score)}/100`);
  parts.push(`Contribution: ${Math.round(result.csig.weightedScore)} points`);
  parts.push('');
  
  parts.push(`**Impact Authenticity (${Math.round(result.iae.weight * 100)}% weight):** ${Math.round(result.iae.score)}/100`);
  parts.push(`Contribution: ${Math.round(result.iae.weightedScore)} points`);
  parts.push('');
  
  parts.push(`**Career Trajectory (${Math.round(result.cta.weight * 100)}% weight):** ${Math.round(result.cta.score)}/100`);
  parts.push(`Contribution: ${Math.round(result.cta.weightedScore)} points`);
  parts.push('');
  
  parts.push(`**Experience Relevance (${Math.round(result.err.weight * 100)}% weight):** ${Math.round(result.err.score)}/100`);
  parts.push(`Contribution: ${Math.round(result.err.weightedScore)} points`);
  parts.push('');
  
  // Strengths
  const allStrengths = [
    ...result.sdi.breakdown.strengths,
    ...result.csig.breakdown.strengths,
    ...result.iae.breakdown.strengths,
    ...result.cta.breakdown.strengths,
    ...result.err.breakdown.strengths,
  ];
  
  if (allStrengths.length > 0) {
    parts.push('### Key Strengths');
    allStrengths.slice(0, 5).forEach(s => parts.push(`- ${s}`));
    parts.push('');
  }
  
  // Weaknesses
  const allWeaknesses = [
    ...result.sdi.breakdown.weaknesses,
    ...result.csig.breakdown.weaknesses,
    ...result.iae.breakdown.weaknesses,
    ...result.cta.breakdown.weaknesses,
    ...result.err.breakdown.weaknesses,
  ];
  
  if (allWeaknesses.length > 0) {
    parts.push('### Areas of Concern');
    allWeaknesses.slice(0, 5).forEach(w => parts.push(`- ${w}`));
    parts.push('');
  }
  
  return parts.join('\n');
}

export function generateComparisonReport(
  results: ScoringResult[]
): string {
  const parts: string[] = [];
  
  parts.push('# Candidate Comparison Report');
  parts.push('');
  
  const ranked = rankCandidates(results);
  
  // Summary table
  parts.push('## Ranking Summary');
  parts.push('');
  parts.push('| Rank | Candidate | Score | Grade | Recommendation |');
  parts.push('|------|-----------|-------|-------|----------------|');
  
  ranked.forEach(({ candidateId, score, rank }) => {
    parts.push(`| ${rank} | ${candidateId.slice(0, 8)}... | ${score.finalScore} | ${score.grade} | ${formatRecommendation(score.recommendation)} |`);
  });
  
  parts.push('');
  
  // Detailed comparison
  parts.push('## Component Comparison');
  parts.push('');
  parts.push('| Candidate | SDI | CSIG | IAE | CTA | ERR |');
  parts.push('|-----------|-----|------|-----|-----|-----|');
  
  ranked.forEach(({ candidateId, score }) => {
    parts.push(`| ${candidateId.slice(0, 8)}... | ${Math.round(score.sdi.score)} | ${Math.round(score.csig.score)} | ${Math.round(score.iae.score)} | ${Math.round(score.cta.score)} | ${Math.round(score.err.score)} |`);
  });
  
  return parts.join('\n');
}

// ============================================
// Helper Functions
// ============================================

function formatRecommendation(rec: Recommendation): string {
  return rec
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================
// Export Types
// ============================================

export type { ScoringInput, ScoringResult, ScoringWeights };
export { DEFAULT_WEIGHTS };
export { analyzeSkillGaps } from './csig';
export { generateImpactSummary } from './iae';
export { generateCareerSummary } from './cta';
export { generateRelevanceSummary } from './err';
