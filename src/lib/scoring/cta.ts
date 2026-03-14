// ============================================
// Career Trajectory Analyzer (CTA) Calculator
// ============================================
// Evaluates career growth patterns:
// - Promotions and advancement
// - Increasing responsibility
// - Leadership roles
// - Project ownership
// - Career stability

import type { ResumeExperience, ResumeEducation } from '@/types';
import type { CTABreakdown, ScoreFactor, CareerMilestone } from './types';

// ============================================
// Title Level Classification
// ============================================

const TITLE_LEVELS: Record<string, number> = {
  // Executive
  'cto': 7,
  'cio': 7,
  'vp': 6,
  'vice president': 6,
  'director': 5,
  
  // Senior Management
  'engineering manager': 5,
  'tech lead': 4,
  'team lead': 4,
  'lead': 4,
  'principal': 4,
  'staff': 4,
  
  // Senior
  'senior': 3,
  'sr': 3,
  
  // Mid-level
  'mid': 2,
  'intermediate': 2,
  
  // Junior
  'junior': 1,
  'jr': 1,
  'entry': 1,
  'associate': 1,
  'intern': 0,
};

// Companies known for high engineering bar
const TOP_COMPANIES = [
  'google', 'meta', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix',
  'uber', 'airbnb', 'stripe', 'square', 'twitter', 'linkedin', 'spotify',
  'snapchat', 'dropbox', 'salesforce', 'adobe', 'nvidia', 'openai', 'anthropic',
];

// ============================================
// CTA Calculator
// ============================================

export function calculateCTA(
  experience: ResumeExperience[],
  education: ResumeEducation[]
): { score: number; breakdown: CTABreakdown; milestones: CareerMilestone[] } {
  const factors: ScoreFactor[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // Sort experience chronologically
  const sortedExperience = sortExperienceChronologically(experience);
  
  // Convert to milestones
  const milestones = convertToMilestones(sortedExperience);
  
  // 1. Career Progression (0-25 points)
  const progressionResult = calculateCareerProgression(milestones);
  factors.push(progressionResult.factor);
  
  if (progressionResult.factor.score >= 18) {
    strengths.push('Strong upward career trajectory');
  } else if (progressionResult.factor.score < 10) {
    weaknesses.push('Career progression unclear or stagnant');
  }
  
  // 2. Promotion Rate (0-25 points)
  const promotionResult = calculatePromotionRate(milestones);
  factors.push(promotionResult.factor);
  
  if (promotionResult.count > 0) {
    strengths.push(`${promotionResult.count} detected promotion(s) or advancement(s)`);
  }
  
  // 3. Tenure Stability (0-25 points)
  const tenureResult = calculateTenureStability(experience);
  factors.push(tenureResult.factor);
  
  if (tenureResult.factor.score >= 18) {
    strengths.push('Good tenure stability across roles');
  } else if (tenureResult.factor.score < 10) {
    weaknesses.push('Frequent job changes may indicate instability');
  }
  
  // 4. Leadership Growth (0-25 points)
  const leadershipResult = calculateLeadershipGrowth(milestones);
  factors.push(leadershipResult.factor);
  
  if (leadershipResult.factor.score >= 18) {
    strengths.push('Growing leadership responsibilities');
  } else if (leadershipResult.factor.score >= 12) {
    strengths.push('Some leadership experience');
  }
  
  // Calculate raw score
  const rawScore = factors.reduce((sum, f) => sum + f.score, 0);
  
  // Normalize to 0-100
  const normalizedScore = Math.min(100, Math.max(0, rawScore));
  
  const breakdown: CTABreakdown = {
    factors,
    strengths,
    weaknesses,
    rawScore,
    normalizedScore,
    careerProgression: progressionResult.factor.score,
    promotionRate: promotionResult.factor.score,
    tenureStability: tenureResult.factor.score,
    leadershipGrowth: leadershipResult.factor.score,
  };
  
  return { score: normalizedScore, breakdown, milestones };
}

// ============================================
// Helper Functions
// ============================================

function sortExperienceChronologically(experience: ResumeExperience[]): ResumeExperience[] {
  return [...experience].sort((a, b) => {
    const dateA = new Date(a.startDate);
    const dateB = new Date(b.startDate);
    return dateA.getTime() - dateB.getTime();
  });
}

function convertToMilestones(experience: ResumeExperience[]): CareerMilestone[] {
  return experience.map((exp, index) => {
    const level = determineTitleLevel(exp.title);
    const isPromotion = index > 0 && level > determineTitleLevel(experience[index - 1].title);
    
    return {
      title: exp.title,
      company: exp.company,
      startDate: exp.startDate,
      endDate: exp.endDate,
      level: getLevelName(level),
      isPromotion,
    };
  });
}

function determineTitleLevel(title: string): number {
  const lowerTitle = title.toLowerCase();
  
  for (const [pattern, level] of Object.entries(TITLE_LEVELS)) {
    if (lowerTitle.includes(pattern)) {
      return level;
    }
  }
  
  // Default to mid-level if no pattern matches
  return 2;
}

function getLevelName(level: number): CareerMilestone['level'] {
  if (level >= 6) return 'executive';
  if (level >= 5) return 'director';
  if (level >= 4) return 'manager';
  if (level >= 3) return 'senior';
  if (level >= 2) return 'mid';
  return 'junior';
}

function calculateCareerProgression(milestones: CareerMilestone[]): {
  factor: ScoreFactor;
} {
  if (milestones.length === 0) {
    return {
      factor: {
        name: 'Career Progression',
        value: 0,
        max: 10,
        score: 10, // Default for no experience data
        description: 'No career history to analyze',
      },
    };
  }
  
  // Calculate level progression
  const levels = milestones.map(m => {
    const levelMap = { junior: 1, mid: 2, senior: 3, lead: 4, manager: 5, director: 6, executive: 7 };
    return levelMap[m.level] || 2;
  });
  
  // Check for upward trend
  let upwardMoves = 0;
  let downwardMoves = 0;
  
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1]) upwardMoves++;
    else if (levels[i] < levels[i - 1]) downwardMoves++;
  }
  
  // Score based on progression
  const progressionRatio = milestones.length > 1 
    ? upwardMoves / (milestones.length - 1) 
    : 1;
  
  // Penalty for downward moves
  const penalty = downwardMoves * 3;
  
  const score = Math.min(25, Math.max(0, progressionRatio * 25 - penalty));
  
  return {
    factor: {
      name: 'Career Progression',
      value: Math.round(progressionRatio * 100),
      max: 100,
      score,
      description: 'Upward career trajectory over time',
    },
  };
}

