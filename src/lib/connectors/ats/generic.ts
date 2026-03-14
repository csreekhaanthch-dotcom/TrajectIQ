// ============================================
// Generic ATS Connector
// ============================================
// Generic connector for custom ATS integrations
// Can be extended for any ATS with REST API

import type { ATSConfig, ATSConnector, ATSCandidate, ATSJob } from './types';

export interface GenericATSConfig extends ATSConfig {
  endpoints: {
    jobs: string;
    candidates: string;
    candidateDetail?: string;
    jobDetail?: string;
    createCandidate?: string;
    updateStatus?: string;
  };
  authType: 'BEARER' | 'BASIC' | 'API_KEY' | 'OAUTH2';
  apiKeyHeader?: string;
  mapping?: {
    jobs?: FieldMapping;
    candidates?: FieldMapping;
  };
}

interface FieldMapping {
  id?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class GenericATSConnector implements ATSConnector {
  private config: GenericATSConfig;
  private connected: boolean = false;

  constructor(config: GenericATSConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      const result = await this.testConnection();
      this.connected = result.success;
      return result.success;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(this.config.endpoints.jobs, {
        headers: this.getHeaders(),
      });

      if (response.ok) {
        return { success: true };
      }

      return {
        success: false,
        error: `Connection failed with status ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getJobs(): Promise<ATSJob[]> {
    if (!this.connected) {
      throw new Error('Not connected to ATS');
    }

    try {
      const response = await fetch(this.config.endpoints.jobs, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`);
      }

      const data = await response.json();
      return this.mapJobs(data);
    } catch (error) {
      console.error('Generic ATS getJobs error:', error);
      return [];
    }
  }

  async getJob(jobId: string): Promise<ATSJob | null> {
    if (!this.connected) {
      throw new Error('Not connected to ATS');
    }

    if (!this.config.endpoints.jobDetail) {
      return null;
    }

    try {
      const url = this.config.endpoints.jobDetail.replace('{id}', jobId);
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.mapJob(data);
    } catch {
      return null;
    }
  }

  async getCandidates(jobId: string): Promise<ATSCandidate[]> {
    if (!this.connected) {
      throw new Error('Not connected to ATS');
    }

    try {
      const url = this.config.endpoints.candidates.replace('{jobId}', jobId);
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch candidates: ${response.status}`);
      }

      const data = await response.json();
      return this.mapCandidates(data);
    } catch (error) {
      console.error('Generic ATS getCandidates error:', error);
      return [];
    }
  }

  async getCandidate(candidateId: string): Promise<ATSCandidate | null> {
    if (!this.connected) {
      throw new Error('Not connected to ATS');
    }

    if (!this.config.endpoints.candidateDetail) {
      return null;
    }

    try {
      const url = this.config.endpoints.candidateDetail.replace('{id}', candidateId);
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.mapCandidate(data);
    } catch {
      return null;
    }
  }

  async addCandidate(_jobId: string, _candidate: Partial<ATSCandidate>): Promise<ATSCandidate> {
    if (!this.connected) {
      throw new Error('Not connected to ATS');
    }

    if (!this.config.endpoints.createCandidate) {
      throw new Error('Create candidate endpoint not configured');
    }

    // Implementation would depend on the specific ATS API
    throw new Error('Not implemented - configure for specific ATS');
  }

  async updateCandidateStatus(candidateId: string, status: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Not connected to ATS');
    }

    if (!this.config.endpoints.updateStatus) {
      return false;
    }

    try {
      const url = this.config.endpoints.updateStatus.replace('{id}', candidateId);
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async syncCandidates(_since?: Date): Promise<ATSCandidate[]> {
    // Generic implementation - would need specific ATS configuration
    return [];
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.config.authType) {
      case 'BEARER':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case 'BASIC':
        headers['Authorization'] = `Basic ${Buffer.from(
          this.config.apiKey + ':' + (this.config.apiSecret || '')
        ).toString('base64')}`;
        break;
      case 'API_KEY':
        headers[this.config.apiKeyHeader || 'X-API-Key'] = this.config.apiKey;
        break;
      case 'OAUTH2':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
    }

    return headers;
  }

  private mapJobs(data: unknown): ATSJob[] {
    if (!Array.isArray(data)) return [];
    
    const mapping = this.config.mapping?.jobs || {};
    
    return data.map((job: Record<string, unknown>) => ({
      id: String(job[mapping.id || 'id']),
      title: String(job[mapping.title || 'title'] || ''),
      department: String(job.department || ''),
      location: String(job.location || ''),
      employmentType: String(job.employmentType || 'FULL_TIME'),
      status: String(job.status || 'ACTIVE'),
      createdAt: new Date(job[mapping.createdAt || 'createdAt'] as string || Date.now()),
      updatedAt: new Date(job[mapping.updatedAt || 'updatedAt'] as string || Date.now()),
      candidateCount: (job.candidateCount as number) || 0,
    }));
  }

  private mapJob(data: Record<string, unknown>): ATSJob {
    const mapping = this.config.mapping?.jobs || {};
    
    return {
      id: String(data[mapping.id || 'id']),
      title: String(data[mapping.title || 'title'] || ''),
      department: String(data.department || ''),
      location: String(data.location || ''),
      employmentType: String(data.employmentType || 'FULL_TIME'),
      status: String(data.status || 'ACTIVE'),
      createdAt: new Date(data[mapping.createdAt || 'createdAt'] as string || Date.now()),
      updatedAt: new Date(data[mapping.updatedAt || 'updatedAt'] as string || Date.now()),
      candidateCount: (data.candidateCount as number) || 0,
    };
  }

  private mapCandidates(data: unknown): ATSCandidate[] {
    if (!Array.isArray(data)) return [];
    
    return data.map((c: Record<string, unknown>) => this.mapCandidate(c));
  }

  private mapCandidate(c: Record<string, unknown>): ATSCandidate {
    const mapping = this.config.mapping?.candidates || {};
    
    return {
      id: String(c[mapping.id || 'id']),
      firstName: String(c[mapping.firstName || 'firstName'] || ''),
      lastName: String(c[mapping.lastName || 'lastName'] || ''),
      email: (c[mapping.email || 'email'] as string) || null,
      phone: (c[mapping.phone || 'phone'] as string) || null,
      currentTitle: String(c.currentTitle || ''),
      currentCompany: String(c.currentCompany || ''),
      location: String(c.location || ''),
      linkedinUrl: (c.linkedinUrl as string) || null,
      resumeUrl: (c.resumeUrl as string) || null,
      appliedAt: new Date(c[mapping.createdAt || 'appliedAt'] as string || Date.now()),
      status: String(c[mapping.status || 'status'] || 'NEW'),
      source: String(c.source || 'MANUAL_UPLOAD'),
      tags: (c.tags as string[]) || [],
      notes: (c.notes as string[]) || [],
    };
  }
}
