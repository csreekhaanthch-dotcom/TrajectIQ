// ============================================
// Experience Relevance Ratio (ERR) Calculator
// ============================================
// Measures how relevant the candidate's experience is:
// - Industry match
// - Role similarity
// - Technology alignment
// - Domain expertise

import type { ResumeExperience, ResumeProject, Skill } from '@/types';
import type { ERRBreakdown, ScoreFactor } from './types';
import { normalizeSkill } from './types';

// ============================================
// Industry Keywords
// ============================================

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  fintech: ['payment', 'banking', 'finance', 'trading', 'crypto', 'investment', 'credit', 'loan', 'insurance', 'risk'],
  healthcare: ['medical', 'health', 'patient', 'hospital', 'pharma', 'clinical', 'diagnostic', 'telehealth', 'ehr'],
  ecommerce: ['retail', 'marketplace', 'cart', 'checkout', 'inventory', 'order', 'shipping', 'product catalog'],
  saas: ['subscription', 'b2b', 'enterprise', 'multi-tenant', 'onboarding', 'billing', 'account management'],
  ai_ml: ['machine learning', 'ml', 'ai', 'nlp', 'computer vision', 'neural', 'deep learning', 'model', 'training'],
  devtools: ['developer tool', 'api', 'sdk', 'ide', 'cli', 'framework', 'library', 'documentation'],
  gaming: ['game', 'gaming', 'unity', 'unreal', 'player', 'multiplayer', 'real-time', 'physics'],
  security: ['security', 'cybersecurity', 'encryption', 'authentication', 'compliance', 'audit', 'vulnerability'],
  logistics: ['supply chain', 'warehouse', 'delivery', 'fleet', 'routing', 'logistics', 'shipping', 'inventory'],
  education: ['education', 'learning', 'lms', 'student', 'course', 'curriculum', 'training', 'edtech'],
};

// ============================================
// Role Keywords
// ============================================

const ROLE_KEYWORDS: Record<string, string[]> = {
  frontend: ['react', 'vue', 'angular', 'javascript', 'typescript', 'css', 'html', 'ui', 'ux', 'responsive', 'spa'],
  backend: ['api', 'server', 'database', 'microservice', 'rest', 'graphql', 'node', 'python', 'java', 'go'],
  fullstack: ['full stack', 'fullstack', 'frontend', 'backend', 'end-to-end', 'full-cycle'],
  devops: ['ci/cd', 'kubernetes', 'docker', 'terraform', 'aws', 'infrastructure', 'deployment', 'monitoring'],
  data: ['data', 'analytics', 'etl', 'pipeline', 'warehouse', 'bi', 'visualization', 'sql', 'python'],
  mobile: ['mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin', 'app store'],
  ml_engineer: ['machine learning', 'model', 'training', 'inference', 'mlops', 'feature engineering', 'tensorflow', 'pytorch'],
  security: ['security', 'penetration', 'vulnerability', 'encryption', 'compliance', 'audit', 'siem'],
};

// ============================================
// ERR Calculator
// ============================================

