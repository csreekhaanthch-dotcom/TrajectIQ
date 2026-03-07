// ============================================
// ATS Connectors - Main Entry Point
// ============================================
// Factory for creating ATS connectors

import type { ATSConfig, ATSConnector } from './types';
import { GreenhouseConnector } from './greenhouse';
import { LeverConnector } from './lever';
import { GenericATSConnector } from './generic';

export * from './types';
export { GreenhouseConnector } from './greenhouse';
export { LeverConnector } from './lever';
export { GenericATSConnector } from './generic';

// ============================================
// ATS Connector Factory
// ============================================

export function createATSConnector(config: ATSConfig): ATSConnector {
  switch (config.provider) {
    case 'GREENHOUSE':
      return new GreenhouseConnector(config);
    
    case 'LEVER':
      return new LeverConnector(config);
    
    case 'WORKDAY':
    case 'SMART_RECRUITERS':
    case 'JOBVITE':
    case 'CUSTOM':
    default:
      return new GenericATSConnector(config as Parameters<typeof GenericATSConnector>[0]);
  }
}

// ============================================
// ATS Provider Configurations
// ============================================

export const ATS_PROVIDERS = {
  GREENHOUSE: {
    name: 'Greenhouse',
    type: 'GREENHOUSE',
    description: 'Modern recruiting software for growing companies',
    features: ['jobs', 'candidates', 'applications', 'interviews', 'offers'],
    authType: 'API_KEY',
  },
  LEVER: {
    name: 'Lever',
    type: 'LEVER',
    description: 'Talent acquisition suite for modern recruiting',
    features: ['jobs', 'candidates', 'applications', 'interviews', 'offers'],
    authType: 'API_KEY',
  },
  WORKDAY: {
    name: 'Workday',
    type: 'WORKDAY',
    description: 'Enterprise HR and recruiting platform',
    features: ['jobs', 'candidates', 'applications'],
    authType: 'OAUTH2',
  },
  SMART_RECRUITERS: {
    name: 'SmartRecruiters',
    type: 'SMART_RECRUITERS',
    description: 'Global talent acquisition platform',
    features: ['jobs', 'candidates', 'applications'],
    authType: 'API_KEY',
  },
  JOBVITE: {
    name: 'Jobvite',
    type: 'JOBVITE',
    description: 'Recruiting and applicant tracking software',
    features: ['jobs', 'candidates', 'applications'],
    authType: 'API_KEY',
  },
} as const;

// ============================================
// ATS Service Class
// ============================================

export class ATSService {
  private connectors: Map<string, ATSConnector> = new Map();

  async connect(config: ATSConfig): Promise<boolean> {
    const connector = createATSConnector(config);
    const connected = await connector.connect();
    
    if (connected) {
      this.connectors.set(config.provider, connector);
    }
    
    return connected;
  }

  async disconnect(provider: string): Promise<void> {
    const connector = this.connectors.get(provider);
    if (connector) {
      await connector.disconnect();
      this.connectors.delete(provider);
    }
  }

  getConnector(provider: string): ATSConnector | undefined {
    return this.connectors.get(provider);
  }

  isConnected(provider: string): boolean {
    const connector = this.connectors.get(provider);
    return connector?.isConnected() || false;
  }

  async syncAllCandidates(since?: Date): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    
    for (const [provider, connector] of this.connectors) {
      try {
        // Get all jobs first
        const jobs = await connector.getJobs();
        const candidates: unknown[] = [];
        
        for (const job of jobs) {
          const jobCandidates = await connector.getCandidates(job.id);
          candidates.push(...jobCandidates);
        }
        
        results[provider] = {
          success: true,
          jobsCount: jobs.length,
          candidatesCount: candidates.length,
        };
      } catch (error) {
        results[provider] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
    
    return results;
  }
}

// Singleton instance
let atsServiceInstance: ATSService | null = null;

export function getATSService(): ATSService {
  if (!atsServiceInstance) {
    atsServiceInstance = new ATSService();
  }
  return atsServiceInstance;
}
