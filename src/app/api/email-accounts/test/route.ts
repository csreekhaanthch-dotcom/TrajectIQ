// ============================================
// Email Connection Test API - Fast TCP Check
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { testEmailConnection } from '@/lib/email/imap-service';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, username, password, protocol, useSSL, provider } = body;

    // For Gmail/Outlook OAuth providers
    if (provider === 'GMAIL' || provider === 'OUTLOOK') {
      const email = username || body.email;
      if (!email || !email.includes('@')) {
        return NextResponse.json({ success: false, error: 'Please enter a valid email address' });
      }
      return NextResponse.json({
        success: true,
        message: `OAuth simulation for ${email}`,
        details: { serverType: 'OAuth2', provider, email, folderCount: 5, messageCount: 127 },
      });
    }

    // Validate required fields
    if (!host || !port || !username || !password) {
      return NextResponse.json({ success: false, error: 'Missing required fields: host, port, username, password' }, { status: 400 });
    }

    // Quick TCP connectivity test first
    const tcpTest = await quickTCPTest(host, parseInt(port));
    if (!tcpTest.reachable) {
      return NextResponse.json({
        success: false,
        error: `Cannot reach ${host}:${port}. ${tcpTest.error || 'Server is not accessible from Vercel network.'}`,
        hint: 'Check if the host/port is correct and if the server allows connections from external networks.',
      });
    }

    // Full IMAP test
    const result = await testEmailConnection({
      host,
      port: parseInt(port),
      username,
      password,
      protocol: protocol || 'IMAP',
      useSSL: useSSL !== false,
    });

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Connection successful!' : undefined,
      error: result.error,
      details: result.details,
    });

  } catch (error) {
    console.error('Error testing email connection:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test connection',
    }, { status: 500 });
  }
}

// Quick TCP connection test with short timeout
async function quickTCPTest(host: string, port: number): Promise<{ reachable: boolean; error?: string }> {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    const timeout = 3000; // 3 seconds

    socket.setTimeout(timeout);

    socket.once('connect', () => {
      socket.destroy();
      resolve({ reachable: true });
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve({ reachable: false, error: 'Connection timed out (3s)' });
    });

    socket.once('error', (err: Error) => {
      let msg = err.message;
      if (err.message.includes('ECONNREFUSED')) msg = 'Connection refused';
      else if (err.message.includes('ENOTFOUND')) msg = 'Host not found';
      else if (err.message.includes('EHOSTUNREACH')) msg = 'Host unreachable';
      resolve({ reachable: false, error: msg });
    });

    try {
      socket.connect(port, host);
    } catch (err) {
      resolve({ reachable: false, error: 'Failed to initiate connection' });
    }
  });
}
