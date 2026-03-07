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
  'javascript': ['js', 'ecmascript', 'node.js', 'nodejs'],
  'typescript': ['ts', 'tsx'],
  'python': ['py'],
  'java': ['jvm', 'jdk'],
  'c++': ['cpp', 'c plus plus'],
  'c#': ['csharp', 'c sharp', '.net'],
  'go': ['golang'],
  'rust': ['rustlang'],
  'ruby': ['rb'],
  'php': ['php8'],
  
  // Frameworks
  'react': ['react.js', 'reactjs', 'reactjs'],
  'vue': ['vue.js', 'vuejs'],
  'angular': ['angularjs', 'angular 2+'],
  'next.js': ['nextjs', 'next'],
  'node.js': ['nodejs', 'node', 'express'],
  'django': ['django rest framework', 'drf'],
  'flask': ['flask-restful'],
  'spring': ['spring boot', 'springboot'],
  'fastapi': ['fast-api'],
  
  // Cloud Platforms
  'aws': ['amazon web services', 'amazon aws'],
  'gcp': ['google cloud platform', 'google cloud', 'gke'],
  'azure': ['microsoft azure'],
  'kubernetes': ['k8s', 'k8s orchestration'],
  'docker': ['containerization', 'containers'],
  
  // Databases
  'postgresql': ['postgres', 'psql'],
  'mysql': ['mariadb'],
  'mongodb': ['mongo'],
  'redis': ['redis cache'],
  'elasticsearch': ['elastic', 'es'],
  
  // Tools
  'git': ['github', 'gitlab', 'bitbucket'],
  'ci/cd': ['cicd', 'continuous integration', 'continuous deployment'],
  'jenkins': ['ci'],
  'terraform': ['iac', 'infrastructure as code'],
  
  // Soft Skills
  'leadership': ['team lead', 'team leader', 'mentoring', 'mentor'],
  'communication': ['presentation', 'public speaking'],
  'problem solving': ['analytical', 'critical thinking'],
};

export function normalizeSkill(skill: string): string {
  const normalized = skill.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  
  // Check if it's a known synonym
  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (normalized === canonical || synonyms.some(s => normalized.includes(s))) {
      return canonical;
    }
  }
  
  return normalized;
}

export function skillsMatch(
  candidateSkill: string, 
  requiredSkill: string
): 'exact' | 'partial' | 'related' | 'none' {
  const cNormalized = normalizeSkill(candidateSkill);
  const rNormalized = normalizeSkill(requiredSkill);
  
  if (cNormalized === rNormalized) return 'exact';
  
  // Check if one contains the other
  if (cNormalized.includes(rNormalized) || rNormalized.includes(cNormalized)) {
    return 'partial';
  }
  
  // Check for synonym match
  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    const cMatch = cNormalized === canonical || synonyms.some(s => cNormalized.includes(s));
    const rMatch = rNormalized === canonical || synonyms.some(s => rNormalized.includes(s));
    
    if (cMatch && rMatch) return 'exact';
    if (cMatch || rMatch) return 'related';
  }
  
  return 'none';
}
