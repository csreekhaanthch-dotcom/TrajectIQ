// ============================================
// Critical Skill Integrity Gate (CSIG) Calculator
// ============================================
// Ensures candidates have the required critical skills.
// This is a gatekeeper metric - missing critical skills
// significantly impact the overall score.

import type { ResumeSkill, Skill } from '@/types';
import type { CSIGBreakdown, ScoreFactor } from './types';
import { normalizeSkill, skillsMatch, SKILL_SYNONYMS } from './types';

// ============================================
// Critical Skill Categories
// ============================================

// Skills that are often considered critical/blockers
const CRITICAL_SKILL_PATTERNS = [
  // Programming Languages (often required)
  /\b(python|java|javascript|typescript|go|rust|c\+\+|c#|ruby)\b/i,
  
  // Cloud Platforms
  /\b(aws|azure|gcp|cloud)\b/i,
  
  // Frameworks (job-specific)
  /\b(react|angular|vue|django|spring|node|express)\b/i,
  
  // Databases
  /\b(sql|postgresql|mysql|mongodb|redis|dynamodb)\b/i,
  
  // Tools
  /\b(docker|kubernetes|git|ci\/cd|terraform)\b/i,
];

// ============================================
// CSIG Calculator
// ============================================

export function calculateCSIG(
  skills: ResumeSkill[],
  requiredSkills: Skill[]
): { score: number; breakdown: CSIGBreakdown } {
  const factors: ScoreFactor[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const partialMatches: string[] = [];
  
  // 1. Exact Matches (0-40 points)
  let exactMatches = 0;
  requiredSkills.filter(s => s.required).forEach(required => {
    const normalized = normalizeSkill(required.name);
    
    const matchResult = findBestMatch(normalized, skills);
    
    if (matchResult.type === 'exact') {
      exactMatches++;
      matchedSkills.push(required.name);
    } else if (matchResult.type === 'partial') {
      partialMatches.push(required.name);
    } else {
      missingSkills.push(required.name);
    }
  });
  
  const requiredCount = requiredSkills.filter(s => s.required).length;
  const exactMatchPercentage = requiredCount > 0 ? (exactMatches / requiredCount) * 100 : 100;
  
  factors.push({
    name: 'Exact Skill Matches',
    value: exactMatches,
    max: Math.max(1, requiredCount),
    score: Math.min(40, exactMatchPercentage * 0.4),
    description: 'Number of exactly matched required skills',
  });
  
  // 2. Skill Level Assessment (0-25 points)
  const levelScore = calculateLevelScore(skills, requiredSkills);
  factors.push(levelScore.factor);
  
  // 3. Experience Depth (0-20 points)
  const expScore = calculateExperienceDepth(skills, requiredSkills);
  factors.push(expScore.factor);
  
  // 4. Partial Matches Bonus (0-15 points)
  const partialBonus = partialMatches.length * 5;
  factors.push({
    name: 'Partial Matches',
    value: partialMatches.length,
    max: Math.max(1, requiredCount),
    score: Math.min(15, partialBonus),
    description: 'Skills that are partially matched or related',
  });
  
  // Generate strengths and weaknesses
  if (matchedSkills.length >= requiredCount * 0.8) {
    strengths.push(`Strong coverage of critical skills (${matchedSkills.length}/${requiredCount})`);
  }
  
  if (missingSkills.length > 0) {
    weaknesses.push(`Missing critical skills: ${missingSkills.slice(0, 3).join(', ')}${missingSkills.length > 3 ? '...' : ''}`);
  }
  
  if (levelScore.factor.score >= 20) {
    strengths.push('High proficiency level in matched skills');
  }
  
  // Calculate raw score
  const rawScore = factors.reduce((sum, f) => sum + f.score, 0);
  
  // Apply penalty for missing critical skills
  const missingCriticalCount = countMissingCriticalSkills(requiredSkills, missingSkills);
  const penalty = missingCriticalCount * 15; // 15 points penalty per missing critical skill
  
  const adjustedScore = Math.max(0, rawScore - penalty);
  
  // Normalize to 0-100
  const normalizedScore = Math.min(100, Math.max(0, adjustedScore));
  
  const breakdown: CSIGBreakdown = {
    factors,
    strengths,
    weaknesses,
    rawScore: adjustedScore,
    normalizedScore,
    matchedSkills,
    missingSkills,
    partialMatches,
    matchPercentage: Math.round(exactMatchPercentage),
  };
  
  return { score: normalizedScore, breakdown };
}

// ============================================
// Helper Functions
// ============================================

function findBestMatch(
  requiredSkill: string,
  candidateSkills: ResumeSkill[]
): { type: 'exact' | 'partial' | 'none'; skill?: ResumeSkill } {
  for (const skill of candidateSkills) {
    const matchType = skillsMatch(skill.name, requiredSkill);
    if (matchType === 'exact') {
      return { type: 'exact', skill };
    }
  }
  
  for (const skill of candidateSkills) {
    const matchType = skillsMatch(skill.name, requiredSkill);
    if (matchType === 'partial' || matchType === 'related') {
      return { type: 'partial', skill };
    }
  }
  
  return { type: 'none' };
}

function calculateLevelScore(
  skills: ResumeSkill[],
  requiredSkills: Skill[]
): { factor: ScoreFactor } {
  let totalLevelScore = 0;
  let matchedCount = 0;
  
  requiredSkills.filter(s => s.required).forEach(required => {
    const normalized = normalizeSkill(required.name);
    
    const matchResult = findBestMatch(normalized, skills);
    
    if (matchResult.type === 'exact' && matchResult.skill) {
      const levelValue = matchResult.skill.level;
      const levelScore = levelValue === 'expert' ? 25 :
                         levelValue === 'advanced' ? 20 :
                         levelValue === 'intermediate' ? 15 : 10;
      totalLevelScore += levelScore;
      matchedCount++;
    } else if (matchResult.type === 'partial' && matchResult.skill) {
      const levelValue = matchResult.skill.level;
      const levelScore = levelValue === 'expert' ? 15 :
                         levelValue === 'advanced' ? 12 :
                         levelValue === 'intermediate' ? 8 : 5;
      totalLevelScore += levelScore;
      matchedCount++;
    }
  });
  
  const avgLevelScore = matchedCount > 0 ? totalLevelScore / matchedCount : 0;
  const score = Math.min(25, avgLevelScore);
  
  return {
    factor: {
      name: 'Skill Proficiency Level',
      value: Math.round(avgLevelScore),
      max: 25,
      score,
      description: 'Average proficiency level of matched skills',
    },
  };
}

function calculateExperienceDepth(
  skills: ResumeSkill[],
  requiredSkills: Skill[]
): { factor: ScoreFactor } {
  let totalYears = 0;
  let matchedCount = 0;
  
  requiredSkills.filter(s => s.required).forEach(required => {
    const normalized = normalizeSkill(required.name);
    
    const matchResult = findBestMatch(normalized, skills);
    
    if ((matchResult.type === 'exact' || matchResult.type === 'partial') && matchResult.skill) {
      totalYears += matchResult.skill.yearsOfExperience;
      matchedCount++;
    }
  });
  
  const avgYears = matchedCount > 0 ? totalYears / matchedCount : 0;
  
  // Score based on average years (max 20 points)
  // 5+ years = full points, scales down from there
  const score = Math.min(20, (avgYears / 5) * 20);
  
  return {
    factor: {
      name: 'Experience Depth',
      value: Math.round(avgYears * 10) / 10,
      max: 5,
      score,
      description: 'Average years of experience in required skills',
    },
  };
}

function countMissingCriticalSkills(
  requiredSkills: Skill[],
  missingSkills: string[]
): number {
  let count = 0;
  
  missingSkills.forEach(missing => {
    const normalized = normalizeSkill(missing);
    
    // Check if this is a critical skill pattern
    for (const pattern of CRITICAL_SKILL_PATTERNS) {
      if (pattern.test(missing) || pattern.test(normalized)) {
        count++;
        break;
      }
    }
  });
  
  return count;
}

// ============================================
// Skill Gap Analysis
// ============================================

export interface SkillGap {
  skill: string;
  required: boolean;
  importance: 'critical' | 'high' | 'medium' | 'low';
  recommendations: string[];
}

export function analyzeSkillGaps(
  skills: ResumeSkill[],
  requiredSkills: Skill[]
): SkillGap[] {
  const gaps: SkillGap[] = [];
  
  requiredSkills.forEach(required => {
    const normalized = normalizeSkill(required.name);
    const matchResult = findBestMatch(normalized, skills);
    
    if (matchResult.type === 'none') {
      // Determine importance
      let importance: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      
      for (const pattern of CRITICAL_SKILL_PATTERNS) {
        if (pattern.test(required.name) || pattern.test(normalized)) {
          importance = 'critical';
          break;
        }
      }
      
      if (required.required && importance !== 'critical') {
        importance = 'high';
      } else if (!required.required) {
        importance = 'low';
      }
      
      gaps.push({
        skill: required.name,
        required: required.required,
        importance,
        recommendations: generateRecommendations(required.name, importance),
      });
    }
  });
  
  // Sort by importance
  const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return gaps.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);
}

function generateRecommendations(skill: string, importance: 'critical' | 'high' | 'medium' | 'low'): string[] {
  const recommendations: string[] = [];
  
  if (importance === 'critical') {
    recommendations.push(`Consider candidates with ${skill} experience as primary requirement`);
    recommendations.push(`${skill} is essential for this role - may require training if hired`);
  } else if (importance === 'high') {
    recommendations.push(`${skill} proficiency should be assessed during interview`);
    recommendations.push(`Consider providing ${skill} training during onboarding`);
  } else {
    recommendations.push(`${skill} is a nice-to-have skill`);
  }
  
  // Find related skills the candidate might have
  const synonyms = SKILL_SYNONYMS[skill.toLowerCase()];
  if (synonyms && synonyms.length > 0) {
    recommendations.push(`Related skills that may transfer: ${synonyms.slice(0, 3).join(', ')}`);
  }
  
  return recommendations;
}
