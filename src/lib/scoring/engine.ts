// TrajectIQ Scoring Engine
// Hiring Score = (SDI × 0.40) + (CSIG × 0.15) + (IAE × 0.20) + (CTA × 0.15) + (ERR × 0.10)

export interface ParsedResume {
  skills: string[]
  technologies: string[]
  experience: number // total years
  companies: string[]
  projects: string[]
  education: Array<{
    institution: string
    degree: string
    field: string
    year: number
  }>
  summary: string
  rawText: string
}

export interface RequirementData {
  requiredSkills: string[]
  optionalSkills: string[]
  experienceRequired: number
  role: string
}

export interface ScoreBreakdown {
  sdi: number // Skill Depth Index (0-100)
  csig: number // Critical Skill Integrity Gate (0-100)
  iae: number // Impact Authenticity Engine (0-100)
  cta: number // Career Trajectory Analyzer (0-100)
  err: number // Experience Relevance Ratio (0-1)
  hiringScore: number
  grade: string
  tier: number
  recommendation: string
  skillMatch: Record<string, { required: boolean; found: boolean; score: number }>
  impactSignals: string[]
  careerSignals: string[]
  experienceBreakdown: {
    totalYears: number
    relevantYears: number
    companies: string[]
    roles: string[]
  }
  explanations: {
    sdi: string
    csig: string
    iae: string
    cta: string
    err: string
  }
}

// Programming languages detection
const PROGRAMMING_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php',
  'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'lua', 'haskell', 'elixir', 'clojure',
  'dart', 'objective-c', 'bash', 'shell', 'sql', 'html', 'css', 'sass', 'less'
]

// Frameworks detection
const FRAMEWORKS = [
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'nuxt', 'gatsby', 'express',
  'fastify', 'koa', 'hapi', 'django', 'flask', 'fastapi', 'spring', 'springboot', 'rails',
  'laravel', 'symfony', 'asp.net', 'node.js', 'nodejs', 'jquery', 'tailwind', 'bootstrap',
  'redux', 'mobx', 'vuex', 'pinia', 'prisma', 'typeorm', 'sequelize', 'graphql', 'apollo',
  'trpc', 'react-query', 'tanstack', 'vite', 'webpack', 'rollup', 'jest', 'cypress'
]

// Cloud platforms detection
const CLOUD_PLATFORMS = [
  'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp', 'google cloud',
  'heroku', 'vercel', 'netlify', 'digitalocean', 'linode', 'cloudflare', 'firebase',
  'supabase', 'mongodb atlas', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible',
  'jenkins', 'github actions', 'gitlab ci', 'circleci', 'travis'
]

// System architecture keywords
const ARCHITECTURE_KEYWORDS = [
  'microservices', 'monolith', 'serverless', 'event-driven', 'distributed systems',
  'system design', 'architecture', 'scalability', 'high availability', 'load balancing',
  'caching', 'message queue', 'kafka', 'rabbitmq', 'redis', 'elasticsearch', 'mongodb',
  'postgresql', 'mysql', 'database design', 'api design', 'rest', 'grpc', 'websocket'
]

// Leadership keywords
const LEADERSHIP_KEYWORDS = [
  'lead', 'senior', 'principal', 'staff', 'architect', 'manager', 'director', 'head',
  'cto', 'vp', 'chief', 'team lead', 'tech lead', 'engineering manager', 'mentor',
  'supervised', 'managed', 'led team', 'led project', 'owner', 'founder'
]

// Achievement keywords for impact
const ACHIEVEMENT_KEYWORDS = [
  'increased', 'decreased', 'reduced', 'improved', 'launched', 'built', 'developed',
  'implemented', 'designed', 'architected', 'scaled', 'optimized', 'automated',
  'saved', 'generated', 'achieved', 'delivered', 'accelerated', 'streamlined'
]

// Scale indicators
const SCALE_INDICATORS = [
  'million', 'billion', 'users', 'customers', 'requests', 'transactions', 'concurrent',
  'daily active', 'monthly active', 'page views', 'api calls', 'data points'
]

