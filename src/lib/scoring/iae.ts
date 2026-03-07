// ============================================
// Impact Authenticity Engine (IAE) Calculator
// ============================================
// Measures real-world impact through:
// - Quantifiable achievements
// - Scale of systems built
// - Leadership responsibility
// - Product impact

import type { ResumeExperience, ResumeProject } from '@/types';
import type { IAEBreakdown, ScoreFactor, ImpactSignal } from './types';

// ============================================
// Impact Patterns
// ============================================

// Patterns for detecting quantifiable achievements
const QUANTIFIABLE_PATTERNS = [
  /(\d+)%\s*(increase|decrease|improvement|reduction)/gi,
  /\$(\d+[kmb]?)\s*(revenue|cost|savings|budget)/gi,
  /(\d+[kmb]?)\s*(users|customers|clients|transactions)/gi,
  /(\d+x)\s*(faster|slower|improvement)/gi,
  /saved\s*(\d+)\s*(hours|days|weeks)/gi,
  /reduced\s*(\w+)\s*by\s*(\d+%)/gi,
  /increased\s*(\w+)\s*by\s*(\d+%)/gi,
  /improved\s*(\w+)\s*by\s*(\d+%)/gi,
];

// Patterns for leadership signals
const LEADERSHIP_PATTERNS = [
  /\b(lead|led|leading)\s*(team|engineer|developer|project)/gi,
  /\b(manager|managerial|management)\b/gi,
  /\b(mentor|mentoring|mentored)\b/gi,
  /\b(supervis|supervisor)\b/gi,
  /\b(director|directed)\b/gi,
  /\b(head of|heading)\b/gi,
  /\b(principal|staff)\s*(engineer|developer)/gi,
  /\b(architect|architected)\b/gi,
];

// Patterns for scale indicators
const SCALE_PATTERNS = [
  /(\d+[mb]?)\s*(users|customers|requests|transactions)\s*(per|daily|monthly|yearly)?/gi,
  /(microservice|distributed)\s*(architecture|system)/gi,
  /(high|massive|large)\s*(scale|volume|traffic)/gi,
  /(enterprise|global)\s*(level|scale|system)/gi,
  /(concurrent|parallel)\s*(users|connections|requests)/gi,
  /(load\s*balanc)/gi,
  /(auto\s*scal)/gi,
];

// Patterns for innovation signals
const INNOVATION_PATTERNS = [
  /\b(innovat|pioneer|groundbreaking)\b/gi,
  /\b(patent|patented)\b/gi,
  /\b(invented|invention)\b/gi,
  /\b(from scratch|from the ground up)\b/gi,
  /\b(revolution|revolutionary)\b/gi,
  /\b(proof of concept|poc)\b/gi,
  /\b(r&d|research)\b/gi,
];

// ============================================
// IAE Calculator
// ============================================

