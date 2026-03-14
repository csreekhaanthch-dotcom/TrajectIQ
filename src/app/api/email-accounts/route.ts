// ============================================
// Email Accounts API
// ============================================
// CRUD operations for email account management

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { encrypt } from '@/lib/utils/encryption';
import { testEmailConnection } from '@/lib/email/imap-service';

// ============================================
// GET - List all email accounts for current user
// ============================================

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Use authenticated user's organization if not specified
    const targetOrgId = organizationId || user.organizationId;
    
    if (!targetOrgId) {
      return NextResponse.json(
        { error: 'No organization found for user' },
        { status: 400 }
      );
    }

    // Verify user has access to this organization
    if (organizationId && organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied to this organization' },
        { status: 403 }
      );
    }

    const accounts = await db.emailAccount.findMany({
      where: {
        userId: user.id,
        organizationId: targetOrgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        provider: true,
        email: true,
        protocol: true,
        isConnected: true,
        lastSyncAt: true,
        syncStatus: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email accounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create new email account
// ============================================

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'User has no organization' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      provider,
      email,
      protocol,
      host,
      port,
      username,
      password,
      useSSL,
    } = body;

    // Validate required fields
    if (!provider || !email) {
      return NextResponse.json(
        { error: 'Provider and email are required' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await db.emailAccount.findUnique({
      where: {
        userId_email: {
          userId: user.id,
          email,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email account already exists' },
        { status: 400 }
      );
    }

    // For custom IMAP/POP3, test the connection first
    let connectionTest: { success: boolean; error?: string; details?: any } = { success: true };
    
    if (['CUSTOM_IMAP', 'CUSTOM_POP3'].includes(provider)) {
      if (!host || !port || !username || !password) {
        return NextResponse.json(
          { error: 'Missing IMAP/POP3 configuration (host, port, username, password)' },
          { status: 400 }
        );
      }

      connectionTest = await testEmailConnection({
        host,
        port: parseInt(String(port)),
        username,
        password,
        protocol: protocol || 'IMAP',
        useSSL: useSSL !== false,
      });

      if (!connectionTest.success) {
        return NextResponse.json(
          { 
            error: 'Connection test failed', 
            details: connectionTest.error 
          },
          { status: 400 }
        );
      }
    }

    // Encrypt credentials
    const credentials = JSON.stringify({
      host,
      port: parseInt(String(port)),
      username,
      password,
      useSSL: useSSL !== false,
    });
    const encryptedCredentials = encrypt(credentials);

    // Create email account
    const account = await db.emailAccount.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        provider,
        email,
        protocol: protocol || 'IMAP',
        encryptedCredentials,
        isConnected: connectionTest.success,
        syncStatus: connectionTest.success ? 'PENDING' : 'ERROR',
        errorMessage: connectionTest.error || null,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        provider: account.provider,
        email: account.email,
        protocol: account.protocol,
        isConnected: account.isConnected,
        syncStatus: account.syncStatus,
        connectionDetails: connectionTest.details,
      },
    });
  } catch (error) {
    console.error('Error creating email account:', error);
    return NextResponse.json(
      { error: 'Failed to create email account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Update email account
// ============================================

export async function PUT(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, host, port, username, password, useSSL } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing account ID' },
        { status: 400 }
      );
    }

    // Get existing account and verify ownership
    const existing = await db.emailAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Verify user owns this account
    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Test new connection if credentials provided
    let connectionTest: { success: boolean; error?: string } = { success: true };
    
    if (host && port && username && password) {
      connectionTest = await testEmailConnection({
        host,
        port: parseInt(String(port)),
        username,
        password,
        protocol: existing.protocol as 'IMAP' | 'POP3',
        useSSL: useSSL !== false,
      });
    }

    // Encrypt new credentials if provided
    let encryptedCredentials = existing.encryptedCredentials;
    
    if (host && port && username && password) {
      const credentials = JSON.stringify({
        host,
        port: parseInt(String(port)),
        username,
        password,
        useSSL: useSSL !== false,
      });
      encryptedCredentials = encrypt(credentials);
    }

    // Update account
    const account = await db.emailAccount.update({
      where: { id },
      data: {
        encryptedCredentials,
        isConnected: connectionTest.success,
        syncStatus: connectionTest.success ? 'PENDING' : 'ERROR',
        errorMessage: connectionTest.error || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        isConnected: account.isConnected,
        syncStatus: account.syncStatus,
      },
    });
  } catch (error) {
    console.error('Error updating email account:', error);
    return NextResponse.json(
      { error: 'Failed to update email account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Remove email account
// ============================================

export async function DELETE(request: NextRequest) {
  if (!db) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing account ID' },
        { status: 400 }
      );
    }

    // Get existing account and verify ownership
    const existing = await db.emailAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Verify user owns this account
    if (existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete related records first
    await db.emailThread.deleteMany({
      where: { emailAccountId: id },
    });

    await db.emailAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email account:', error);
    return NextResponse.json(
      { error: 'Failed to delete email account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
