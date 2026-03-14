// ============================================
// TrajectIQ Type Definitions
// ============================================

// ============================================
// User & Authentication Types
// ============================================

export type Role = 'ADMIN' | 'RECRUITER' | 'VIEWER';
export type Plan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  maxUsers: number;
  maxCandidates: number;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: Role;
  organizationId: string | null;
  iat: number;
  exp: number;
}

// ============================================
// Email Types
// ============================================

export type EmailProvider = 'GMAIL' | 'OUTLOOK' | 'YAHOO' | 'CUSTOM_IMAP' | 'CUSTOM_POP3';
export type EmailProtocol = 'IMAP' | 'POP3' | 'OAUTH';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'ERROR';

export interface EmailAccount {
  id: string;
  userId: string;
  organizationId: string;
  provider: EmailProvider;
  email: string;
  protocol: EmailProtocol;
  isConnected: boolean;
  lastSyncAt: Date | null;
  syncStatus: SyncStatus;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailThread {
  id: string;
  emailAccountId: string;
  externalId: string;
  subject: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  receivedAt: Date;
  isRequirement: boolean;
  hasReplies: boolean;
  replyCount: number;
  rawContent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailReply {
  id: string;
  threadId: string;
  externalId: string;
  sender: string;
  senderEmail: string;
  receivedAt: Date;
  rawContent: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  threadId: string | null;
  replyId: string | null;
  filename: string;
  mimeType: string;
  fileSize: number;
  contentHash: string;
  storagePath: string | null;
  parsedContent: string | null;
  isProcessed: boolean;
  isResume: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Job Requirement Types
// ============================================

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CONTRACT_TO_HIRE' | 'INTERNSHIP';
export type RequirementStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

export interface Skill {
  name: string;
  required: boolean;
  weight: number;
  category: 'technical' | 'soft' | 'domain' | 'tool';
}

export interface Requirement {
  id: string;
  organizationId: string;
  createdById: string;
  emailAccountId: string | null;
  threadId: string | null;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: EmploymentType;
  salaryRange: string | null;
  requiredSkills: Skill[];
  preferredSkills: Skill[];
  experienceRequired: number;
  experiencePreferred: number | null;
  educationLevel: string | null;
  certifications: string[];
  sourceEmailSubject: string | null;
  sourceEmailBody: string | null;
  status: RequirementStatus;
  deadline: Date | null;
  sdiWeight: number;
  csigWeight: number;
  iaeWeight: number;
  ctaWeight: number;
  errWeight: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Candidate Types
// ============================================

export type CandidateStatus = 'NEW' | 'SCREENING' | 'INTERVIEWED' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';
export type CandidateSource = 'EMAIL' | 'ATS_GREENHOUSE' | 'ATS_LEVER' | 'ATS_WORKDAY' | 'MANUAL_UPLOAD' | 'API';

export interface Candidate {
  id: string;
  organizationId: string;
  requirementId: string | null;
  createdById: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  yearsExperience: number | null;
  rawResumeText: string | null;
  status: CandidateStatus;
  source: CandidateSource;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resume {
  id: string;
  candidateId: string;
  attachmentId: string | null;
  skills: ResumeSkill[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[] | null;
  certifications: string[] | null;
  languages: string[] | null;
  summary: string | null;
  originalFilename: string | null;
  parsedAt: Date | null;
  parseVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeSkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience: number;
  lastUsed: string | null;
}

export interface ResumeExperience {
  title: string;
  company: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  current: boolean;
  description: string | null;
  achievements: string[];
  technologies: string[];
}

export interface ResumeEducation {
  degree: string;
  field: string;
  institution: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  gpa: string | null;
  honors: string[];
}

export interface ResumeProject {
  name: string;
  description: string;
  role: string | null;
  technologies: string[];
  url: string | null;
  startDate: string | null;
  endDate: string | null;
}

// ============================================
// Scoring Types
// ============================================

export type Grade = 
  | 'A_PLUS' | 'A' | 'A_MINUS'
  | 'B_PLUS' | 'B' | 'B_MINUS'
  | 'C_PLUS' | 'C' | 'C_MINUS'
  | 'D_PLUS' | 'D' | 'D_MINUS'
  | 'F';

export type Recommendation = 
  | 'STRONG_HIRE' | 'HIRE' 
  | 'STRONG_CONSIDER' | 'CONSIDER' 
  | 'REVIEW' | 'WEAK_REVIEW' 
  | 'PASS' | 'STRONG_PASS';

export interface Score {
  id: string;
  candidateId: string;
  requirementId: string;
  
  // Component scores (0-100)
  sdiScore: number;
  csigScore: number;
  iaeScore: number;
  ctaScore: number;
  errScore: number;
  
  // Weighted scores
  sdiWeighted: number;
  csigWeighted: number;
  iaeWeighted: number;
  ctaWeighted: number;
  errWeighted: number;
  
  // Final score
  finalScore: number;
  grade: Grade;
  tier: number;
  recommendation: Recommendation;
  
  // Explainability
  scoreBreakdown: ScoreBreakdown;
  skillMatches: SkillMatchResult | null;
  impactSignals: ImpactSignal[] | null;
  careerProgression: CareerProgression | null;
  
  scoringVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoreBreakdown {
  sdi: ComponentBreakdown;
  csig: ComponentBreakdown;
  iae: ComponentBreakdown;
  cta: ComponentBreakdown;
  err: ComponentBreakdown;
}

export interface ComponentBreakdown {
  score: number;
  weight: number;
  weightedScore: number;
  factors: ScoreFactor[];
  strengths: string[];
  weaknesses: string[];
}

export interface ScoreFactor {
  name: string;
  value: number;
  max: number;
  description: string;
}

export interface SkillMatchResult {
  matched: SkillMatch[];
  missing: string[];
  partial: string[];
  matchPercentage: number;
}

export interface SkillMatch {
  skill: string;
  required: boolean;
  candidateLevel: string;
  yearsExperience: number;
  matchQuality: 'exact' | 'partial' | 'related';
}

export interface ImpactSignal {
  type: 'quantifiable' | 'leadership' | 'scale' | 'innovation' | 'ownership';
  description: string;
  evidence: string;
  weight: number;
}

export interface CareerProgression {
  totalYears: number;
  companies: CompanyTenure[];
  promotions: number;
  increasingResponsibility: boolean;
  leadershipRoles: number;
  averageTenure: number;
}

export interface CompanyTenure {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  years: number;
  isPromotion: boolean;
}

// ============================================
// Report Types
// ============================================

export type ReportType = 
  | 'CANDIDATE_SCORECARD' 
  | 'CANDIDATE_COMPARISON' 
  | 'REQUIREMENT_SUMMARY' 
  | 'HIRING_PIPELINE' 
  | 'ANALYTICS_DASHBOARD';

export interface Report {
  id: string;
  organizationId: string;
  requirementId: string | null;
  candidateId: string | null;
  createdById: string;
  type: ReportType;
  title: string;
  content: string;
  comparedCandidateIds: string[] | null;
  isPublic: boolean;
  shareToken: string | null;
  downloadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// ATS Types
// ============================================

export type ATSProvider = 'GREENHOUSE' | 'LEVER' | 'WORKDAY' | 'SMART_RECRUITERS' | 'JOBVITE' | 'CUSTOM';

export interface ATSConnection {
  id: string;
  organizationId: string;
  provider: ATSProvider;
  name: string;
  isConnected: boolean;
  lastSyncAt: Date | null;
  syncStatus: SyncStatus;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  totalRequirements: number;
  activeRequirements: number;
  totalCandidates: number;
  newCandidates: number;
  averageScore: number;
  topGrade: Grade;
  hiredCount: number;
  rejectedCount: number;
}

export interface ScoreDistribution {
  grade: Grade;
  count: number;
  percentage: number;
}

export interface CandidateRanking {
  rank: number;
  candidate: Candidate;
  score: Score;
  recommendation: Recommendation;
}