function calculatePromotionRate(milestones: CareerMilestone[]): {
  factor: ScoreFactor;
  count: number;
} {
  const promotions = milestones.filter(m => m.isPromotion).length;
  const totalRoles = milestones.length;
  
  // Calculate promotion rate (promotions per role)
  const rate = totalRoles > 1 ? promotions / (totalRoles - 1) : 0;
  
  // Score based on promotion rate
  // 1 promotion every 2-3 roles is healthy
  const score = Math.min(25, rate * 50);
  
  return {
    factor: {
      name: 'Promotion Rate',
      value: Math.round(rate * 100),
      max: 50,
      score,
      description: 'Rate of promotions or title advancements',
    },
    count: promotions,
  };
}

function calculateTenureStability(experience: ResumeExperience[]): {
  factor: ScoreFactor;
} {
  if (experience.length === 0) {
    return {
      factor: {
        name: 'Tenure Stability',
        value: 0,
        max: 10,
        score: 15, // Default for no data
        description: 'No employment history to analyze',
      },
    };
  }
  
  // Calculate average tenure
  const tenures = experience.map(exp => {
    const start = new Date(exp.startDate);
    const end = exp.endDate ? new Date(exp.endDate) : new Date();
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365); // Years
  });
  
  const avgTenure = tenures.reduce((sum, t) => sum + t, 0) / tenures.length;
  
  // Count short tenures (< 1 year)
  const shortTenures = tenures.filter(t => t < 1).length;
  
  // Score based on average tenure
  // 2-3 years average is ideal, < 1 year is concerning
  let score = 0;
  
  if (avgTenure >= 2) {
    score = 25; // Excellent stability
  } else if (avgTenure >= 1.5) {
    score = 20; // Good stability
  } else if (avgTenure >= 1) {
    score = 15; // Moderate stability
  } else if (avgTenure >= 0.5) {
    score = 10; // Concerning
  } else {
    score = 5; // Very unstable
  }
  
  // Penalty for too many short tenures
  const shortTenurePenalty = shortTenures * 3;
  score = Math.max(0, score - shortTenurePenalty);
  
  return {
    factor: {
      name: 'Tenure Stability',
      value: Math.round(avgTenure * 10) / 10,
      max: 5,
      score,
      description: 'Average length of employment tenures',
    },
  };
}

function calculateLeadershipGrowth(milestones: CareerMilestone[]): {
  factor: ScoreFactor;
} {
  const leadershipLevels = ['manager', 'director', 'executive'];
  
  // Count leadership roles
  const leadershipRoles = milestones.filter(m => 
    leadershipLevels.includes(m.level)
  ).length;
  
  // Check for transition into leadership
  const enteredLeadership = milestones.some((m, i) => {
    if (i === 0) return false;
    return leadershipLevels.includes(m.level) && 
           !leadershipLevels.includes(milestones[i - 1].level);
  });
  
  // Calculate score
  let score = 0;
  
  // Points for leadership roles
  score += Math.min(15, leadershipRoles * 8);
  
  // Bonus for entering leadership
  if (enteredLeadership) {
    score += 10;
  }
  
  // Normalize to max 25
  score = Math.min(25, score);
  
  return {
    factor: {
      name: 'Leadership Growth',
      value: leadershipRoles,
      max: 3,
      score,
      description: 'Progression into leadership positions',
    },
  };
}

// ============================================
// Career Summary Generator
// ============================================

export function generateCareerSummary(milestones: CareerMilestone[]): string {
  if (milestones.length === 0) {
    return 'No career history available';
  }
  
  const companies = [...new Set(milestones.map(m => m.company))];
  const promotions = milestones.filter(m => m.isPromotion).length;
  const currentLevel = milestones[milestones.length - 1]?.level || 'mid';
  
  const parts: string[] = [];
  
  parts.push(`${milestones.length} roles`);
  parts.push(`at ${companies.length} compan${companies.length > 1 ? 'ies' : 'y'}`);
  
  if (promotions > 0) {
    parts.push(`${promotions} promotion${promotions > 1 ? 's' : ''}`);
  }
  
  const levelDisplay = currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1);
  parts.push(`currently at ${levelDisplay} level`);
  
  return parts.join(', ');
}
