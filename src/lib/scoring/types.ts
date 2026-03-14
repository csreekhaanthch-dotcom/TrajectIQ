// ============================================
// Scoring Engine Types
// ============================================

import type { 
  ResumeSkill, 
  ResumeExperience, 
  ResumeEducation, 
  ResumeProject,
  Skill,
  Grade,
  Recommendation
} from '@/types';

// ============================================
// Input Types
// ============================================

export interface ScoringInput {
  candidateId: string;
  requirementId: string;
  
  // Candidate data
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[] | null;
  summary: string | null;
  
  // Requirement data
  requiredSkills: Skill[];
  preferredSkills: Skill[];
  experienceRequired: number;
  experiencePreferred: number | null;
  
  // Weights (customizable per requirement)
  weights: ScoringWeights;
}

export interface ScoringWeights {
  sdi: number; // Skill Depth Index
  csig: number; // Critical Skill Integrity Gate
  iae: number; // Impact Authenticity Engine
  cta: number; // Career Trajectory Analyzer
  err: number; // Experience Relevance Ratio
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  sdi: 0.40,
  csig: 0.15,
  iae: 0.20,
  cta: 0.15,
  err: 0.10,
};

// ============================================
// Component Score Types
// ============================================

export interface ComponentScore {
  score: number; // 0-100
  weight: number;
  weightedScore: number;
  breakdown: ComponentBreakdown;
}

export interface ComponentBreakdown {
  factors: ScoreFactor[];
  strengths: string[];
  weaknesses: string[];
  rawScore: number;
  normalizedScore: number;
}

export interface ScoreFactor {
  name: string;
  value: number;
  max: number;
  score: number;
  description: string;
}

// ============================================
// SDI Types (Skill Depth Index)
// ============================================

export interface SDIInput {
  skills: ResumeSkill[];
  requiredSkills: Skill[];
  experience: ResumeExperience[];
  projects: ResumeProject[] | null;
}

export interface SDIBreakdown extends ComponentBreakdown {
  technicalDepth: number;
  skillBreadth: number;
  skillRecency: number;
  projectComplexity: number;
}

// ============================================
// CSIG Types (Critical Skill Integrity Gate)
// ============================================

export interface CSIGInput {
  skills: ResumeSkill[];
  requiredSkills: Skill[];
}

export interface CSIGBreakdown extends ComponentBreakdown {
  matchedSkills: string[];
  missingSkills: string[];
  partialMatches: string[];
  matchPercentage: number;
}

// ============================================
// IAE Types (Impact Authenticity Engine)
// ============================================

export interface IAEInput {
  experience: ResumeExperience[];
  projects: ResumeProject[] | null;
  summary: string | null;
}

export interface IAEBreakdown extends ComponentBreakdown {
  quantifiableAchievements: number;
  leadershipSignals: number;
  scaleIndicators: number;
  impactScore: number;
}

export interface ImpactSignal {
  type: 'quantifiable' | 'leadership' | 'scale' | 'innovation' | 'ownership';
  text: string;
  context: string;
  weight: number;
}

// ============================================
// CTA Types (Career Trajectory Analyzer)
// ============================================

export interface CTAInput {
  experience: ResumeExperience[];
  education: ResumeEducation[];
}

export interface CTABreakdown extends ComponentBreakdown {
  careerProgression: number;
  promotionRate: number;
  tenureStability: number;
  leadershipGrowth: number;
}

export interface CareerMilestone {
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  level: 'junior' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | 'executive';
  isPromotion: boolean;
}

// ============================================
// ERR Types (Experience Relevance Ratio)
// ============================================

export interface ERRInput {
  experience: ResumeExperience[];
  projects: ResumeProject[] | null;
  requiredSkills: Skill[];
}

export interface ERRBreakdown extends ComponentBreakdown {
  relevantYears: number;
  totalYears: number;
  relevanceRatio: number;
  industryMatch: boolean;
}

// ============================================
// Output Types
// ============================================

export interface ScoringResult {
  candidateId: string;
  requirementId: string;
  
  // Component scores
  sdi: ComponentScore;
  csig: ComponentScore;
  iae: ComponentScore;
  cta: ComponentScore;
  err: ComponentScore;
  