export function calculateIAE(
  experience: ResumeExperience[],
  projects: ResumeProject[] | null,
  summary: string | null
): { score: number; breakdown: IAEBreakdown; signals: ImpactSignal[] } {
  const factors: ScoreFactor[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const signals: ImpactSignal[] = [];
  
  // Combine all text for analysis
  const allText = getAllText(experience, projects, summary);
  
  // 1. Quantifiable Achievements (0-25 points)
  const quantResult = analyzeQuantifiableAchievements(allText);
  factors.push(quantResult.factor);
  signals.push(...quantResult.signals);
  
  if (quantResult.factor.score >= 18) {
    strengths.push('Strong track record of measurable achievements');
  } else if (quantResult.factor.score < 8) {
    weaknesses.push('Limited quantifiable achievements demonstrated');
  }
  
  // 2. Leadership Signals (0-25 points)
  const leadershipResult = analyzeLeadership(allText, experience);
  factors.push(leadershipResult.factor);
  signals.push(...leadershipResult.signals);
  
  if (leadershipResult.factor.score >= 18) {
    strengths.push('Demonstrated leadership experience');
  } else if (leadershipResult.factor.score < 8) {
    weaknesses.push('Limited leadership experience shown');
  }
  
  // 3. Scale Indicators (0-25 points)
  const scaleResult = analyzeScale(allText, experience);
  factors.push(scaleResult.factor);
  signals.push(...scaleResult.signals);
  
  if (scaleResult.factor.score >= 18) {
    strengths.push('Experience with large-scale systems');
  } else if (scaleResult.factor.score < 8) {
    weaknesses.push('Limited exposure to high-scale environments');
  }
  
  // 4. Innovation & Ownership (0-25 points)
  const innovationResult = analyzeInnovation(allText, projects);
  factors.push(innovationResult.factor);
  signals.push(...innovationResult.signals);
  
  if (innovationResult.factor.score >= 18) {
    strengths.push('Demonstrates innovation and ownership');
  }
  
  // Calculate raw score
  const rawScore = factors.reduce((sum, f) => sum + f.score, 0);
  
  // Normalize to 0-100
  const normalizedScore = Math.min(100, Math.max(0, rawScore));
  
  const breakdown: IAEBreakdown = {
    factors,
    strengths,
    weaknesses,
    rawScore,
    normalizedScore,
    quantifiableAchievements: quantResult.factor.score,
    leadershipSignals: leadershipResult.factor.score,
    scaleIndicators: scaleResult.factor.score,
    impactScore: innovationResult.factor.score,
  };
  
  return { score: normalizedScore, breakdown, signals };
}

// ============================================
// Helper Functions
// ============================================

function getAllText(
  experience: ResumeExperience[],
  projects: ResumeProject[] | null,
  summary: string | null
): string {
  const parts: string[] = [];
  
  if (summary) {
    parts.push(summary);
  }
  
  experience.forEach(exp => {
    parts.push(exp.description || '');
    parts.push(...exp.achievements);
  });
  
  if (projects) {
    projects.forEach(proj => {
      parts.push(proj.description);
    });
  }
  
  return parts.join(' ');
}

function analyzeQuantifiableAchievements(text: string): {
  factor: ScoreFactor;
  signals: ImpactSignal[];
} {
  const signals: ImpactSignal[] = [];
  let matchCount = 0;
  
  QUANTIFIABLE_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        matchCount++;
        signals.push({
          type: 'quantifiable',
          text: match,
          context: extractContext(text, match),
          weight: 5,
        });
      });
    }
  });
  
  // Score calculation (max 25)
  // First 3 matches = 5 points each, additional = 2 points each
  const baseScore = Math.min(15, matchCount * 5);
  const bonusScore = Math.max(0, matchCount - 3) * 2;
  const score = Math.min(25, baseScore + bonusScore);
  
  return {
    factor: {
      name: 'Quantifiable Achievements',
      value: matchCount,
      max: 10,
      score,
      description: 'Number of measurable achievements with metrics',
    },
    signals,
  };
}

function analyzeLeadership(
  text: string,
  experience: ResumeExperience[]
): {
  factor: ScoreFactor;
  signals: ImpactSignal[];
} {
  const signals: ImpactSignal[] = [];
  let leadershipScore = 0;
  
  // Check for leadership patterns in text
  LEADERSHIP_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      leadershipScore += matches.length * 3;
      matches.slice(0, 3).forEach(match => {
        signals.push({
          type: 'leadership',
          text: match,
          context: extractContext(text, match),
          weight: 3,
        });
      });
    }
  });
  
  // Check experience titles for leadership roles
  experience.forEach(exp => {
    const title = exp.title.toLowerCase();
    if (title.includes('lead') || title.includes('manager') || title.includes('director')) {
      leadershipScore += 8;
      signals.push({
        type: 'leadership',
        text: exp.title,
        context: `Role at ${exp.company}`,
        weight: 8,
      });
    } else if (title.includes('senior') || title.includes('staff') || title.includes('principal')) {
      leadershipScore += 4;
    }
  });
  
  const score = Math.min(25, leadershipScore);
  
  return {
    factor: {
      name: 'Leadership Signals',
      value: Math.round(leadershipScore / 3),
      max: 8,
      score,
      description: 'Evidence of leadership and mentoring experience',
    },
    signals,
  };
}

