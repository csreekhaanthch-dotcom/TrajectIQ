// ============================================
// ATS Connector Types
// ============================================

export interface ATSConfig {
  provider: 'GREENHOUSE' | 'LEVER' | 'WORKDAY' | 'SMART_RECRUITERS' | 'JOBVITE' | 'CUSTOM';
  apiKey: string;
  apiSecret?: string;
  baseUrl?: string;
  organizationId?: string;
}

export interface ATSCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  location: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  appliedAt: Date;
  status: string;
  source: string;
  tags: string[];
  notes: string[];
}

export interface ATSJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  candidateCount: number;
}

export interface ATSConnector {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  getJobs(): Promise<ATSJob[]>;
  getJob(jobId: string): Promise<ATSJob | null>;
  getCandidates(jobId: string): Promise<ATSCandidate[]>;
  getCandidate(candidateId: string): Promise<ATSCandidate | null>;
  addCandidate(jobId: string, candidate: Partial<ATSCandidate>): Promise<ATSCandidate>;
  updateCandidateStatus(candidateId: string, status: string): Promise<boolean>;
  syncCandidates(since?: Date): Promise<ATSCandidate[]>;
}
