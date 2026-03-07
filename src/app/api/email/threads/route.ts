import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { getEmailService } from '@/lib/email';
import { decrypt } from '@/lib/utils/encryption';
import type { EmailProvider, EmailProtocol } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const emailAccountId = searchParams.get('emailAccountId');
    const threadId = searchParams.get('threadId');
    const action = searchParams.get('action') || 'list';

    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      if (action === 'requirements') {
        return NextResponse.json({
          success: true,
          data: [
            { id: '1', subject: 'Senior Developer Position - Job Requirement', sender: 'hr@company.com', date: new Date().toISOString(), hasReplies: true },
            { id: '2', subject: 'We are hiring: Full Stack Engineer', sender: 'recruiting@startup.io', date: new Date(Date.now() - 86400000).toISOString(), hasReplies: false },
          ],
        });
      }

      return NextResponse.json({
        success: true,
        data: [
          { id: '1', subject: 'Re: Senior Developer Position', sender: 'candidate1@gmail.com', date: new Date().toISOString(), hasAttachment: true },
          { id: '2', subject: 'Application for Full Stack Role', sender: 'candidate2@outlook.com', date: new Date(Date.now() - 3600000).toISOString(), hasAttachment: true },
        ],
      });
    }

    // Get email account
    const emailAccount = await prisma!.emailAccount.findFirst({
      where: {
        id: emailAccountId || undefined,
        organizationId: session.organizationId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!emailAccount) {
      return NextResponse.json(
        { success: false, error: 'Email account not found' },
        { status: 404 }
      );
    }

    // Decrypt credentials and connect
    const credentials = JSON.parse(decrypt(emailAccount.encryptedCredentials));
    const emailService = getEmailService();

    await emailService.connect({
      provider: emailAccount.provider as EmailProvider,
      protocol: emailAccount.protocol as EmailProtocol,
      email: emailAccount.email,
      ...credentials,
    });

    try {
      if (action === 'requirements') {
        // Find job requirement emails
        const requirements = await emailService.findJobRequirementEmails({
          limit: 50,
        });

        return NextResponse.json({
          success: true,
          data: requirements,
        });
      }

      if (action === 'replies' && threadId) {
        // Find candidate replies to a specific thread
        const replies = await emailService.findCandidateReplies(threadId);

        return NextResponse.json({
          success: true,
          data: replies,
        });
      }

      if (action === 'resume') {
        const messageId = searchParams.get('messageId');
        if (!messageId) {
          return NextResponse.json(
            { success: false, error: 'Message ID required' },
            { status: 400 }
          );
        }

        // Fetch resume from reply
        const resume = await emailService.fetchResumeFromReply(messageId);

        if (!resume) {
          return NextResponse.json(
            { success: false, error: 'No resume found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            filename: resume.filename,
            mimeType: resume.mimeType,
            content: resume.content.toString('base64'),
          },
        });
      }

      // Default: list messages
      const messages = await emailService.getConnector()?.listMessages({
        limit: 20,
      }) || [];

      return NextResponse.json({
        success: true,
        data: messages,
      });
    } finally {
      await emailService.disconnect();
    }
  } catch (error) {
    console.error('Email threads error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