// Promotion indicators
const PROMOTION_INDICATORS = [
  'promoted to', 'advanced to', 'progressed to', 'moved to senior', 'became lead',
  'rose to', 'elevated to', 'grew from', 'started as', 'rose through'
]

function normalizeText(text: string): string {
  return text.toLowerCase().trim()
}

function countMatches(text: string, keywords: string[]): number {
  const normalized = normalizeText(text)
  return keywords.filter(keyword => normalized.includes(keyword.toLowerCase())).length
}

function extractQuantifiedAchievements(text: string): string[] {
  const achievements: string[] = []
  const patterns = [
    /increased?\s+\w+\s+by\s+(\d+%|\d+\s*(percent|%|times|x))/gi,
    /reduced?\s+\w+\s+by\s+(\d+%|\d+\s*(percent|%|times|x))/gi,
    /improved?\s+\w+\s+by\s+(\d+%|\d+\s*(percent|%|times|x))/gi,
    /saved?\s+\$?\d+[\d,]*/gi,
    /generated?\s+\$?\d+[\d,]*/gi,
    /(\d+)\+?\s*(million|billion|thousand)/gi,
    /(\d+%)/g
  ]
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      achievements.push(...matches)
    }
  })
  
  return [...new Set(achievements)]
}

// SDI (Skill Depth Index) - 0-100
function calculateSDI(resume: ParsedResume): { score: number; explanation: string } {
  let score = 0
  const breakdown: string[] = []
  
  // Programming languages (max 20 points)
  const languagesFound = countMatches(resume.rawText, PROGRAMMING_LANGUAGES)
  const languageScore = Math.min(languagesFound * 2, 20)
  score += languageScore
  if (languageScore > 0) breakdown.push(`${languageScore} points for ${languagesFound} programming languages`)
  
  // Frameworks (max 20 points)
  const frameworksFound = countMatches(resume.rawText, FRAMEWORKS)
  const frameworkScore = Math.min(frameworksFound * 2, 20)
  score += frameworkScore
  if (frameworkScore > 0) breakdown.push(`${frameworkScore} points for ${frameworksFound} frameworks`)
  
  // Cloud platforms (max 15 points)
  const cloudFound = countMatches(resume.rawText, CLOUD_PLATFORMS)
  const cloudScore = Math.min(cloudFound * 2, 15)
  score += cloudScore
  if (cloudScore > 0) breakdown.push(`${cloudScore} points for ${cloudFound} cloud platforms`)
  
  // System architecture (max 15 points)
  const archFound = countMatches(resume.rawText, ARCHITECTURE_KEYWORDS)
  const archScore = Math.min(archFound * 1.5, 15)
  score += archScore
  if (archScore > 0) breakdown.push(`${Math.round(archScore)} points for system architecture experience`)
  
  // Open-source / projects (max 15 points)
  const projectScore = Math.min(resume.projects.length * 3, 15)
  score += projectScore
  if (projectScore > 0) breakdown.push(`${projectScore} points for ${resume.projects.length} projects`)
  
  // Project complexity (max 15 points) - based on experience
  const complexityScore = Math.min(resume.experience * 1.5, 15)
  score += complexityScore
  if (complexityScore > 0) breakdown.push(`${Math.round(complexityScore)} points for project complexity`)
  
  return {
    score: Math.min(Math.round(score), 100),
    explanation: `SDI calculated: ${breakdown.join(', ') || 'Limited skill depth detected'}`
  }
}

