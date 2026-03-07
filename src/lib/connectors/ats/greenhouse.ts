// ============================================
// Greenhouse ATS Connector
// ============================================
// Integration with Greenhouse ATS API

import type { ATSConfig, ATSConnector, ATSCandidate, ATSJob } from './types';

export class GreenhouseConnector implements ATSConnector {
  private config: ATSConfig;
  private connected: boolean = false;
  private baseUrl: string = 'https://boards-api.greenhouse.io/v1';

  constructor(config: ATSConfig) {
    this.config = config;
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
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
      const response = await fetch(`${this.baseUrl}/jobs`, {
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
      throw new Error('Not connected to Greenhouse');
    }

    try {
      const response = await fetch(`${this.baseUrl}/jobs`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`);
      }

      const data = await response.json();
      return this.mapJobs(data);
    } catch (error) {
      console.error('Greenhouse getJobs error:', error);
      return [];
    }
  }

  async getJob(jobId: string): Promise<ATSJob | null> {
    if (!this.connected) {
      throw new Error('Not connected to Greenhouse');
    }

    try {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
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
      throw new Error('Not connected to Greenhouse');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/jobs/${jobId}/candidates`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch candidates: ${response.status}`);
      }

      const data = await response.json();
      return this.mapCandidates(data);
    } catch (error) {
      console.error('Greenhouse getCandidates error:', error);
      return [];
    }
  }

  async getCandidate(candidateId: string): Promise<ATSCandidate | null> {
    if (!this.connected) {
      throw new Error('Not connected to Greenhouse');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/candidates/${candidateId}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.mapCandidate(data);
    } catch {
      return null;
    }
  }

  async addCandidate(jobId: string, candidate: Partial<ATSCandidate>): Promise<ATSCandidate> {
    if (!this.connected) {
      throw new Error('Not connected to Greenhouse');
    }

    const response = await fetch(`${this.baseUrl}/jobs/${jobId}/candidates`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        first_name: candidate.firstName,
        last_name: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add candidate: ${response.status}`);
    }

    const data = await response.json();
    return this.mapCandidate(data);
  }

  async updateCandidateStatus(candidateId: string, status: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Not connected to Greenhouse');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/candidates/${candidateId}/status`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({ status }),
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  async syncCandidates(since?: Date): Promise<ATSCandidate[]> {
    if (!this.connected) {
      throw new Error('Not connected to Greenhouse');
    }

    const jobs = await this.getJobs();
    const allCandidates: ATSCandidate[] = [];

    for (const job of jobs) {
      const candidates = await this.getCandidates(job.id);
      
      if (since) {
        const filtered = candidates.filter(c => c.appliedAt >= since);
        allCandidates.push(...filtered);
      } else {
        allCandidates.push(...candidates);
      }
    }

    return allCandidates;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    };
  }

  private mapJobs(data: unknown): ATSJob[] {
    // Map Greenhouse response to ATSJob[]
    if (!Array.isArray(data)) return [];
    
    return data.map((job: Record<string, unknown>) => ({
      id: String(job.id),
      title: String(job.title || ''),
      department: job.departments ? String((job.departments as Array<{name: string}>)[0]?.name) : null,
      location: String(job.location?.name || ''),
      employmentType: 'FULL_TIME',
      status: job.status === 'open' ? 'ACTIVE' : 'CLOSED',
      createdAt: new Date(job.created_at as string || Date.now()),
      updatedAt: new Date(job.updated_at as string || Date.now()),
      candidateCount: (job.candidate_count as number) || 0,
    }));
  }

  private mapJob(data: Record<string, unknown>): ATSJob {
    return {
      id: String(data.id),
      title: String(data.title || ''),
      department: data.departments ? String((data.departments as Array<{name: string}>)[0]?.name) : null,
      location: String(data.location?.name || ''),
      employmentType: 'FULL_TIME',
      status: data.status === 'open' ? 'ACTIVE' : 'CLOSED',
      createdAt: new Date(data.created_at as string || Date.now()),
      updatedAt: new Date(data.updated_at as string || Date.now()),
      candidateCount: (data.candidate_count as number) || 0,
    };
  }

  private mapCandidates(data: unknown): ATSCandidate[] {
    if (!Array.isArray(data)) return [];
    
    return data.map((c: Record<string, unknown>) => this.mapCandidate(c));
  }

  private mapCandidate(c: Record<string, unknown>): ATSCandidate {
    return {
      id: String(c.id),
      firstName: String(c.first_name || ''),
      lastName: String(c.last_name || ''),
      email: (c.email_addresses as Array<{value: string}>)?.[0]?.value || null,
      phone: (c.phone_numbers as Array<{value: string}>)?.[0]?.value || null,
      currentTitle: String(c.title || ''),
      currentCompany: String(c.company || ''),
      location: String(c.location || ''),
      linkedinUrl: (c.social_media_addresses as Array<{value: string}>)?.find(
        (s: {type: string}) => s.type === 'linkedin'
      )?.value || null,
      resumeUrl: (c.attachments as Array<{url: string}>)?.[0]?.url || null,
      appliedAt: new Date(c.applied_at as string || Date.now()),
      status: String(c.status || 'NEW'),
      source: String(c.source?.name || 'MANUAL_UPLOAD'),
      tags: (c.tags as string[]) || [],
      notes: (c.notes as string[]) || [],
    };
  }
}
