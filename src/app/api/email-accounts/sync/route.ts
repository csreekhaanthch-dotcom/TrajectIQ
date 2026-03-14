// ============================================
// Email Sync API - With Date Range Support
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/utils/encryption';
import Imap from 'imap';

export const maxDuration = 15;
export const dynamic = 'force-dynamic';

// Quick TCP test
async function testTCP(host: string, port: number): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    const timeout = 2000;

    socket.setTimeout(timeout);
    socket.once('connect', () => { socket.destroy(); resolve({ ok: true }); });
    socket.once('timeout', () => { socket.destroy(); resolve({ ok: false, error: 'TCP timeout (2s)' }); });
    socket.once('error', (err: Error) => { resolve({ ok: false, error: err.message }); });
    try { socket.connect(port, host); } catch (e) { resolve({ ok: false, error: 'Connect failed' }); }
  });
}

export async function POST(request: NextRequest) {
  const requestId = `sync-${Date.now()}`;
  console.log(`[${requestId}] START`);

  if (!db) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Auth required' }, { status: 401 });

    const body = await request.json();
    const { accountId, dateRange } = body;
    if (!accountId) return NextResponse.json({ success: false, error: 'Missing accountId' }, { status: 400 });

    const account = await db.emailAccount.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    if (!account.encryptedCredentials) {
      return NextResponse.json({ success: false, error: 'No credentials. Please reconnect.', needsReconnect: true });
    }

    let creds: any;
    try {
      creds = JSON.parse(decrypt(account.encryptedCredentials));
    } catch {
      return NextResponse.json({ success: false, error: 'Cannot decrypt credentials. Please reconnect.', needsReconnect: true });
    }

    if (!creds.host || !creds.port || !creds.username || !creds.password) {
      return NextResponse.json({ success: false, error: 'Incomplete credentials. Please reconnect.', needsReconnect: true });
    }

    console.log(`[${requestId}] Testing TCP to ${creds.host}:${creds.port}`);
    
    // Quick TCP test first
    const tcpResult = await testTCP(creds.host, creds.port);
    if (!tcpResult.ok) {
      console.log(`[${requestId}] TCP failed:`, tcpResult.error);
      await db.emailAccount.update({
        where: { id: accountId },
        data: { syncStatus: 'ERROR', errorMessage: `Server unreachable: ${tcpResult.error}` },
      });
      return NextResponse.json({
        success: false,
        error: `Cannot reach ${creds.host}:${creds.port}. ${tcpResult.error || 'Check if server is accessible from internet.'}`,
      });
    }

    console.log(`[${requestId}] TCP OK, starting IMAP sync, dateRange: ${dateRange}`);
    
    // Update status
    await db.emailAccount.update({
      where: { id: accountId },
      data: { syncStatus: 'SYNCING', errorMessage: null },
    });

    // Do IMAP sync with date range
    const result = await doIMAPSync(creds, accountId, requestId, dateRange);

    // Update final status
    await db.emailAccount.update({
      where: { id: accountId },
      data: {
        isConnected: result.success,
        lastSyncAt: result.success ? new Date() : undefined,
        syncStatus: result.success ? 'SYNCED' : 'ERROR',
        errorMessage: result.error || null,
      },
    });

    console.log(`[${requestId}] ${result.success ? 'SUCCESS' : 'FAILED'}`);
    return NextResponse.json({ success: result.success, stats: result.stats, error: result.error });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// IMAP Sync with timeout
function doIMAPSync(creds: any, accountId: string, requestId: string, dateRange?: string): Promise<{ success: boolean; stats?: any; error?: string }> {
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        imap.destroy();
        console.log(`[${requestId}] IMAP timeout`);
        resolve({ success: false, error: 'IMAP connection timed out (5s). Server may be slow or unreachable.' });
      }
    }, 5000);

    const imap = new Imap({
      user: creds.username,
      password: creds.password,
      host: creds.host,
      port: creds.port,
      tls: creds.useSSL !== false,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 4000,
      authTimeout: 3000,
    });

    imap.once('ready', () => {
      console.log(`[${requestId}] IMAP ready`);
      imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          clearTimeout(timeout);
          if (!resolved) { resolved = true; resolve({ success: false, error: `Open inbox failed: ${err.message}` }); }
          imap.end();
          return;
        }

        const totalMessages = box.messages.total;
        console.log(`[${requestId}] INBOX opened, ${totalMessages} total messages`);

        // Calculate date range based on parameter
        let sinceDays = 30; // Default 30 days
        if (dateRange === '7') sinceDays = 7;
        else if (dateRange === '30') sinceDays = 30;
        else if (dateRange === '60') sinceDays = 60;
        else if (dateRange === '90') sinceDays = 90;
        else if (dateRange === 'all') sinceDays = 365; // Cap at 1 year for "all"

        const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
        const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateStr = `${String(since.getDate()).padStart(2, '0')}-${m[since.getMonth()]}-${since.getFullYear()}`;
        
        console.log(`[${requestId}] Searching emails since ${dateStr} (${sinceDays} days)`);

        imap.search([['SINCE', dateStr]], async (err, results) => {
          if (err) {
            clearTimeout(timeout);
            console.log(`[${requestId}] Search error:`, err);
            if (!resolved) { resolved = true; resolve({ success: false, error: `Search failed: ${err.message}` }); }
            imap.end();
            return;
          }

          const foundCount = results?.length || 0;
          console.log(`[${requestId}] Found ${foundCount} emails matching date filter`);

          if (!results || results.length === 0) {
            clearTimeout(timeout);
            if (!resolved) { 
              resolved = true; 
              resolve({ 
                success: true, 
                stats: { 
                  emailsFetched: 0, 
                  newThreads: 0, 
                  newAttachments: 0,
                  totalInInbox: totalMessages,
                  foundInDateRange: 0,
                  dateRange: `${sinceDays} days`,
                  message: totalMessages > 0 
                    ? `No emails found in the last ${sinceDays} days. Your inbox has ${totalMessages} total messages. Try a longer date range.`
                    : 'Your inbox is empty.'
                } 
              }); 
            }
            imap.end();
            return;
          }

          // Limit to 25 emails max
          const limit = results.slice(-25);
          console.log(`[${requestId}] Fetching ${limit.length} emails (max 25)`);

          const fetch = imap.fetch(limit, { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true });
          const emails: any[] = [];

          fetch.on('message', (msg) => {
            let header = '', attrs: any = null;
            msg.on('body', (stream) => {
              const chunks: Buffer[] = [];
              stream.on('data', (c: Buffer) => chunks.push(c));
              stream.once('end', () => { header = Buffer.concat(chunks).toString(); });
            });
            msg.once('attributes', (a: any) => { attrs = a; });
            msg.once('end', () => {
              const from = header.match(/From:\s*(.+)/i)?.[1]?.trim() || '';
              const subj = header.match(/Subject:\s*(.+)/i)?.[1]?.trim() || '(No Subject)';
              const date = header.match(/Date:\s*(.+)/i)?.[1];
              let fromEmail = from.match(/<([^>]+)>/)?.[1] || from;

              const atts: any[] = [];
              const findAtt = (p: any) => {
                if (!p) return;
                if (Array.isArray(p)) p.forEach(findAtt);
                else if (p.disposition?.type === 'attachment' || p.disposition === 'attachment') {
                  atts.push({ filename: p.disposition.params?.filename || 'unknown', mimeType: `${p.type}/${p.subtype}`, size: p.size || 0 });
                }
                if (p.childNodes) p.childNodes.forEach(findAtt);
              };
              if (attrs?.struct) findAtt([attrs.struct]);

              emails.push({ id: `INBOX-${attrs?.uid}`, subject: subj, from, fromEmail, date: date ? new Date(date) : new Date(), attachments: atts });
            });
          });

          fetch.once('error', (e) => {
            clearTimeout(timeout);
            if (!resolved) { resolved = true; resolve({ success: false, error: `Fetch error: ${e.message}` }); }
          });

          fetch.once('end', async () => {
            clearTimeout(timeout);
            console.log(`[${requestId}] Got ${emails.length} emails, ${emails.filter(e => e.attachments.length > 0).length} with attachments`);

            let newThreads = 0, newAtts = 0, skipped = 0;
            for (const e of emails) {
              try {
                const exists = await db!.emailThread.findUnique({ where: { emailAccountId_externalId: { emailAccountId: accountId, externalId: e.id } } });
                if (exists) { skipped++; continue; }

                const t = await db!.emailThread.create({
                  data: { emailAccountId: accountId, externalId: e.id, subject: e.subject, sender: e.from || 'Unknown', senderEmail: e.fromEmail || '', recipient: '', receivedAt: e.date, rawContent: '', isRequirement: false },
                });
                newThreads++;

                for (const a of e.attachments) {
                  const isResume = /\.(pdf|doc|docx)$/i.test(a.filename) || /resume|cv/i.test(a.filename);
                  await db!.attachment.create({ data: { threadId: t.id, filename: a.filename, mimeType: a.mimeType, fileSize: a.size, contentHash: `${t.id}-${a.filename}`, isResume } });
                  newAtts++;
                }
              } catch (err) { console.error(`[${requestId}] Save error:`, err); }
            }

            if (!resolved) { 
              resolved = true; 
              resolve({ 
                success: true, 
                stats: { 
                  emailsFetched: emails.length, 
                  newThreads, 
                  newAttachments: newAtts,
                  skipped,
                  totalInInbox: totalMessages,
                  foundInDateRange: foundCount,
                  withAttachments: emails.filter(e => e.attachments.length > 0).length,
                  dateRange: `${sinceDays} days`,
                } 
              }); 
            }
            imap.end();
          });
        });
      });
    });

    imap.once('error', (err: Error) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        let msg = err.message;
        if (err.message.includes('ECONNREFUSED')) msg = 'Connection refused';
        else if (err.message.includes('ETIMEDOUT')) msg = 'Connection timed out';
        else if (err.message.includes('ENOTFOUND')) msg = 'Host not found';
        else if (err.message.includes('LOGIN') || err.message.includes('credentials')) msg = 'Invalid username or password';
        resolve({ success: false, error: msg });
      }
    });

    imap.connect();
  });
}
