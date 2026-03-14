// ============================================
// Lever ATS Connector
// ============================================
// Integration with Lever ATS API

import type { ATSConfig, ATSConnector, ATSCandidate, ATSJob } from './types';

export class LeverConnector implements ATSConnector {
  private config: ATSConfig;
  private connected: boolean = false;
  private baseUrl: string = 'https://api.lever.co/v1';

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
      const response = await fetch(`${this.baseUrl}/postings`, {
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
      throw new Error('Not connected to Lever');
    }

    try {
      const response = await fetch(`${this.baseUrl}/postings`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`);
      }

      const data = await response.json();
      return this.mapJobs(data.data);
    } catch (error) {
      console.error('Lever getJobs error:', error);
      return [];
    }
  }

  async getJob(jobId: string): Promise<ATSJob | null> {
    if (!this.connected) {
      throw new Error('Not connected to Lever');
    }

    try {
      const response = await fetch(`${this.baseUrl}/postings/${jobId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.mapJob(data.data);
    } catch {
      return null;
    }
  }

  async getCandidates(jobId: string): Promise<ATSCandidate[]> {
    if (!this.connected) {
      throw new Error('Not connected to Lever');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/postings/${jobId}/candidates`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch candidates: ${response.status}`);
      }

      const data = await response.json();
      return this.mapCandidates(data.data);
    } catch (error) {
      console.error('Lever getCandidates error:', error);
      return [];
    }
  }

  async getCandidate(candidateId: string): Promise<ATSCandidate | null> {
    if (!this.connected) {
      throw new Error('Not connected to Lever');
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
      return this.mapCandidate(data.data);
    } catch {
      return null;
    }
  }

  async addCandidate(jobId: string, candidate: Partial<ATSCandidate>): Promise<ATSCandidate> {
    if (!this.connected) {
      throw new Error('Not connected to Lever');
    }

    const response = await fetch(`${this.baseUrl}/candidates`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: `${candidate.firstName} ${candidate.lastName}`,
        emails: candidate.email ? [{ type: 'personal', value: candidate.email }] : [],
        phones: candidate.phone ? [{ type: 'mobile', value: candidate.phone }] : [],
        postings: [jobId],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add candidate: ${response.status}`);
    }

    const data = await response.json();
    return this.mapCandidate(data.data);
  }

  async updateCandidateStatus(candidateId: string, status: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Not connected to Lever');
    }

    try {
      const stageId = await this.getStageIdForStatus(status);
      
      const response = await fetch(
        `${this.baseUrl}/candidates/${candidateId}/stage`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({ stageId }),
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  async syncCandidates(since?: Date): Promise<ATSCandidate[]> {
    if (!this.connected) {
      throw new Error('Not connected to Lever');
    }

    let url = `${this.baseUrl}/candidates`;
    
    if (since) {
      url += `?updated_at_start=${since.getTime()}`;
    }

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync candidates: ${response.status}`);
      }

      const data = await response.json();
      return this.mapCandidates(data.data);
    } catch (error) {
      console.error('Lever syncCandidates error:', error);
      return [];
    }
  }

  private async getStageIdForStatus(status: string): Promise<string> {
    // Map status to Lever stage ID
    // In production, this would query Lever's stages endpoint
    const stageMapping: Record<string, string> = {
      'NEW': 'new-application',
      'SCREENING': 'phone-screen',
      'INTERVIEWED': 'interview',
      'OFFERED': 'offer',
      'HIRED': 'hired',
      'REJECTED': 'rejected',
    };

    return stageMapping[status] || 'new-application';
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private mapJobs(data: unknown): ATSJob[] {
    if (!Array.isArray(data)) return [];
    
    return data.map((job: Record<string, unknown>) => {
      const categories = job.categories as Record<string, string> | undefined;
      return {
        id: String(job.id),
        title: String(job.text || ''),
        department: categories?.team ? String(categories.team) : null,
        location: String(categories?.location || ''),
        employmentType: String(categories?.commitment || 'FULL_TIME'),
        status: job.state === 'published' ? 'ACTIVE' : 'DRAFT',
        createdAt: new Date(job.createdAt as number || Date.now()),
        updatedAt: new Date(job.updatedAt as number || Date.now()),
        candidateCount: 0, // Would need separate query
      };
    });
  }

  private mapJob(data: Record<string, unknown>): ATSJob {
    const categories = data.categories as Record<string, string> | undefined;
    return {
      id: String(data.id),
      title: String(data.text || ''),
      department: categories?.team || null,
      location: String(categories?.location || ''),
      employmentType: String(categories?.commitment || 'FULL_TIME'),
      status: data.state === 'published' ? 'ACTIVE' : 'DRAFT',
      createdAt: new Date(data.createdAt as number || Date.now()),
      updatedAt: new Date(data.updatedAt as number || Date.now()),
      candidateCount: 0,
    };
  }

  private mapCandidates(data: unknown): ATSCandidate[] {
    if (!Array.isArray(data)) return [];
    
    return data.map((c: Record<string, unknown>) => this.mapCandidate(c));
  }

  private mapCandidate(c: Record<string, unknown>): ATSCandidate {
    const name = String(c.name || '').split(' ');
    const stage = c.stage as Record<string, string> | undefined;
    
    return {
      id: String(c.id),
      firstName: name[0] || '',
      lastName: name.slice(1).join(' ') || '',
      email: (c.emails as Array<{value: string}>)?.[0]?.value || null,
      phone: (c.phones as Array<{value: string}>)?.[0]?.value || null,
      currentTitle: String(c.headline || ''),
      currentCompany: '',
      location: String(c.location || ''),
      linkedinUrl: (c.links as Array<{type: string; url: string}>)?.find(
        l => l.type === 'linkedin'
      )?.url || null,
      resumeUrl: (c.resumes as Array<{url: string}>)?.[0]?.url || null,
      appliedAt: new Date(c.createdAt as number || Date.now()),
      status: String(stage?.text || 'NEW'),
      source: String((c.sources as string[])?.[0] || 'MANUAL_UPLOAD'),
      tags: (c.tags as string[]) || [],
      notes: (c.notes as string[]) || [],
    };
  }
}
