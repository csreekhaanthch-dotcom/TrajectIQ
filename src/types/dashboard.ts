// TrajectIQ Dashboard Types

export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export type Recommendation = 'Strongly Recommend' | 'Recommend' | 'Consider' | 'Not Recommended';

export type EvaluationStatus = 'completed' | 'pending' | 'in_progress';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  score: number;
  grade: Grade;
  recommendation: Recommendation;
  status: EvaluationStatus;
  jobId: string;
  jobTitle: string;
  currentRole?: string;
  company?: string;
  evaluatedAt: string;
  skills: string[] | SkillScore[];
  experience: number; // years
  education: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  // Additional scoring fields
  skillsScore?: number;
  impactScore?: number;
  trajectoryScore?: number;
  experienceScore?: number;
  aiRisk?: number;
}

export interface SkillScore {
  name: string;
  score: number; // 0-100
  category: string;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
  status: 'open' | 'closed' | 'draft';
  candidatesCount: number;
  createdAt: string;
  requirements: string[];
}

export interface DashboardStats {
  totalCandidates: number;
  averageScore: number;
  topTierCandidates: number;
  pendingReviews: number;
  scoreDistribution: ScoreDistribution;
  recentEvaluations: RecentEvaluation[];
  trendData: TrendData[];
}

export interface ScoreDistribution {
  excellent: number; // 90-100
  good: number; // 80-89
  average: number; // 70-79
  belowAverage: number; // 60-69
  poor: number; // 0-59
}

export interface RecentEvaluation {
  id: string;
  candidateName: string;
  score: number;
  grade: Grade;
  jobTitle: string;
  evaluatedAt: string;
}

export interface TrendData {
  date: string;
  evaluations: number;
  avgScore: number;
}

export interface EvaluateRequest {
  candidateId: string;
  jobId: string;
  resumeUrl?: string;
  additionalNotes?: string;
}

export interface EvaluateResponse {
  success: boolean;
  candidate?: Candidate;
  error?: string;
}
