// Debug API to check email sync status
import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma!.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        organizationId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organizationId = user.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: 'User has no organization' }, { status: 400 });
    }

    // Get email accounts
    const emailAccounts = await db!.emailAccount.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        provider: true,
        protocol: true,
        isConnected: true,
        syncStatus: true,
        lastSyncAt: true,
        errorMessage: true,
        createdAt: true,
        _count: {
          select: { emailThreads: true }
        }
      }
    });

    // Get total threads
    const totalThreads = await db!.emailThread.count();

    // Get threads with attachments
    const threadsWithAttachments = await db!.emailThread.findMany({
      where: {
        emailAccount: { organizationId }
      },
      include: {
        attachments: true,
        emailAccount: { select: { email: true } }
      },
      take: 10,
      orderBy: { receivedAt: 'desc' }
    });

    // Get all threads for this org
    const orgThreads = await db!.emailThread.count({
      where: {
        emailAccount: { organizationId }
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        name: `${user.firstName} ${user.lastName}`
      },
      emailAccounts: emailAccounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        provider: acc.provider,
        isConnected: acc.isConnected,
        syncStatus: acc.syncStatus,
        lastSyncAt: acc.lastSyncAt,
        errorMessage: acc.errorMessage,
        threadCount: acc._count.emailThreads
      })),
      stats: {
        totalThreadsInDatabase: totalThreads,
        orgThreads: orgThreads,
        threadsWithAttachments: threadsWithAttachments.map(t => ({
          id: t.id,
          subject: t.subject,
          sender: t.sender,
          hasAttachments: t.attachments.length > 0,
          attachmentCount: t.attachments.length,
          attachments: t.attachments.map(a => ({
            filename: a.filename,
            isResume: a.isResume,
            isProcessed: a.isProcessed
          }))
        }))
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: 'Internal error',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 });
  }
}