// CSIG (Critical Skill Integrity Gate) - 0-100
function calculateCSIG(resume: ParsedResume, requirement: RequirementData): { score: number; skillMatch: Record<string, { required: boolean; found: boolean; score: number }>; explanation: string } {
  const skillMatch: Record<string, { required: boolean; found: boolean; score: number }> = {}
  
  const normalizedResumeSkills = resume.skills.map(s => s.toLowerCase())
  const normalizedResumeText = resume.rawText.toLowerCase()
  
  // Check required skills
  let matchedRequired = 0
  const requiredSkills = requirement.requiredSkills.map(s => s.toLowerCase())
  
  requiredSkills.forEach(skill => {
    const found = normalizedResumeSkills.some(s => s.includes(skill)) || 
                  normalizedResumeText.includes(skill)
    skillMatch[skill] = { required: true, found, score: found ? 100 : 0 }
    if (found) matchedRequired++
  })
  
  // Check optional skills
  const optionalSkills = requirement.optionalSkills.map(s => s.toLowerCase())
  optionalSkills.forEach(skill => {
    const found = normalizedResumeSkills.some(s => s.includes(skill)) || 
                  normalizedResumeText.includes(skill)
    skillMatch[skill] = { required: false, found, score: found ? 50 : 0 }
  })
  
  const totalRequired = requiredSkills.length || 1
  const missingSkills = totalRequired - matchedRequired
  const score = Math.max(0, 100 - (missingSkills / totalRequired) * 100)
  
  return {
    score: Math.round(score),
    skillMatch,
    explanation: `CSIG: ${matchedRequired}/${totalRequired} required skills matched${optionalSkills.length > 0 ? `, ${Object.values(skillMatch).filter(s => !s.required && s.found).length} optional skills matched` : ''}`
  }
}

// IAE (Impact Authenticity Engine) - 0-100
function calculateIAE(resume: ParsedResume): { score: number; signals: string[]; explanation: string } {
  let score = 0
  const signals: string[] = []
  
  // Quantifiable achievements (max 30 points)
  const achievements = extractQuantifiedAchievements(resume.rawText)
  const achievementScore = Math.min(achievements.length * 5, 30)
  score += achievementScore
  if (achievements.length > 0) {
    signals.push(`${achievements.length} quantified achievements found`)
  }
  
  // Scale of systems (max 25 points)
  const scaleMatches = countMatches(resume.rawText, SCALE_INDICATORS)
  const scaleScore = Math.min(scaleMatches * 5, 25)
  score += scaleScore
  if (scaleMatches > 0) {
    signals.push(`Scale indicators: ${scaleMatches}`)
  }
  
  // Leadership responsibility (max 25 points)
  const leadershipMatches = countMatches(resume.rawText, LEADERSHIP_KEYWORDS)
  const leadershipScore = Math.min(leadershipMatches * 3, 25)
  score += leadershipScore
  if (leadershipMatches > 0) {
    signals.push(`Leadership keywords: ${leadershipMatches}`)
  }
  
  // Product impact (max 20 points) - based on achievements and summary
  const impactKeywords = ['product', 'feature', 'release', 'launch', 'customer', 'user']
  const impactMatches = countMatches(resume.rawText, impactKeywords)
  const impactScore = Math.min(impactMatches * 2, 20)
  score += impactScore
  if (impactMatches > 0) {
    signals.push(`Product impact indicators: ${impactMatches}`)
  }
  
  return {
    score: Math.min(Math.round(score), 100),
    signals,
    explanation: `IAE: ${signals.join(', ') || 'Limited impact signals detected'}`
  }
}

// CTA (Career Trajectory Analyzer) - 0-100
function calculateCTA(resume: ParsedResume): { score: number; signals: string[]; explanation: string } {
  let score = 0
  const signals: string[] = []
  
  // Promotions detected (max 30 points)
  const promotionMatches = countMatches(resume.rawText, PROMOTION_INDICATORS)
  const promotionScore = Math.min(promotionMatches * 10, 30)
  score += promotionScore
  if (promotionMatches > 0) {
    signals.push(`${promotionMatches} promotion indicators`)
  }
  
  // Increasing responsibility (max 30 points) - based on seniority keywords progression
  const seniorityScore = countMatches(resume.rawText, ['senior', 'lead', 'principal', 'staff', 'architect']) > 0 ? 30 : 
                        countMatches(resume.rawText, ['mid', 'intermediate']) > 0 ? 20 : 10
  score += seniorityScore
  signals.push(`Seniority level: ${seniorityScore} points`)
  
  // Leadership roles (max 25 points)
  const leadershipScore = countMatches(resume.rawText, LEADERSHIP_KEYWORDS) > 0 ? 25 : 0
  score += leadershipScore
  if (leadershipScore > 0) {
    signals.push('Leadership role detected')
  }
  
  // Project ownership (max 15 points)
  const ownershipKeywords = ['owner', 'owned', 'responsible for', 'accountable', 'led']
  const ownershipScore = countMatches(resume.rawText, ownershipKeywords) > 0 ? 15 : 0
  score += ownershipScore
  if (ownershipScore > 0) {
    signals.push('Project ownership detected')
  }
  
  return {
    score: Math.min(Math.round(score), 100),
    signals,
    explanation: `CTA: ${signals.join(', ')}`
  }
}

