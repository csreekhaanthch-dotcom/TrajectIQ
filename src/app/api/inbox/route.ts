// ============================================
// Inbox API
// ============================================
// Fetch synced email threads with attachments

import { NextRequest, NextResponse } from 'next/server';
import { db, isDatabaseAvailable } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// ============================================
// GET - List email threads with attachments
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - no session' },
        { status: 401 }
      );
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        threads: [],
      });
    }

    // Get user from database to ensure we have the latest organizationId
    const user = await prisma!.user.findUnique({
      where: { id: session.userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const organizationId = user.organizationId;

    if (!organizationId) {
      return NextResponse.json({
        success: true,
        threads: [],
        message: 'User has no organization',
      });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    // Get email accounts for this organization
    const emailAccounts = await db!.emailAccount.findMany({
      where: { organizationId },
      select: { id: true, email: true, isConnected: true },
    });

    console.log('[Inbox] Filter:', filter, 'Email accounts:', emailAccounts.length);

    const accountIds = emailAccounts.map(a => a.id);

    if (accountIds.length === 0) {
      return NextResponse.json({
        success: true,
        threads: [],
        hasEmailAccounts: false,
      });
    }

    // Build where clause based on filter
    let whereClause: any = {
      emailAccountId: { in: accountIds },
    };

    // Updated filter logic - simpler and more intuitive
    if (filter === 'attachments') {
      // Emails with ANY attachments
      whereClause.attachments = {
        some: {}
      };
    } else if (filter === 'resumes') {
      // Emails with resume-like attachments (PDF, DOC, DOCX)
      whereClause.attachments = {
        some: { 
          OR: [
            { filename: { endsWith: '.pdf', mode: 'insensitive' } },
            { filename: { endsWith: '.doc', mode: 'insensitive' } },
            { filename: { endsWith: '.docx', mode: 'insensitive' } },
            { isResume: true }
          ]
        }
      };
    } else if (filter === 'requirements') {
      // Emails marked as job requirements
      whereClause.isRequirement = true;
    }
    // 'all' filter doesn't need additional conditions

    console.log('[Inbox] Where clause:', JSON.stringify(whereClause, null, 2));

    // Fetch threads with attachments
    const threads = await db!.emailThread.findMany({
      where: whereClause,
      include: {
        attachments: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            fileSize: true,
            isResume: true,
            isProcessed: true,
          },
        },
        emailAccount: {
          select: {
            email: true,
            provider: true,
          },
        },
      },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });

    console.log('[Inbox] Found threads:', threads.length);

    // Format response
    const formattedThreads = threads.map(thread => ({
      id: thread.id,
      subject: thread.subject,
      sender: thread.sender,
      senderEmail: thread.senderEmail,
      recipient: thread.recipient,
      receivedAt: thread.receivedAt.toISOString(),
      isRequirement: thread.isRequirement,
      hasReplies: thread.hasReplies,
      replyCount: thread.replyCount,
      preview: thread.rawContent?.substring(0, 200) || '',
      emailAccount: thread.emailAccount,
      attachments: thread.attachments.map(att => ({
        id: att.id,
        filename: att.filename,
        mimeType: att.mimeType,
        fileSize: att.fileSize,
        isResume: att.isResume || isResumeFilename(att.filename),
        isProcessed: att.isProcessed,
      })),
    }));

    // Count for each filter type
    const counts = {
      all: await db!.emailThread.count({ where: { emailAccountId: { in: accountIds } } }),
      attachments: await db!.emailThread.count({ 
        where: { emailAccountId: { in: accountIds }, attachments: { some: {} } } 
      }),
      resumes: await db!.emailThread.count({ 
        where: { 
          emailAccountId: { in: accountIds }, 
          attachments: { 
            some: { 
              OR: [
                { filename: { endsWith: '.pdf', mode: 'insensitive' } },
                { filename: { endsWith: '.doc', mode: 'insensitive' } },
                { filename: { endsWith: '.docx', mode: 'insensitive' } },
                { isResume: true }
              ]
            } 
          } 
        } 
      }),
      requirements: await db!.emailThread.count({ 
        where: { emailAccountId: { in: accountIds }, isRequirement: true } 
      }),
    };

    return NextResponse.json({
      success: true,
      threads: formattedThreads,
      hasEmailAccounts: true,
      emailAccounts: emailAccounts.map(a => ({ id: a.id, email: a.email, isConnected: a.isConnected })),
      counts,
    });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbox', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper to detect resume filenames
function isResumeFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx') ||
         /resume|cv|curriculum/i.test(filename);
}

// ============================================
// POST - Process email thread
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isDatabaseAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Get user from database
    const user = await prisma!.user.findUnique({
      where: { id: session.userId },
      select: { id: true, organizationId: true },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      );
    }

    const organizationId = user.organizationId;
    const userId = user.id;

    const body = await request.json();
    const { action, threadId, attachmentId, requirementId } = body;

    if (!action || !threadId) {
      return NextResponse.json(
        { success: false, error: 'Missing action or threadId' },
        { status: 400 }
      );
    }

    // Verify thread belongs to user's organization
    const thread = await db!.emailThread.findFirst({
      where: { id: threadId },
      include: {
        emailAccount: { select: { organizationId: true } },
        attachments: true,
      },
    });

    if (!thread || thread.emailAccount.organizationId !== organizationId) {
      return NextResponse.json(
        { success: false, error: 'Thread not found' },
        { status: 404 }
      );
    }

    if (action === 'markAsRequirement') {
      // Mark thread as a job requirement
      await db!.emailThread.update({
        where: { id: threadId },
        data: { isRequirement: true },
      });

      // Create requirement from email
      const requirement = await db!.requirement.create({
        data: {
          organizationId,
          createdById: userId,
          emailAccountId: thread.emailAccountId,
          threadId: thread.id,
          title: thread.subject,
          sourceEmailSubject: thread.subject,
          sourceEmailBody: thread.rawContent,
          status: 'DRAFT',
          requiredSkills: '[]',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Email marked as requirement',
        requirement: {
          id: requirement.id,
          title: requirement.title,
        },
      });
    }

    if (action === 'createCandidate') {
      if (!attachmentId) {
        return NextResponse.json(
          { success: false, error: 'Missing attachmentId' },
          { status: 400 }
        );
      }

      const attachment = thread.attachments.find(a => a.id === attachmentId);
      if (!attachment) {
        return NextResponse.json(
          { success: false, error: 'Attachment not found' },
          { status: 404 }
        );
      }

      // Extract email as potential candidate email
      const emailMatch = thread.senderEmail?.match(/[\w.-]+@[\w.-]+\.\w+/);
      const candidateEmail = emailMatch ? emailMatch[0] : thread.senderEmail;

      // Parse sender name
      const nameParts = thread.sender.replace(/[<>"]/g, '').split(' ').filter(Boolean);
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Candidate';

      // Check if candidate already exists
      const existingCandidate = await db!.candidate.findFirst({
        where: {
          organizationId,
          email: candidateEmail,
        },
      });

      if (existingCandidate) {
        return NextResponse.json({
          success: false,
          error: 'Candidate already exists',
          candidate: {
            id: existingCandidate.id,
            name: `${existingCandidate.firstName} ${existingCandidate.lastName}`,
          },
        });
      }

      // Create candidate
      const candidate = await db!.candidate.create({
        data: {
          organizationId,
          createdById: userId,
          requirementId: requirementId || null,
          firstName,
          lastName,
          email: candidateEmail,
          source: 'EMAIL',
          rawResumeText: thread.rawContent,
          status: 'NEW',
        },
      });

      // Create resume record
      await db!.resume.create({
        data: {
          candidateId: candidate.id,
          attachmentId: attachment.id,
          skills: '[]',
          experience: '[]',
          education: '[]',
          originalFilename: attachment.filename,
          parsedAt: null,
        },
      });

      // Mark attachment as processed and as resume
      await db!.attachment.update({
        where: { id: attachmentId },
        data: { isProcessed: true, isResume: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Candidate created successfully',
        candidate: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
        },
      });
    }

    if (action === 'ignore') {
      // Mark all attachments as processed
      await db!.attachment.updateMany({
        where: { threadId },
        data: { isProcessed: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Thread ignored',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing thread:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process thread' },
      { status: 500 }
    );
  }
}
