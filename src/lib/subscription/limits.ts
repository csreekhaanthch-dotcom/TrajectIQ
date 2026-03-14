// ============================================
// Subscription Limits & Plan Management
// Enterprise-Grade Usage Enforcement
// ============================================

import { prisma, isDatabaseAvailable } from '@/lib/db';
import type { Plan } from '@/types';

// ============================================
// Plan Definitions
// ============================================

export interface PlanLimits {
  name: string;
  price: number;
  maxCandidates: number;
  maxJobs: number;
  maxUsers: number;
  maxEmailAccounts: number;
  features: string[];
  stripePriceId?: string;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    name: 'Free',
    price: 0,
    maxCandidates: 100,
    maxJobs: 5,
    maxUsers: 3,
    maxEmailAccounts: 1,
    features: [
      'Basic candidate scoring',
      'Email parsing',
      'Standard reports',
      'Community support',
    ],
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    maxCandidates: 500,
    maxJobs: 15,
    maxUsers: 5,
    maxEmailAccounts: 2,
    features: [
      'Everything in Free',
      'Advanced scoring algorithms',
      'ATS integrations',
      'Priority email support',
      'Custom scoring weights',
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 79,
    maxCandidates: 2000,
    maxJobs: 50,
    maxUsers: 15,
    maxEmailAccounts: 5,
    features: [
      'Everything in Starter',
      'Unlimited reports',
      'API access',
      'Custom branding',
      'Team collaboration',
      'Bulk operations',
      'Advanced analytics',
    ],
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 199,
    maxCandidates: -1, // Unlimited
    maxJobs: -1, // Unlimited
    maxUsers: -1, // Unlimited
    maxEmailAccounts: -1, // Unlimited
    features: [
      'Everything in Professional',
      'Unlimited candidates',
      'Unlimited jobs',
      'Unlimited users',
      'SSO/SAML',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option',
    ],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
};

// ============================================
// Usage Types
// ============================================

export type ResourceType = 'CANDIDATES' | 'JOBS' | 'USERS' | 'EMAIL_ACCOUNTS';

export interface UsageStatus {
  resource: ResourceType;
  used: number;
  limit: number;
  isUnlimited: boolean;
  percentage: number | null;
  isExceeded: boolean;
  isNearLimit: boolean; // > 80%
}

export interface OrganizationUsage {
  candidates: UsageStatus;
  jobs: UsageStatus;
  users: UsageStatus;
  emailAccounts: UsageStatus;
  plan: Plan;
  planStatus: string;
  canUpgrade: boolean;
}

// ============================================
// Usage Checking Functions
// ============================================

/**
 * Get current usage for an organization
 */
export async function getOrganizationUsage(organizationId: string): Promise<OrganizationUsage | null> {
  if (!isDatabaseAvailable()) {
    // Return demo usage
    return {
      candidates: { resource: 'CANDIDATES', used: 45, limit: 100, isUnlimited: false, percentage: 45, isExceeded: false, isNearLimit: false },
      jobs: { resource: 'JOBS', used: 3, limit: 5, isUnlimited: false, percentage: 60, isExceeded: false, isNearLimit: false },
      users: { resource: 'USERS', used: 2, limit: 3, isUnlimited: false, percentage: 67, isExceeded: false, isNearLimit: true },
      emailAccounts: { resource: 'EMAIL_ACCOUNTS', used: 1, limit: 1, isUnlimited: false, percentage: 100, isExceeded: false, isNearLimit: true },
      plan: 'FREE',
      planStatus: 'ACTIVE',
      canUpgrade: true,
    };
  }

  try {
    const organization = await prisma!.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            candidates: true,
            requirements: true,
            emailAccounts: true,
          },
        },
      },
    });

    if (!organization) return null;

    const plan = organization.plan as Plan;
    const limits = PLAN_LIMITS[plan];

    const createUsageStatus = (
      resource: ResourceType,
      used: number,
      limit: number
    ): UsageStatus => {
      const isUnlimited = limit === -1;
      return {
        resource,
        used,
        limit: isUnlimited ? Infinity : limit,
        isUnlimited,
        percentage: isUnlimited ? null : Math.round((used / limit) * 100),
        isExceeded: isUnlimited ? false : used >= limit,
        isNearLimit: isUnlimited ? false : used >= limit * 0.8,
      };
    };

    return {
      candidates: createUsageStatus('CANDIDATES', organization._count.candidates, limits.maxCandidates),
      jobs: createUsageStatus('JOBS', organization._count.requirements, limits.maxJobs),
      users: createUsageStatus('USERS', organization._count.users, limits.maxUsers),
      emailAccounts: createUsageStatus('EMAIL_ACCOUNTS', organization._count.emailAccounts, limits.maxEmailAccounts),
      plan,
      planStatus: organization.planStatus,
      canUpgrade: plan !== 'ENTERPRISE',
    };
  } catch (error) {
    console.error('Failed to get organization usage:', error);
    return null;
  }
}

