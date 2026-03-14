// ============================================
// RBAC Middleware & Authorization
// Enterprise-Grade Role-Based Access Control
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCurrentUser } from '@/lib/auth';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import type { Role, User } from '@/types';

// ============================================
// Permission Definitions
// ============================================

export type Permission = 
  | 'candidates:read' 
  | 'candidates:create' 
  | 'candidates:update' 
  | 'candidates:delete'
  | 'jobs:read' 
  | 'jobs:create' 
  | 'jobs:update' 
  | 'jobs:delete'
  | 'email:read' 
  | 'email:create' 
  | 'email:delete'
  | 'reports:read' 
  | 'reports:create' 
  | 'reports:delete'
  | 'evaluations:read' 
  | 'evaluations:create' 
  | 'evaluations:run'
  | 'settings:read' 
  | 'settings:update'
  | 'users:read' 
  | 'users:create' 
  | 'users:update' 
  | 'users:delete'
  | 'billing:read' 
  | 'billing:manage'
  | 'organization:manage';

export type Resource = 'candidate' | 'job' | 'email' | 'report' | 'evaluation' | 'settings' | 'user' | 'billing' | 'organization';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'manage' | 'run';

// Role-Permission Matrix
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    // Full access
    'candidates:read', 'candidates:create', 'candidates:update', 'candidates:delete',
    'jobs:read', 'jobs:create', 'jobs:update', 'jobs:delete',
    'email:read', 'email:create', 'email:delete',
    'reports:read', 'reports:create', 'reports:delete',
    'evaluations:read', 'evaluations:create', 'evaluations:run',
    'settings:read', 'settings:update',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'billing:read', 'billing:manage',
    'organization:manage',
  ],
  RECRUITER: [
    // Standard recruiter access
    'candidates:read', 'candidates:create', 'candidates:update',
    'jobs:read', 'jobs:create', 'jobs:update',
    'email:read', 'email:create',
    'reports:read', 'reports:create',
    'evaluations:read', 'evaluations:create', 'evaluations:run',
    'settings:read',
  ],
  VIEWER: [
    // Read-only access
    'candidates:read',
    'jobs:read',
    'email:read',
    'reports:read',
    'evaluations:read',
    'settings:read',
  ],
};

// Action to Permission mapping
const ACTION_PERMISSION_MAP: Record<string, Record<Resource, Permission | null>> = {
  GET: {
    candidate: 'candidates:read',
    job: 'jobs:read',
    email: 'email:read',
    report: 'reports:read',
    evaluation: 'evaluations:read',
    settings: 'settings:read',
    user: 'users:read',
    billing: 'billing:read',
    organization: 'settings:read',
  },
  POST: {
    candidate: 'candidates:create',
    job: 'jobs:create',
    email: 'email:create',
    report: 'reports:create',
    evaluation: 'evaluations:create',
    settings: 'settings:update',
    user: 'users:create',
    billing: 'billing:manage',
    organization: 'organization:manage',
  },
  PUT: {
    candidate: 'candidates:update',
    job: 'jobs:update',
    email: null, // Email accounts are created/deleted only
    report: null, // Reports are created/deleted only
    evaluation: null, // Evaluations are run via POST
    settings: 'settings:update',
    user: 'users:update',
    billing: 'billing:manage',
    organization: 'organization:manage',
  },
  PATCH: {
    candidate: 'candidates:update',
    job: 'jobs:update',
    email: null,
    report: null,
    evaluation: null,
    settings: 'settings:update',
    user: 'users:update',
    billing: 'billing:manage',
    organization: 'organization:manage',
  },
  DELETE: {
    candidate: 'candidates:delete',
    job: 'jobs:delete',
    email: 'email:delete',
    report: 'reports:delete',
    evaluation: null,
    settings: null,
    user: 'users:delete',
    billing: 'billing:manage',
    organization: null,
  },
};

// ============================================
// Permission Checking Functions
// ============================================

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some(p => rolePermissions.includes(p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return permissions.every(p => rolePermissions.includes(p));
}

export function getRequiredPermission(method: string, resource: Resource): Permission | null {
  const methodMap = ACTION_PERMISSION_MAP[method.toUpperCase()];
  if (!methodMap) return null;
  return methodMap[resource];
}

// ============================================
// Authorization Result
// ============================================

export interface AuthResult {
  authorized: boolean;
  user?: User;
  error?: string;
  statusCode?: number;
}

// ============================================
// Middleware Functions
// ============================================

/**
 * Check if user is authenticated
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getSession();
  
  if (!session) {
    return {
      authorized: false,
      error: 'Authentication required',
      statusCode: 401,
    };
  }

  const user = await getCurrentUser();
  
  if (!user) {
    return {
      authorized: false,
      error: 'Invalid session',
      statusCode: 401,
    };
  }

  if (!user.isActive) {
    return {
      authorized: false,
      error: 'Account is deactivated',
      statusCode: 403,
    };
  }

  return {
    authorized: true,
    user,
  };
}

/**
 * Check if user has specific permission
 */
export async function requirePermission(permission: Permission): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authorized) {
    return authResult;
  }

  const user = authResult.user!;
  
  if (!hasPermission(user.role, permission)) {
    return {
      authorized: false,
      user,
      error: 'Insufficient permissions',
      statusCode: 403,
    };
  }

  return authResult;
}

