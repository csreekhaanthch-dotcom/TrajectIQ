// ============================================
// Skill Depth Index (SDI) Calculator
// ============================================
// Measures technical depth across multiple dimensions:
// - Programming languages proficiency
// - Framework expertise
// - Cloud platform experience
// - System architecture knowledge
// - Open-source contributions
// - Project complexity

import type { ResumeSkill, ResumeExperience, ResumeProject, Skill } from '@/types';
import type { SDIBreakdown, ScoreFactor } from './types';
import { normalizeSkill } from './types';

// ============================================
// Skill Categories & Weights
// ============================================

const PROGRAMMING_LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl'
];

const FRAMEWORKS = [
  'react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django',
  'flask', 'spring', 'fastapi', 'rails', 'laravel', 'asp.net', 'jquery',
  'svelte', 'ember', 'backbone', 'gatsby', 'nuxt'
];

const CLOUD_PLATFORMS = [
  'aws', 'azure', 'gcp', 'digitalocean', 'heroku', 'vercel', 'netlify',
  'cloudflare', 'linode', 'vultr', 'oracle cloud', 'ibm cloud'
];

const DEVOPS_TOOLS = [
  'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'gitlab ci',
  'github actions', 'circleci', 'travisci', 'argocd', 'helm', 'prometheus',
  'grafana', 'elk', 'datadog'
];

const DATABASES = [
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
  'dynamodb', 'sqlite', 'oracle', 'sql server', 'couchdb', 'neo4j', 'influxdb'
];

const ARCHITECTURE_PATTERNS = [
  'microservices', 'serverless', 'event-driven', 'ddd', 'clean architecture',
  'hexagonal', 'cqrs', 'event sourcing', 'saga', 'api gateway', 'service mesh'
];

// Level to years mapping
const LEVEL_YEARS: Record<string, number> = {
  'beginner': 1,
  'intermediate': 3,
  'advanced': 5,
  'expert': 8,
};

// ============================================
// SDI Calculator
// ============================================

