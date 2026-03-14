import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbConnected: boolean | undefined;
};

// Create Prisma client with error handling
function createPrismaClient() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    // Check if DATABASE_URL is properly configured
    if (!databaseUrl) {
      console.warn('[DB] No DATABASE_URL environment variable found');
      return null;
    }
    
    // Check if it's a local SQLite file (won't work on Vercel/serverless)
    if (databaseUrl.startsWith('file:') && process.env.VERCEL) {
      console.warn('[DB] SQLite file URLs do not work on Vercel. Please use a PostgreSQL database URL.');
      return null;
    }
    
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    console.log('[DB] Prisma client created successfully');
    return client;
  } catch (error) {
    console.error('[DB] Failed to create Prisma client:', error);
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

// Cache the connection status to avoid repeated checks
let connectionTested = false;
let connectionSuccessful = false;

// Helper to check if database is available
export function isDatabaseAvailable(): boolean {
  const available = db !== null;
  return available;
}

// Check if database can actually connect (async version)
export async function canConnectToDatabase(): Promise<boolean> {
  if (!prisma) {
    return false;
  }
  
  // Return cached result if available
  if (connectionTested) {
    return connectionSuccessful;
  }
  
  try {
    // Try a simple query to test the connection
    await prisma.$queryRaw`SELECT 1`;
    connectionSuccessful = true;
    console.log('[DB] Database connection test successful');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DB] Database connection test failed:', errorMessage);
    connectionSuccessful = false;
  } finally {
    connectionTested = true;
  }
  
  return connectionSuccessful;
}

// Test database connection
export async function testDatabaseConnection(): Promise<{ success: boolean; error?: string }> {
  if (!prisma) {
    return { success: false, error: 'Prisma client not initialized' };
  }
  
  try {
    // Try a simple query to test the connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('[DB] Database connection test successful');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DB] Database connection test failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Safe database operation wrapper
export async function safeDbOperation<T>(
  operation: (db: PrismaClient) => Promise<T>,
  fallback: T
): Promise<T> {
  if (!db) {
    console.warn('[DB] Database not available, returning fallback value');
    return fallback;
  }
  try {
    return await operation(db);
  } catch (error) {
    console.error('[DB] Database operation failed:', error);
    return fallback;
  }
}