  // Final result
  finalScore: number;
  grade: Grade;
  tier: number;
  recommendation: Recommendation;
  
  // Metadata
  scoringVersion: string;
  timestamp: Date;
}

// ============================================
// Grade Mapping
// ============================================

export function scoreToGrade(score: number): Grade {
  if (score >= 95) return 'A_PLUS';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A_MINUS';
  if (score >= 80) return 'B_PLUS';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B_MINUS';
  if (score >= 65) return 'C_PLUS';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C_MINUS';
  if (score >= 50) return 'D_PLUS';
  if (score >= 45) return 'D';
  if (score >= 40) return 'D_MINUS';
  return 'F';
}

export function gradeToNumber(grade: Grade): number {
  const gradeMap: Record<Grade, number> = {
    'A_PLUS': 97,
    'A': 92,
    'A_MINUS': 87,
    'B_PLUS': 82,
    'B': 77,
    'B_MINUS': 72,
    'C_PLUS': 67,
    'C': 62,
    'C_MINUS': 57,
    'D_PLUS': 52,
    'D': 47,
    'D_MINUS': 42,
    'F': 20,
  };
  return gradeMap[grade];
}

export function scoreToTier(score: number): number {
  if (score >= 85) return 1; // Tier 1: Strong hire
  if (score >= 70) return 2; // Tier 2: Hire
  if (score >= 55) return 3; // Tier 3: Consider
  if (score >= 40) return 4; // Tier 4: Review
  return 5; // Tier 5: Pass
}

export function getRecommendation(score: number, csigScore: number): Recommendation {
  // If critical skills are missing, downgrade recommendation
  if (csigScore < 50) {
    if (score >= 70) return 'WEAK_REVIEW';
    return 'PASS';
  }
  
  if (score >= 90) return 'STRONG_HIRE';
  if (score >= 80) return 'HIRE';
  if (score >= 70) return 'STRONG_CONSIDER';
  if (score >= 60) return 'CONSIDER';
  if (score >= 50) return 'REVIEW';
  if (score >= 40) return 'WEAK_REVIEW';
  return 'PASS';
}

// ============================================
// Skill Matching Utilities
// ============================================

export const SKILL_SYNONYMS: Record<string, string[]> = {
  // Programming Languages
  'javascript': ['js', 'ecmascript'],
  'typescript': ['ts'],
  'python': ['py'],
  'java': ['jvm', 'jdk'], // NOTE: JavaScript is NOT a synonym for Java
  'c++': ['cpp'],
  'c#': ['csharp'],
  'go': ['golang'],
  'rust': [],
  'ruby': ['rb'],
  'php': [],
  'kotlin': [],
  'swift': [],
  
  // Frameworks
  'react': ['reactjs', 'react.js'],
  'vue': ['vuejs', 'vue.js'],
  'angular': ['angularjs'],
  'next.js': ['nextjs', 'next'],
  'node.js': ['nodejs', 'node'],
  'django': ['drf'],
  'flask': [],
  'spring': ['springboot', 'spring boot'],
  'fastapi': [],
  'express': ['expressjs'],
  
  // Cloud Platforms
  'aws': ['amazon web services'],
  'gcp': ['google cloud platform', 'google cloud'],
  'azure': ['microsoft azure'],
  'kubernetes': ['k8s'],
  'docker': [],
  
  // Databases
  'postgresql': ['postgres', 'psql'],
  'mysql': [],
  'mongodb': ['mongo'],
  'redis': [],
  'elasticsearch': ['elastic'],
  
  // Tools
  'git': [],
  'ci/cd': ['cicd'],
  'jenkins': [],
  'terraform': [],
  
  // Soft Skills
  'leadership': ['team lead'],
  'communication': [],
  'problem solving': ['problem-solving'],
}

// Skills that should NOT be confused with each other
// These are "distinct" skills despite similar names
const DISTINCT_SKILLS: Record<string, string[]> = {
  'java': ['javascript', 'typescript', 'javaScript'],
  'go': ['google', 'golang google', 'good', 'goal', 'going'],
  'c': ['c++', 'c#', 'css', 'csharp'],
  'sql': ['mysql', 'postgresql', 'nosql'],
}

