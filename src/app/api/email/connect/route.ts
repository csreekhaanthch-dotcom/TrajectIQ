import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, isDatabaseAvailable } from '@/lib/db';
import { encrypt } from '@/lib/utils/encryption';
import { getEmailService, PROVIDER_CONFIGS } from '@/lib/email';
import { z } from 'zod';
import type { EmailProvider, EmailProtocol } from '@/types';

const connectEmailSchema = z.object({
  provider: z.enum(['GMAIL', 'OUTLOOK', 'YAHOO', 'CUSTOM_IMAP', 'CUSTOM_POP3']),
  email: z.string().email(),
  protocol: z.enum(['IMAP', 'POP3', 'OAUTH']).optional(),
  host: z.string().optional(),
  port: z.number().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  accessToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = connectEmailSchema.parse(body);

    // Return demo response if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        data: {
          id: 'demo-email-' + Date.now(),
          provider: validatedData.provider,
          email: validatedData.email,
          isConnected: true,
        },
      });
    }

    // Get provider config
    const providerConfig = PROVIDER_CONFIGS[validatedData.provider as EmailProvider];
    const protocol = validatedData.protocol || providerConfig.protocols[0];

    // Prepare connection config
    const connectionConfig = {
      provider: validatedData.provider as EmailProvider,
      protocol: protocol as EmailProtocol,
      email: validatedData.email,
      host: validatedData.host || providerConfig.defaultHost,
      port: validatedData.port || providerConfig.defaultPort,
      username: validatedData.username || validatedData.email,
      password: validatedData.password,
      accessToken: validatedData.accessToken,
      useTLS: true,
    };

    // Test connection first
    const emailService = getEmailService();
    const testResult = await emailService.testConnection(connectionConfig);

    if (!testResult.success) {
      return NextResponse.json(
        { success: false, error: testResult.error || 'Connection failed' },
        { status: 400 }
      );
    }

    // Encrypt credentials
    const credentialsToEncrypt = {
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.username,
      password: connectionConfig.password,
      accessToken: connectionConfig.accessToken,
    };
    const encryptedCredentials = encrypt(JSON.stringify(credentialsToEncrypt));

    // Save to database
    const emailAccount = await prisma!.emailAccount.create({
      data: {
        userId: session.userId,
        organizationId: session.organizationId || '',
        provider: validatedData.provider as EmailProvider,
        email: validatedData.email,
        protocol: protocol as EmailProtocol,
        encryptedCredentials,
        accessToken: validatedData.accessToken,
        isConnected: true,
        lastSyncAt: new Date(),
        syncStatus: 'SYNCED',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: emailAccount.id,
        provider: emailAccount.provider,
        email: emailAccount.email,
        isConnected: emailAccount.isConnected,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Email connect error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return demo data if database is not available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({
        success: true,
        data: [
          { id: '1', provider: 'GMAIL', email: 'demo@gmail.com', protocol: 'IMAP', isConnected: true, lastSyncAt: new Date().toISOString(), syncStatus: 'SYNCED', createdAt: new Date().toISOString() },
        ],
      });
    }

    const emailAccounts = await prisma!.emailAccount.findMany({
      where: {
        organizationId: session.organizationId,
      },
      select: {
        id: true,
        provider: true,
        email: true,
        protocol: true,
        isConnected: true,
        lastSyncAt: true,
        syncStatus: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: emailAccounts,
    });
  } catch (error) {
    console.error('Get email accounts error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
