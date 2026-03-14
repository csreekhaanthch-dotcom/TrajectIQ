import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import type { User, Role, AuthSession } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'trajectiq-default-secret';
const JWT_EXPIRES_IN: jwt.SignOptions['expiresIn'] = '7d';

// ============================================
// Password Utilities
// ============================================

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================
// JWT Utilities
// ============================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  organizationId: string | null;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}

// ============================================
// Session Management
// ============================================

const SESSION_COOKIE_NAME = 'trajectiq_session';

export async function createSession(user: User, response?: Response): Promise<string> {
  try {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    
    const token = generateAccessToken(payload);
    
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    
    console.log('[Auth] Session created successfully for user:', user.id);
    return token;
  } catch (error) {
    console.error('[Auth] Error creating session:', error);
    throw new Error('Failed to create session');
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }
  
  return {
    ...payload,
    iat: 0,
    exp: 0,
  };
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ============================================
// Authentication Middleware Helpers
// ============================================

export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }
  
  // Return demo user if database is not available
  if (!isDatabaseAvailable()) {
    return {
      id: payload.userId,
      email: payload.email,
      firstName: 'Demo',
      lastName: 'User',
      role: payload.role,
      organizationId: payload.organizationId,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  const dbUser = await prisma!.user.findUnique({
    where: { id: payload.userId },
  });
  
  if (!dbUser) return null;
  
  // Cast to User type with proper role
  return {
    ...dbUser,
    role: dbUser.role as Role,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) {
    return null;
  }
  
  // Return demo user if database is not available
  if (!isDatabaseAvailable()) {
    return {
      id: session.userId,
      email: session.email,
      firstName: 'Demo',
      lastName: 'User',
      role: session.role,
      organizationId: session.organizationId,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  const dbUser = await prisma!.user.findUnique({
    where: { id: session.userId },
  });
  
  if (!dbUser) return null;
  
  // Cast to User type with proper role
  return {
    ...dbUser,
    role: dbUser.role as Role,
  };
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(roles: Role[]): Promise<User> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden');
  }
  return user;
}

// ============================================
// Authorization Helpers
// ============================================

export function hasPermission(user: User, action: string, resource: string): boolean {
  const permissions: Record<Role, string[]> = {
    ADMIN: ['create', 'read', 'update', 'delete', 'manage'],
    RECRUITER: ['create', 'read', 'update'],
    VIEWER: ['read'],
  };
  
  const userPermissions = permissions[user.role] || [];
  return userPermissions.includes(action) || userPermissions.includes('manage');
}

export function canAccessOrganization(user: User, organizationId: string): boolean {
  if (user.role === 'ADMIN') return true;
  return user.organizationId === organizationId;
}