function analyzeScale(
  text: string,
  experience: ResumeExperience[]
): {
  factor: ScoreFactor;
  signals: ImpactSignal[];
} {
  const signals: ImpactSignal[] = [];
  let scaleScore = 0;
  
  // Check for scale patterns
  SCALE_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      scaleScore += matches.length * 4;
      matches.slice(0, 3).forEach(match => {
        signals.push({
          type: 'scale',
          text: match,
          context: extractContext(text, match),
          weight: 4,
        });
      });
    }
  });
  
  // Bonus for specific scale numbers
  const millionMatch = text.match(/(\d+)\s*million/i);
  const billionMatch = text.match(/(\d+)\s*billion/i);
  const mUsersMatch = text.match(/(\d+)[m]\s*users/i);
  
  if (billionMatch) {
    scaleScore += 10;
    signals.push({
      type: 'scale',
      text: `${billionMatch[0]} operations`,
      context: 'Billion-scale operations',
      weight: 10,
    });
  }
  
  if (millionMatch || mUsersMatch) {
    scaleScore += 6;
  }
  
  const score = Math.min(25, scaleScore);
  
  return {
    factor: {
      name: 'Scale Indicators',
      value: Math.round(scaleScore / 4),
      max: 6,
      score,
      description: 'Experience with high-scale systems and operations',
    },
    signals,
  };
}

function analyzeInnovation(
  text: string,
  projects: ResumeProject[] | null
): {
  factor: ScoreFactor;
  signals: ImpactSignal[];
} {
  const signals: ImpactSignal[] = [];
  let innovationScore = 0;
  
  // Check for innovation patterns
  INNOVATION_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      innovationScore += matches.length * 4;
      matches.slice(0, 3).forEach(match => {
        signals.push({
          type: 'innovation',
          text: match,
          context: extractContext(text, match),
          weight: 4,
        });
      });
    }
  });
  
  // Bonus for project ownership
  if (projects && projects.length > 0) {
    innovationScore += Math.min(8, projects.length * 2);
    
    projects.forEach(proj => {
      if (proj.role && (proj.role.toLowerCase().includes('lead') || proj.role.toLowerCase().includes('owner'))) {
        signals.push({
          type: 'ownership',
          text: proj.name,
          context: `Role: ${proj.role}`,
          weight: 4,
        });
      }
    });
  }
  
  const score = Math.min(25, innovationScore);
  
  return {
    factor: {
      name: 'Innovation & Ownership',
      value: Math.round(innovationScore / 4),
      max: 6,
      score,
      description: 'Evidence of innovation and project ownership',
    },
    signals,
  };
}

function extractContext(text: string, match: string): string {
  const index = text.toLowerCase().indexOf(match.toLowerCase());
  if (index === -1) return match;
  
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + match.length + 30);
  
  let context = text.slice(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context.trim();
}

// ============================================
// Impact Summary Generator
// ============================================

export function generateImpactSummary(signals: ImpactSignal[]): string {
  const categories: Record<string, string[]> = {
    quantifiable: [],
    leadership: [],
    scale: [],
    innovation: [],
    ownership: [],
  };
  
  signals.forEach(signal => {
    if (categories[signal.type]) {
      categories[signal.type].push(signal.text);
    }
  });
  
  const parts: string[] = [];
  
  if (categories.quantifiable.length > 0) {
    parts.push(`${categories.quantifiable.length} quantifiable achievements`);
  }
  
  if (categories.leadership.length > 0) {
    parts.push(`${categories.leadership.length} leadership indicators`);
  }
  
  if (categories.scale.length > 0) {
    parts.push(`experience at scale`);
  }
  
  if (categories.innovation.length > 0 || categories.ownership.length > 0) {
    parts.push(`demonstrated innovation`);
  }
  
  if (parts.length === 0) {
    return 'Limited impact signals detected';
  }
  
  return `Candidate shows ${parts.join(', ')}`;
}