// ERR (Experience Relevance Ratio) - 0-1
function calculateERR(resume: ParsedResume, requirement: RequirementData): { score: number; breakdown: { totalYears: number; relevantYears: number; companies: string[]; roles: string[] }; explanation: string } {
  const totalYears = resume.experience
  const relevantKeywords = [...requirement.requiredSkills, ...requirement.optionalSkills].map(s => s.toLowerCase())
  
  // Estimate relevant experience by checking if skills appear in the resume
  const normalizedText = resume.rawText.toLowerCase()
  const matchedSkillsCount = relevantKeywords.filter(skill => normalizedText.includes(skill)).length
  const relevanceRatio = relevantKeywords.length > 0 ? matchedSkillsCount / relevantKeywords.length : 0.5
  
  // Estimate relevant years based on relevance ratio
  const relevantYears = totalYears * relevanceRatio
  
  return {
    score: Math.min(Math.round(relevanceRatio * 100) / 100, 1),
    breakdown: {
      totalYears,
      relevantYears: Math.round(relevantYears * 10) / 10,
      companies: resume.companies,
      roles: [] // Would need more parsing to extract roles
    },
    explanation: `ERR: ${Math.round(relevanceRatio * 100)}% relevance (${Math.round(relevantYears * 10) / 10}/${totalYears} years relevant)`
  }
}

// Determine grade based on score
function getGrade(score: number): { grade: string; tier: number; recommendation: string } {
  if (score >= 90) return { grade: 'A+', tier: 1, recommendation: 'HIRE' }
  if (score >= 85) return { grade: 'A', tier: 1, recommendation: 'HIRE' }
  if (score >= 80) return { grade: 'B+', tier: 2, recommendation: 'STRONG_REVIEW' }
  if (score >= 75) return { grade: 'B', tier: 2, recommendation: 'STRONG_REVIEW' }
  if (score >= 70) return { grade: 'C+', tier: 3, recommendation: 'REVIEW' }
  if (score >= 65) return { grade: 'C', tier: 3, recommendation: 'REVIEW' }
  if (score >= 60) return { grade: 'D', tier: 4, recommendation: 'REVIEW' }
  return { grade: 'F', tier: 5, recommendation: 'PASS' }
}

// Main scoring function
export function calculateScore(resume: ParsedResume, requirement: RequirementData): ScoreBreakdown {
  // Calculate each component
  const sdiResult = calculateSDI(resume)
  const csigResult = calculateCSIG(resume, requirement)
  const iaeResult = calculateIAE(resume)
  const ctaResult = calculateCTA(resume)
  const errResult = calculateERR(resume, requirement)
  
  // Calculate final hiring score
  // Hiring Score = (SDI × 0.40) + (CSIG × 0.15) + (IAE × 0.20) + (CTA × 0.15) + (ERR × 0.10)
  const hiringScore = 
    (sdiResult.score * 0.40) + 
    (csigResult.score * 0.15) + 
    (iaeResult.score * 0.20) + 
    (ctaResult.score * 0.15) + 
    (errResult.score * 100 * 0.10)
  
  const { grade, tier, recommendation } = getGrade(hiringScore)
  
  return {
    sdi: sdiResult.score,
    csig: csigResult.score,
    iae: iaeResult.score,
    cta: ctaResult.score,
    err: errResult.score,
    hiringScore: Math.round(hiringScore * 100) / 100,
    grade,
    tier,
    recommendation,
    skillMatch: csigResult.skillMatch,
    impactSignals: iaeResult.signals,
    careerSignals: ctaResult.signals,
    experienceBreakdown: errResult.breakdown,
    explanations: {
      sdi: sdiResult.explanation,
      csig: csigResult.explanation,
      iae: iaeResult.explanation,
      cta: ctaResult.explanation,
      err: errResult.explanation
    }
  }
}