/**
 * Check if a skill is a distinct skill (not to be confused)
 */
function isDistinctSkill(skill: string): boolean {
  const lower = skill.toLowerCase()
  return Object.keys(DISTINCT_SKILLS).includes(lower)
}

/**
 * Check if two skills are distinct (should not match)
 */
function areDistinctSkills(skill1: string, skill2: string): boolean {
  const s1 = skill1.toLowerCase()
  const s2 = skill2.toLowerCase()
  
  // Check if skill2 is in the distinct list for skill1
  if (DISTINCT_SKILLS[s1]?.includes(s2)) return true
  if (DISTINCT_SKILLS[s2]?.includes(s1)) return true
  
  return false
}

/**
 * Normalize a skill name for comparison
 * Removes special characters and handles synonyms
 */
export function normalizeSkill(skill: string): string {
  // First, handle special cases
  const lower = skill.toLowerCase().trim()
  
  // Handle C++, C#, etc.
  if (lower === 'c++' || lower === 'cpp') return 'c++'
  if (lower === 'c#' || lower === 'csharp') return 'c#'
  
  // Handle node.js variants
  if (lower === 'node.js' || lower === 'nodejs' || lower === 'node') return 'node.js'
  
  // Handle next.js variants
  if (lower === 'next.js' || lower === 'nextjs' || lower === 'next') return 'next.js'
  
  // General normalization
  const normalized = lower.replace(/[^a-z0-9+ #]/g, '').trim()
  
  // Check if it's a known synonym
  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (normalized === canonical || synonyms.some(s => normalized === s || normalized === s.replace(/[^a-z0-9]/g, ''))) {
      return canonical
    }
  }
  
  return normalized
}

/**
 * Match two skills with word-boundary awareness
 * Prevents false matches like "Java" matching "JavaScript"
 * 
 * Returns:
 * - 'exact': Skills are exactly the same or known synonyms
 * - 'partial': Skills are related but not exact
 * - 'related': Skills share a category but are different
 * - 'none': No match
 */
export function skillsMatch(
  candidateSkill: string,
  requiredSkill: string
): 'exact' | 'partial' | 'related' | 'none' {
  const cNormalized = normalizeSkill(candidateSkill)
  const rNormalized = normalizeSkill(requiredSkill)
  
  // Check for distinct skills first (prevents Java vs JavaScript false match)
  if (areDistinctSkills(cNormalized, rNormalized)) {
    return 'none'
  }
  
  // Exact match
  if (cNormalized === rNormalized) return 'exact'
  
  // Check for synonym match
  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    const cIsCanonical = cNormalized === canonical
    const cIsSynonym = synonyms.some(s => normalizeSkill(s) === cNormalized)
    const rIsCanonical = rNormalized === canonical
    const rIsSynonym = synonyms.some(s => normalizeSkill(s) === rNormalized)
    
    if ((cIsCanonical || cIsSynonym) && (rIsCanonical || rIsSynonym)) {
      return 'exact'
    }
  }
  
  // Partial match (one is a subset of the other, but NOT distinct)
  // Be careful here - only allow if not in distinct list
  if (!isDistinctSkill(cNormalized) && !isDistinctSkill(rNormalized)) {
    if (cNormalized.includes(rNormalized) || rNormalized.includes(cNormalized)) {
      return 'partial'
    }
  }
  
  return 'none'
}

/**
 * Find the best matching skill from a list
 */
export function findBestSkillMatch(
  skill: string,
  candidateSkills: string[]
): { match: string | null; type: 'exact' | 'partial' | 'related' | 'none' } {
  let bestMatch: string | null = null
  let bestType: 'exact' | 'partial' | 'related' | 'none' = 'none'
  
  const priority = { exact: 4, partial: 3, related: 2, none: 1 }
  
  for (const candidate of candidateSkills) {
    const matchType = skillsMatch(candidate, skill)
    if (priority[matchType] > priority[bestType]) {
      bestMatch = candidate
      bestType = matchType
    }
  }
  
  return { match: bestMatch, type: bestType }
}
