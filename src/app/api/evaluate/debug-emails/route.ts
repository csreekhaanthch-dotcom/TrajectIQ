// Debug API - Check email sync status and data
import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { decrypt } from '@/lib/utils/encryption';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database not available',
        hint: 'Make sure DATABASE_URL is configured in your environment'
      }, { status: 503 });
    }

    // Get all email accounts for this organization
    const emailAccounts = await db!.emailAccount.findMany({
      where: { organizationId: session.organizationId! },
      select: {
        id: true,
        email: true,
        provider: true,
        isConnected: true,
        lastSyncAt: true,
        syncStatus: true,
        errorMessage: true,
        encryptedCredentials: true,
        _count: {
          select: { emailThreads: true }
        }
      },
    });

    // Get thread counts with attachments
    const debugData = await Promise.all(emailAccounts.map(async (account) => {
      // Check if credentials are valid
      let hasValidCredentials = false;
      let credentialError = null;
      
      try {
        const credentials = JSON.parse(decrypt(account.encryptedCredentials));
        hasValidCredentials = !!(credentials.host && credentials.port && credentials.username && credentials.password);
        
        if (!hasValidCredentials) {
          credentialError = 'Missing IMAP credentials. OAuth accounts cannot sync - use Custom IMAP instead.';
        }
      } catch (e) {
        credentialError = 'Failed to decrypt credentials';
      }
      
      // Get threads with attachments
      const threadsWithAttachments = await db!.emailThread.count({
        where: {
          emailAccountId: account.id,
          attachments: { some: {} }
        }
      });

      // Get resume attachments count
      const resumeAttachments = await db!.attachment.count({
        where: {
          thread: { emailAccountId: account.id },
          isResume: true
        }
      });

      // Get all attachments count
      const totalAttachments = await db!.attachment.count({
        where: {
          thread: { emailAccountId: account.id }
        }
      });

      // Get sample threads with attachments
      const sampleThreads = await db!.emailThread.findMany({
        where: {
          emailAccountId: account.id,
          attachments: { some: {} }
        },
        select: {
          id: true,
          subject: true,
          sender: true,
          senderEmail: true,
          receivedAt: true,
          rawContent: true,
          attachments: {
            select: {
              id: true,
              filename: true,
              mimeType: true,
              isResume: true,
              parsedContent: true,
            }
          }
        },
        take: 5,
        orderBy: { receivedAt: 'desc' }
      });

      return {
        account: {
          id: account.id,
          email: account.email,
          provider: account.provider,
          isConnected: account.isConnected,
          lastSyncAt: account.lastSyncAt,
          syncStatus: account.syncStatus,
          errorMessage: account.errorMessage,
          totalThreads: account._count.emailThreads,
          hasValidCredentials,
          credentialError,
        },
        stats: {
          threadsWithAttachments,
          totalAttachments,
          resumeAttachments,
        },
        sampleThreads: sampleThreads.map(t => ({
          id: t.id,
          subject: t.subject,
          sender: t.sender,
          senderEmail: t.senderEmail,
          receivedAt: t.receivedAt,
          hasRawContent: !!t.rawContent,
          rawContentLength: t.rawContent?.length || 0,
          attachments: t.attachments.map(a => ({
            filename: a.filename,
            mimeType: a.mimeType,
            isResume: a.isResume,
            hasParsedContent: !!a.parsedContent,
            parsedContentLength: a.parsedContent?.length || 0,
          }))
        }))
      };
    }));

    return NextResponse.json({
      success: true,
      organizationId: session.organizationId,
      totalAccounts: emailAccounts.length,
      data: debugData,
      hint: emailAccounts.length > 0 && !debugData.some(d => d.account.hasValidCredentials)
        ? 'None of your email accounts have valid IMAP credentials. Please connect using "Custom IMAP" option with your email server details.'
        : null,
    });

  } catch (error) {
    console.error('Debug emails error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to debug emails', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
