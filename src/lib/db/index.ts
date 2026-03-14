import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with error handling
function createPrismaClient(): PrismaClient | null {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    // Debug logging
    console.log('[DB] Creating Prisma client...');
    console.log('[DB] DATABASE_URL:', databaseUrl ? `"${databaseUrl.substring(0, 50)}..."` : 'NOT SET');
    console.log('[DB] NODE_ENV:', process.env.NODE_ENV);
    
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

// Initialize Prisma client
// In development, use global to persist across hot reloads
let prismaClient: PrismaClient | null = null;

function getPrisma(): PrismaClient | null {
  if (!prismaClient) {
    if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma) {
      prismaClient = globalForPrisma.prisma;
    } else {
      prismaClient = createPrismaClient();
      if (process.env.NODE_ENV !== 'production' && prismaClient) {
        globalForPrisma.prisma = prismaClient;
      }
    }
  }
  return prismaClient;
}

// Export the Prisma client (evaluated at import time for compatibility)
// This will be null if DATABASE_URL is not set
export const prisma = getPrisma();

// Alias for convenience
export const db = prisma;

export default prisma;

// Cache the connection status to avoid repeated checks
let connectionTested = false;
let connectionSuccessful = false;

// Helper to check if database is available
export function isDatabaseAvailable(): boolean {
  const client = getPrisma();
  const available = client !== null;
  console.log('[DB] isDatabaseAvailable:', available);
  return available;
}

// Check if database can actually connect (async version)
export async function canConnectToDatabase(): Promise<boolean> {
  const client = getPrisma();
  if (!client) {
    console.log('[DB] canConnectToDatabase: No client available');
    return false;
  }
  
  // Return cached result if available
  if (connectionTested) {
    return connectionSuccessful;
  }
  
  try {
    // Try a simple query to test the connection
    await client.$queryRaw`SELECT 1`;
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
  const client = getPrisma();
  if (!client) {
    return { success: false, error: 'Prisma client not initialized' };
  }
  
  try {
    // Try a simple query to test the connection
    await client.$queryRaw`SELECT 1`;
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
  const client = getPrisma();
  if (!client) {
    console.warn('[DB] Database not available, returning fallback value');
    return fallback;
  }
  try {
    return await operation(client);
  } catch (error) {
    console.error('[DB] Database operation failed:', error);
    return fallback;
  }
}
