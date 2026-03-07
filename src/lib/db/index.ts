import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with error handling
function createPrismaClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.error('Failed to create Prisma client:', error);
    return null;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

// Alias for convenience - can be null if database is not configured
export const db = prisma;

export default prisma;

// Helper to check if database is available
export function isDatabaseAvailable(): boolean {
  return db !== null;
}

// Safe database operation wrapper
export async function safeDbOperation<T>(
  operation: (db: PrismaClient) => Promise<T>,
  fallback: T
): Promise<T> {
  if (!db) {
    console.warn('Database not available, returning fallback value');
    return fallback;
  }
  try {
    return await operation(db);
  } catch (error) {
    console.error('Database operation failed:', error);
    return fallback;
  }
}