export function calculateERR(
  experience: ResumeExperience[],
  projects: ResumeProject[] | null,
  requiredSkills: Skill[]
): { score: number; breakdown: ERRBreakdown } {
  const factors: ScoreFactor[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // 1. Technology Alignment (0-30 points)
  const techAlignmentResult = calculateTechnologyAlignment(experience, requiredSkills);
  factors.push(techAlignmentResult.factor);
  
  if (techAlignmentResult.factor.score >= 24) {
    strengths.push('Strong technology stack alignment');
  } else if (techAlignmentResult.factor.score < 12) {
    weaknesses.push('Limited alignment with required technologies');
  }
  
  // 2. Industry Relevance (0-25 points)
  const industryResult = calculateIndustryRelevance(experience, projects, requiredSkills);
  factors.push(industryResult.factor);
  
  if (industryResult.factor.score >= 20) {
    strengths.push('Relevant industry experience');
  }
  
  // 3. Role Similarity (0-25 points)
  const roleResult = calculateRoleSimilarity(experience, requiredSkills);
  factors.push(roleResult.factor);
  
  if (roleResult.factor.score >= 20) {
    strengths.push('Direct role experience');
  } else if (roleResult.factor.score < 10) {
    weaknesses.push('Limited experience in similar roles');
  }
  
  // 4. Years of Relevant Experience (0-20 points)
  const yearsResult = calculateYearsRelevance(experience, requiredSkills);
  factors.push(yearsResult.factor);
  
  // Calculate raw score
  const rawScore = factors.reduce((sum, f) => sum + f.score, 0);
  
  // Normalize to 0-100
  const normalizedScore = Math.min(100, Math.max(0, rawScore));
  
  // Calculate relevance ratio
  const totalYears = calculateTotalYears(experience);
  const relevantYears = yearsResult.relevantYears;
  const relevanceRatio = totalYears > 0 ? relevantYears / totalYears : 0;
  
  const breakdown: ERRBreakdown = {
    factors,
    strengths,
    weaknesses,
    rawScore,
    normalizedScore,
    relevantYears,
    totalYears,
    relevanceRatio: Math.round(relevanceRatio * 100) / 100,
    industryMatch: industryResult.factor.score >= 15,
  };
  
  return { score: normalizedScore, breakdown };
}

// ============================================
// Helper Functions
// ============================================

function calculateTechnologyAlignment(
  experience: ResumeExperience[],
  requiredSkills: Skill[]
): { factor: ScoreFactor } {
  if (requiredSkills.length === 0) {
    return {
      factor: {
        name: 'Technology Alignment',
        value: 100,
        max: 100,
        score: 25,
        description: 'No specific technology requirements',
      },
    };
  }
  
  const requiredTechNames = requiredSkills.map(s => normalizeSkill(s.name));
  
  let matchCount = 0;
  let totalMentions = 0;
  
  experience.forEach(exp => {
    exp.technologies.forEach(tech => {
      const normalized = normalizeSkill(tech);
      totalMentions++;
      
      if (requiredTechNames.some(req => 
        normalized === req || normalized.includes(req) || req.includes(normalized)
      )) {
        matchCount++;
      }
    });
  });
  
  // Calculate alignment percentage
  const alignmentPercentage = totalMentions > 0 
    ? (matchCount / totalMentions) * 100 
    : 0;
  
  // Score calculation (max 30)
  const score = Math.min(30, alignmentPercentage * 0.3);
  
  return {
    factor: {
      name: 'Technology Alignment',
      value: Math.round(alignmentPercentage),
      max: 100,
      score,
      description: 'Alignment between experience technologies and requirements',
    },
  };
}

function calculateIndustryRelevance(
  experience: ResumeExperience[],
  projects: ResumeProject[] | null,
  requiredSkills: Skill[]
): { factor: ScoreFactor } {
  // Determine likely industry from requirements
  const requiredText = requiredSkills.map(s => s.name).join(' ').toLowerCase();
  const detectedIndustries: string[] = [];
  
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (keywords.some(kw => requiredText.includes(kw))) {
      detectedIndustries.push(industry);
    }
  }
  
  if (detectedIndustries.length === 0) {
    // No specific industry detected, give moderate score
    return {
      factor: {
        name: 'Industry Relevance',
        value: 50,
        max: 100,
        score: 15,
        description: 'No specific industry requirements detected',
      },
    };
  }
  
  // Check experience for industry keywords
  const experienceText = experience.map(e => 
    `${e.description || ''} ${e.company} ${e.achievements.join(' ')}`
  ).join(' ').toLowerCase();
  
  const projectsText = projects?.map(p => p.description).join(' ').toLowerCase() || '';
  const allText = experienceText + ' ' + projectsText;
  
  let industryMatchScore = 0;
  
  detectedIndustries.forEach(industry => {
    const keywords = INDUSTRY_KEYWORDS[industry] || [];
    const matchCount = keywords.filter(kw => allText.includes(kw)).length;
    industryMatchScore += Math.min(10, matchCount * 2);
  });
  
  const score = Math.min(25, industryMatchScore);
  
  return {
    factor: {
      name: 'Industry Relevance',
      value: Math.round((score / 25) * 100),
      max: 100,
      score,
      description: 'Experience in relevant industries',
    },
  };
}

