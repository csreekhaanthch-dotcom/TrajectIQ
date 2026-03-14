import { NextResponse } from 'next/server';
import { prisma, isDatabaseAvailable, testDatabaseConnection, canConnectToDatabase } from '@/lib/db';

export async function GET() {
  const health: {
    status: string;
    timestamp: string;
    database: {
      available: boolean;
      connected: boolean;
      error?: string;
    };
    environment: {
      nodeEnv: string;
      hasDatabaseUrl: boolean;
      hasJwtSecret: boolean;
      isVercel: boolean;
      databaseUrlType: string;
    };
    instructions?: string;
  } = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    database: {
      available: false,
      connected: false,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      isVercel: !!process.env.VERCEL,
      databaseUrlType: 'not_set',
    },
  };

  // Determine database URL type
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
      health.environment.databaseUrlType = 'postgresql';
    } else if (dbUrl.startsWith('file:')) {
      health.environment.databaseUrlType = 'sqlite';
    } else if (dbUrl.startsWith('mysql://')) {
      health.environment.databaseUrlType = 'mysql';
    } else {
      health.environment.databaseUrlType = 'unknown';
    }
  }

  // Check if Prisma client is available
  health.database.available = isDatabaseAvailable();

  // Test actual database connection
  if (health.database.available) {
    const connectionTest = await testDatabaseConnection();
    health.database.connected = connectionTest.success;
    if (!connectionTest.success) {
      health.database.error = connectionTest.error;
    }
  } else {
    health.database.error = 'Prisma client not initialized';
  }

  // Determine overall status and provide instructions
  if (health.database.connected) {
    health.status = 'healthy';
  } else if (health.database.available) {
    health.status = 'degraded';
    health.instructions = 'Database client initialized but cannot connect. Check DATABASE_URL credentials.';
  } else {
    health.status = 'unhealthy';
    if (health.environment.isVercel && health.environment.databaseUrlType === 'sqlite') {
      health.instructions = 'SQLite file URLs do not work on Vercel. Set up a PostgreSQL database (e.g., Neon, Supabase, Railway) and update DATABASE_URL.';
    } else if (!health.environment.hasDatabaseUrl) {
      health.instructions = 'DATABASE_URL environment variable is not set. Please configure a PostgreSQL database URL.';
    } else {
      health.instructions = 'Database connection failed. Check your DATABASE_URL configuration.';
    }
  }

  return NextResponse.json(health, { 
    status: health.status === 'healthy' ? 200 : 503 
  });
}