/**
 * Check if user has any of the specified permissions
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authorized) {
    return authResult;
  }

  const user = authResult.user!;
  
  if (!hasAnyPermission(user.role, permissions)) {
    return {
      authorized: false,
      user,
      error: 'Insufficient permissions',
      statusCode: 403,
    };
  }

  return authResult;
}

/**
 * Check if user has specific role
 */
export async function requireRole(roles: Role[]): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authorized) {
    return authResult;
  }

  const user = authResult.user!;
  
  if (!roles.includes(user.role)) {
    return {
      authorized: false,
      user,
      error: 'Insufficient role',
      statusCode: 403,
    };
  }

  return authResult;
}

/**
 * Check if user can access a specific resource (ownership check)
 */
export async function requireResourceAccess(
  resource: Resource, 
  resourceId: string,
  permission: Permission
): Promise<AuthResult> {
  const authResult = await requirePermission(permission);
  
  if (!authResult.authorized) {
    return authResult;
  }

  const user = authResult.user!;
  
  // Admins have access to everything in their organization
  if (user.role === 'ADMIN') {
    return authResult;
  }

  // Check resource ownership
  if (!isDatabaseAvailable()) {
    // In demo mode, allow access
    return authResult;
  }

  try {
    let resourceOrgId: string | null = null;
    let resourceCreatorId: string | null = null;

    switch (resource) {
      case 'candidate':
        const candidate = await prisma!.candidate.findUnique({
          where: { id: resourceId },
          select: { organizationId: true, createdById: true },
        });
        resourceOrgId = candidate?.organizationId ?? null;
        resourceCreatorId = candidate?.createdById ?? null;
        break;

      case 'job':
        const job = await prisma!.requirement.findUnique({
          where: { id: resourceId },
          select: { organizationId: true, createdById: true },
        });
        resourceOrgId = job?.organizationId ?? null;
        resourceCreatorId = job?.createdById ?? null;
        break;

      case 'report':
        const report = await prisma!.report.findUnique({
          where: { id: resourceId },
          select: { organizationId: true, createdById: true },
        });
        resourceOrgId = report?.organizationId ?? null;
        resourceCreatorId = report?.createdById ?? null;
        break;

      case 'email':
        const emailAccount = await prisma!.emailAccount.findUnique({
          where: { id: resourceId },
          select: { organizationId: true, userId: true },
        });
        resourceOrgId = emailAccount?.organizationId ?? null;
        resourceCreatorId = emailAccount?.userId ?? null;
        break;

      default:
        // For other resources, just check organization membership
        return authResult;
    }

    // Check organization membership
    if (resourceOrgId && resourceOrgId !== user.organizationId) {
      return {
        authorized: false,
        user,
        error: 'Access denied to this resource',
        statusCode: 403,
      };
    }

    // For VIEWER role, check if they created the resource
    if (user.role === 'VIEWER' && resourceCreatorId && resourceCreatorId !== user.id) {
      return {
        authorized: false,
        user,
        error: 'Access denied to this resource',
        statusCode: 403,
      };
    }

    return authResult;
  } catch (error) {
    return {
      authorized: false,
      user,
      error: 'Resource not found',
      statusCode: 404,
    };
  }
}

// ============================================
// Authorization Middleware Wrapper
// ============================================

export function withAuth(
  handler: (req: NextRequest, user: User) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await requireAuth();
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    return handler(req, authResult.user!);
  };
}

export function withPermission(
  permission: Permission,
  handler: (req: NextRequest, user: User) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await requirePermission(permission);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    return handler(req, authResult.user!);
  };
}

export function withRole(
  roles: Role[],
  handler: (req: NextRequest, user: User) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authResult = await requireRole(roles);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    return handler(req, authResult.user!);
  };
}

// ============================================
// Audit Logging Helper
// ============================================

export async function logAuditEvent(params: {
  userId?: string;
  organizationId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (!isDatabaseAvailable()) return;

  try {
    await prisma!.auditLog.create({
      data: {
        userId: params.userId,
        organizationId: params.organizationId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}