function calculateRoleSimilarity(
  experience: ResumeExperience[],
  requiredSkills: Skill[]
): { factor: ScoreFactor } {
  // Determine likely role from requirements
  const requiredText = requiredSkills.map(s => s.name).join(' ').toLowerCase();
  const detectedRoles: string[] = [];
  
  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
    const matchCount = keywords.filter(kw => requiredText.includes(kw)).length;
    if (matchCount >= 2) {
      detectedRoles.push(role);
    }
  }
  
  if (detectedRoles.length === 0) {
    return {
      factor: {
        name: 'Role Similarity',
        value: 50,
        max: 100,
        score: 15,
        description: 'No specific role pattern detected in requirements',
      },
    };
  }
  
  // Check experience titles and descriptions for role match
  let roleMatchScore = 0;
  
  experience.forEach(exp => {
    const titleLower = exp.title.toLowerCase();
    const descLower = (exp.description || '').toLowerCase();
    
    detectedRoles.forEach(role => {
      const keywords = ROLE_KEYWORDS[role] || [];
      
      // Check title
      if (titleLower.includes(role) || titleLower.includes(role.replace('_', ' '))) {
        roleMatchScore += 10;
      }
      
      // Check keywords in description
      const matchCount = keywords.filter(kw => descLower.includes(kw)).length;
      roleMatchScore += Math.min(5, matchCount);
    });
  });
  
  const score = Math.min(25, roleMatchScore);
  
  return {
    factor: {
      name: 'Role Similarity',
      value: Math.round((score / 25) * 100),
      max: 100,
      score,
      description: 'Experience in similar roles',
    },
  };
}

function calculateYearsRelevance(
  experience: ResumeExperience[],
  requiredSkills: Skill[]
): { factor: ScoreFactor; relevantYears: number } {
  const totalYears = calculateTotalYears(experience);
  const requiredTechNames = requiredSkills.map(s => normalizeSkill(s.name));
  
  let relevantYears = 0;
  
  experience.forEach(exp => {
    const years = calculateExperienceYears(exp);
    
    // Check if experience uses required technologies
    const techRelevance = exp.technologies.filter(tech => {
      const normalized = normalizeSkill(tech);
      return requiredTechNames.some(req => 
        normalized === req || normalized.includes(req) || req.includes(normalized)
      );
    }).length;
    
    const expTechCount = exp.technologies.length || 1;
    const relevanceRatio = techRelevance / expTechCount;
    
    relevantYears += years * relevanceRatio;
  });
  
  // Score based on ratio
  const ratio = totalYears > 0 ? relevantYears / totalYears : 0;
  const score = Math.min(20, ratio * 25);
  
  return {
    factor: {
      name: 'Years Relevance',
      value: Math.round(ratio * 100),
      max: 100,
      score,
      description: 'Proportion of experience relevant to requirements',
    },
    relevantYears: Math.round(relevantYears * 10) / 10,
  };
}

function calculateTotalYears(experience: ResumeExperience[]): number {
  return experience.reduce((total, exp) => {
    return total + calculateExperienceYears(exp);
  }, 0);
}

function calculateExperienceYears(exp: ResumeExperience): number {
  const start = new Date(exp.startDate);
  const end = exp.endDate ? new Date(exp.endDate) : new Date();
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
}

// ============================================
// Relevance Summary Generator
// ============================================

export function generateRelevanceSummary(breakdown: ERRBreakdown): string {
  const parts: string[] = [];
  
  if (breakdown.totalYears > 0) {
    parts.push(`${breakdown.relevantYears.toFixed(1)} of ${breakdown.totalYears.toFixed(1)} years relevant`);
  }
  
  parts.push(`${Math.round(breakdown.relevanceRatio * 100)}% relevance ratio`);
  
  if (breakdown.industryMatch) {
    parts.push('industry match');
  }
  
  return parts.join(', ');
}