export function calculateSDI(
  skills: ResumeSkill[],
  requiredSkills: Skill[],
  experience: ResumeExperience[],
  projects: ResumeProject[] | null
): { score: number; breakdown: SDIBreakdown } {
  const factors: ScoreFactor[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // 1. Technical Depth (0-25 points)
  const techDepthResult = calculateTechnicalDepth(skills);
  factors.push(techDepthResult.factor);
  if (techDepthResult.factor.score >= 20) {
    strengths.push(`Strong technical depth with ${techDepthResult.count} core technologies`);
  } else if (techDepthResult.factor.score < 10) {
    weaknesses.push('Limited technical depth across core technologies');
  }
  
  // 2. Skill Breadth (0-20 points)
  const breadthResult = calculateSkillBreadth(skills);
  factors.push(breadthResult.factor);
  if (breadthResult.factor.score >= 15) {
    strengths.push(`Diverse skill set spanning ${breadthResult.count} categories`);
  } else if (breadthResult.factor.score < 8) {
    weaknesses.push('Narrow skill focus may limit versatility');
  }
  
  // 3. Skill Recency (0-20 points)
  const recencyResult = calculateSkillRecency(skills, experience);
  factors.push(recencyResult.factor);
  if (recencyResult.factor.score >= 15) {
    strengths.push('Skills are current and actively used');
  } else if (recencyResult.factor.score < 10) {
    weaknesses.push('Some skills may need refreshing');
  }
  
  // 4. Project Complexity (0-20 points)
  const complexityResult = calculateProjectComplexity(projects, experience);
  factors.push(complexityResult.factor);
  if (complexityResult.factor.score >= 15) {
    strengths.push('Experience with complex, multi-component systems');
  } else if (complexityResult.factor.score < 8) {
    weaknesses.push('Limited exposure to complex project architectures');
  }
  
  // 5. Required Skills Coverage (0-15 points)
  const coverageResult = calculateRequiredSkillsCoverage(skills, requiredSkills);
  factors.push(coverageResult.factor);
  if (coverageResult.factor.score >= 12) {
    strengths.push('Excellent coverage of required technical skills');
  } else if (coverageResult.factor.score < 8) {
    weaknesses.push('Some required skills need development');
  }
  
  // Calculate raw score
  const rawScore = factors.reduce((sum, f) => sum + f.score, 0);
  
  // Normalize to 0-100
  const normalizedScore = Math.min(100, Math.max(0, rawScore));
  
  const breakdown: SDIBreakdown = {
    factors,
    strengths,
    weaknesses,
    rawScore,
    normalizedScore,
    technicalDepth: techDepthResult.factor.score,
    skillBreadth: breadthResult.factor.score,
    skillRecency: recencyResult.factor.score,
    projectComplexity: complexityResult.factor.score,
  };
  
  return { score: normalizedScore, breakdown };
}

// ============================================
// Sub-Calculators
// ============================================

function calculateTechnicalDepth(skills: ResumeSkill[]): { factor: ScoreFactor; count: number } {
  // Count skills across technical categories
  const techSkills = skills.filter(s => {
    const normalized = normalizeSkill(s.name);
    return PROGRAMMING_LANGUAGES.includes(normalized) ||
           FRAMEWORKS.includes(normalized) ||
           CLOUD_PLATFORMS.includes(normalized) ||
           DATABASES.includes(normalized);
  });
  
  // Weight by skill level
  const weightedCount = techSkills.reduce((sum, s) => {
    const levelWeight = LEVEL_YEARS[s.level] || 1;
    const yearsBonus = Math.min(s.yearsOfExperience, 10) / 10; // Cap at 10 years
    return sum + (1 + yearsBonus) * (levelWeight / 3);
  }, 0);
  
  // Score calculation (max 25)
  const score = Math.min(25, weightedCount * 2.5);
  
  return {
    factor: {
      name: 'Technical Depth',
      value: weightedCount,
      max: 10,
      score,
      description: 'Depth of expertise in core technologies',
    },
    count: techSkills.length,
  };
}

function calculateSkillBreadth(skills: ResumeSkill[]): { factor: ScoreFactor; count: number } {
  // Count unique skill categories
  const categories = new Set<string>();
  
  skills.forEach(s => {
    const normalized = normalizeSkill(s.name);
    
    if (PROGRAMMING_LANGUAGES.includes(normalized)) categories.add('languages');
    if (FRAMEWORKS.includes(normalized)) categories.add('frameworks');
    if (CLOUD_PLATFORMS.includes(normalized)) categories.add('cloud');
    if (DEVOPS_TOOLS.includes(normalized)) categories.add('devops');
    if (DATABASES.includes(normalized)) categories.add('databases');
    if (ARCHITECTURE_PATTERNS.some(p => normalized.includes(p))) categories.add('architecture');
  });
  
  // Score calculation (max 20)
  const score = Math.min(20, categories.size * 3.5);
  
  return {
    factor: {
      name: 'Skill Breadth',
      value: categories.size,
      max: 6,
      score,
      description: 'Coverage across different technology categories',
    },
    count: categories.size,
  };
}

function calculateSkillRecency(
  skills: ResumeSkill[], 
  experience: ResumeExperience[]
): { factor: ScoreFactor } {
  const currentYear = new Date().getFullYear();
  
  // Calculate average recency score
  let recencyScore = 0;
  let skillCount = 0;
  
  skills.forEach(skill => {
    if (skill.lastUsed) {
      const lastUsedYear = new Date(skill.lastUsed).getFullYear();
      const yearsAgo = currentYear - lastUsedYear;
      
      // Score based on recency (100% for current year, decreasing by 15% per year)
      const recency = Math.max(0, 100 - (yearsAgo * 15));
      recencyScore += recency;
      skillCount++;
    } else {
      // Assume skill is current if no last used date
      recencyScore += 80;
      skillCount++;
    }
  });
  
  // Also check recent experience descriptions for skill usage
  const recentExperience = experience.filter(exp => {
    if (!exp.endDate) return true; // Current role
    const endYear = new Date(exp.endDate).getFullYear();
    return currentYear - endYear <= 1;
  });
  
  // Bonus for recent experience
  const bonus = Math.min(15, recentExperience.length * 5);
  
  // Calculate average and normalize (max 20)
  const avgRecency = skillCount > 0 ? recencyScore / skillCount : 50;
  const score = Math.min(20, (avgRecency / 100) * 15 + bonus);
  
  return {
    factor: {
      name: 'Skill Recency',
      value: Math.round(avgRecency),
      max: 100,
      score,
      description: 'How recently skills have been actively used',
    },
  };
}

function calculateProjectComplexity(
  projects: ResumeProject[] | null,
  experience: ResumeExperience[]
): { factor: ScoreFactor } {
  let complexityScore = 0;
  
  // Analyze projects
  if (projects && projects.length > 0) {
    projects.forEach(project => {
      // Base complexity from number of technologies
      complexityScore += Math.min(5, project.technologies.length);
      
      // Bonus for project descriptions with complexity indicators
      const desc = (project.description || '').toLowerCase();
      if (desc.includes('architecture')) complexityScore += 2;
      if (desc.includes('scale') || desc.includes('million')) complexityScore += 2;
      if (desc.includes('distributed')) complexityScore += 2;
      if (desc.includes('microservice')) complexityScore += 2;
    });
  }
  
  // Analyze experience for complexity signals
  experience.forEach(exp => {
    const desc = (exp.description || '').toLowerCase();
    const achievements = exp.achievements.join(' ').toLowerCase();
    const combined = desc + ' ' + achievements;
    
    // Complexity indicators
    if (combined.includes('architecture') || combined.includes('designed')) complexityScore += 2;
    if (combined.includes('team') && combined.includes('lead')) complexityScore += 2;
    if (combined.includes('scale') || combined.includes('million') || combined.includes('billion')) complexityScore += 2;
    if (combined.includes('migration') || combined.includes('transformation')) complexityScore += 1;
    if (combined.includes('api') && combined.includes('integration')) complexityScore += 1;
    if (exp.technologies.length >= 5) complexityScore += 2;
  });
  
  // Normalize (max 20)
  const score = Math.min(20, complexityScore);
  
  return {
    factor: {
      name: 'Project Complexity',
      value: complexityScore,
      max: 30,
      score,
      description: 'Complexity and scale of projects worked on',
    },
  };
}

function calculateRequiredSkillsCoverage(
  skills: ResumeSkill[],
  requiredSkills: Skill[]
): { factor: ScoreFactor } {
  if (requiredSkills.length === 0) {
    return {
      factor: {
        name: 'Required Skills Coverage',
        value: 100,
        max: 100,
        score: 15, // Full points if no requirements
        description: 'All required skills covered',
      },
    };
  }
  
  let matchScore = 0;
  
  requiredSkills.forEach(required => {
    const normalized = normalizeSkill(required.name);
    
    const matchingSkill = skills.find(s => {
      const sNormalized = normalizeSkill(s.name);
      return sNormalized === normalized || 
             sNormalized.includes(normalized) || 
             normalized.includes(sNormalized);
    });
    
    if (matchingSkill) {
      // Base match
      let skillScore = 10;
      
      // Bonus for level
      if (matchingSkill.level === 'expert') skillScore += 5;
      else if (matchingSkill.level === 'advanced') skillScore += 3;
      else if (matchingSkill.level === 'intermediate') skillScore += 1;
      
      // Bonus for years of experience
      if (matchingSkill.yearsOfExperience >= 5) skillScore += 3;
      else if (matchingSkill.yearsOfExperience >= 3) skillScore += 1;
      
      matchScore += skillScore;
    }
  });
  
  // Calculate percentage and normalize (max 15)
  const maxPossible = requiredSkills.length * 15;
  const percentage = (matchScore / maxPossible) * 100;
  const score = Math.min(15, (percentage / 100) * 15);
  
  return {
    factor: {
      name: 'Required Skills Coverage',
      value: Math.round(percentage),
      max: 100,
      score,
      description: 'Coverage of explicitly required skills',
    },
  };
}

// ============================================
// Exports
// ============================================

export { PROGRAMMING_LANGUAGES, FRAMEWORKS, CLOUD_PLATFORMS, DEVOPS_TOOLS, DATABASES };