/**
 * Check if organization can create a new resource
 */
export async function canCreateResource(
  organizationId: string,
  resourceType: ResourceType
): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
  if (!isDatabaseAvailable()) {
    // In demo mode, always allow
    return { allowed: true };
  }

  try {
    const usage = await getOrganizationUsage(organizationId);
    
    if (!usage) {
      return { allowed: false, reason: 'Organization not found' };
    }

    // Check if plan is active
    if (usage.planStatus === 'PAST_DUE') {
      return { allowed: false, reason: 'Subscription is past due. Please update payment method.' };
    }

    if (usage.planStatus === 'CANCELED') {
      return { allowed: false, reason: 'Subscription has been canceled.' };
    }

    const statusMap: Record<ResourceType, UsageStatus> = {
      CANDIDATES: usage.candidates,
      JOBS: usage.jobs,
      USERS: usage.users,
      EMAIL_ACCOUNTS: usage.emailAccounts,
    };

    const status = statusMap[resourceType];

    if (status.isUnlimited) {
      return { allowed: true };
    }

    if (status.isExceeded) {
      return {
        allowed: false,
        reason: `${resourceType.toLowerCase().replace('_', ' ')} limit reached (${status.limit}). Please upgrade your plan.`,
        current: status.used,
        limit: status.limit,
      };
    }

    return {
      allowed: true,
      current: status.used,
      limit: status.limit,
    };
  } catch (error) {
    console.error('Failed to check resource limit:', error);
    return { allowed: false, reason: 'Failed to verify limits' };
  }
}

/**
 * Enforce limit before creating a resource
 * Throws an error if limit is exceeded
 */
export async function enforceLimit(
  organizationId: string,
  resourceType: ResourceType
): Promise<void> {
  const check = await canCreateResource(organizationId, resourceType);
  
  if (!check.allowed) {
    const error = new Error(check.reason || 'Resource limit exceeded');
    (error as any).statusCode = 402; // Payment Required
    (error as any).resourceType = resourceType;
    (error as any).current = check.current;
    (error as any).limit = check.limit;
    throw error;
  }
}

/**
 * Record a usage event
 */
export async function recordUsage(params: {
  organizationId: string;
  resourceType: ResourceType;
  action: 'CREATE' | 'DELETE';
  quantity?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isDatabaseAvailable()) return;

  try {
    await prisma!.usageRecord.create({
      data: {
        organizationId: params.organizationId,
        resourceType: params.resourceType,
        action: params.action,
        quantity: params.quantity ?? 1,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to record usage:', error);
  }
}

/**
 * Get usage history for an organization
 */
export async function getUsageHistory(
  organizationId: string,
  options?: {
    resourceType?: ResourceType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  if (!isDatabaseAvailable()) return [];

  try {
    const where: any = { organizationId };
    
    if (options?.resourceType) {
      where.resourceType = options.resourceType;
    }
    
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options?.startDate) where.createdAt.gte = options.startDate;
      if (options?.endDate) where.createdAt.lte = options.endDate;
    }

    const records = await prisma!.usageRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 100,
    });

    return records;
  } catch (error) {
    console.error('Failed to get usage history:', error);
    return [];
  }
}

// ============================================
// Plan Upgrade Helpers
// ============================================

export function getUpgradeOptions(currentPlan: Plan): { plan: Plan; limits: PlanLimits }[] {
  const planOrder: Plan[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  const currentIndex = planOrder.indexOf(currentPlan);
  
  return planOrder
    .slice(currentIndex + 1)
    .map(plan => ({ plan, limits: PLAN_LIMITS[plan] }));
}

export function calculateProratedAmount(
  currentPlan: Plan,
  newPlan: Plan,
  daysRemaining: number
): number {
  const currentPrice = PLAN_LIMITS[currentPlan].price;
  const newPrice = PLAN_LIMITS[newPlan].price;
  const priceDifference = newPrice - currentPrice;
  
  // Prorated for remaining days in billing cycle
  return (priceDifference / 30) * daysRemaining;
}
