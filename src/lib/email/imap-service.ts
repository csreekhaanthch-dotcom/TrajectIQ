// ============================================
// Real IMAP/POP3 Email Service
// ============================================
// Implements actual email server connections

import Imap from 'imap';

export interface EmailConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: 'IMAP' | 'POP3';
  useSSL: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  details?: {
    serverType?: string;
    folderCount?: number;
    messageCount?: number;
  };
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: Date;
  body?: string;
  hasAttachment: boolean;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
  }>;
}

// ============================================
// IMAP Connection Test
// ============================================

export function testIMAPConnection(config: EmailConfig): Promise<ConnectionTestResult> {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.useSSL,
      tlsOptions: { 
        rejectUnauthorized: false,
        servername: config.host 
      },
      connTimeout: 5000,  // 5 seconds for faster response
      authTimeout: 5000,  // 5 seconds
    });

    let folderCount = 0;
    let messageCount = 0;

    imap.once('ready', () => {
      imap.getBoxes((err, boxes) => {
        if (err) {
          imap.end();
          resolve({
            success: true,
            details: { serverType: 'IMAP' },
          });
          return;
        }

        folderCount = Object.keys(boxes || {}).length;

        imap.openBox('INBOX', true, (err, box) => {
          imap.end();
          
          if (err) {
            resolve({
              success: true,
              details: { serverType: 'IMAP', folderCount },
            });
            return;
          }

          messageCount = box.messages.total;

          resolve({
            success: true,
            details: {
              serverType: 'IMAP',
              folderCount,
              messageCount,
            },
          });
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('[IMAP] Connection error:', err.message, err.stack);
      
      let errorMessage = err.message;
      
      if (err.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Check host and port.';
      } else if (err.message.includes('ETIMEDOUT') || err.message.includes('ETIMEDOUT')) {
        errorMessage = 'Connection timed out. Check host address and ensure the server is accessible from your network.';
      } else if (err.message.includes('ENOTFOUND')) {
        errorMessage = 'Server not found. Check host address.';
      } else if (err.message.includes('Invalid credentials') || err.message.includes('LOGIN failed') || err.message.includes('authentication failed')) {
        errorMessage = 'Invalid username or password. Please verify your credentials.';
      } else if (err.message.includes('self-signed certificate') || err.message.includes('certificate')) {
        errorMessage = 'SSL/TLS certificate error. The server certificate may be self-signed or invalid.';
      } else if (err.message.includes('unsupported protocol')) {
        errorMessage = 'Unsupported protocol. Server may not support IMAP on this port.';
      } else if (err.message.includes('ECONNRESET')) {
        errorMessage = 'Connection reset by server. The server may have closed the connection unexpectedly.';
      } else if (err.message.includes('EHOSTUNREACH')) {
        errorMessage = 'Host unreachable. Check if the server address is correct and accessible.';
      } else if (err.message.includes('EAI_AGAIN')) {
        errorMessage = 'DNS lookup failed. Please try again later.';
      }

      resolve({
        success: false,
        error: errorMessage,
      });
    });

    imap.once('end', () => {
      // Connection closed
    });

    try {
      imap.connect();
    } catch (err) {
      resolve({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to initiate connection',
      });
    }
  });
}

// ============================================
// POP3 Connection Test
// ============================================

export async function testPOP3Connection(config: EmailConfig): Promise<ConnectionTestResult> {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    const timeout = 10000;
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      let buffer = '';
      
      socket.on('data', (data: Buffer) => {
        buffer += data.toString();
        
        if (buffer.includes('+OK')) {
          socket.write('QUIT\r\n');
          socket.destroy();
          resolve({
            success: true,
            details: { serverType: 'POP3' },
          });
        } else if (buffer.includes('-ERR')) {
          socket.destroy();
          resolve({
            success: false,
            error: 'Server returned error. Check if this is a POP3 server.',
          });
        }
      });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        success: false,
        error: 'Connection timed out. Check host and port.',
      });
    });
    
    socket.on('error', (err: Error) => {
      let errorMessage = err.message;
      
      if (err.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Check host and port.';
      } else if (err.message.includes('ENOTFOUND')) {
        errorMessage = 'Server not found. Check host address.';
      }

      resolve({
        success: false,
        error: errorMessage,
      });
    });
    
    socket.connect(config.port, config.host);
  });
}

// ============================================
// Main Test Connection Function
// ============================================

export async function testEmailConnection(config: EmailConfig): Promise<ConnectionTestResult> {
  if (config.protocol === 'IMAP') {
    return testIMAPConnection(config);
  } else if (config.protocol === 'POP3') {
    return testPOP3Connection(config);
  }
  
  return {
    success: false,
    error: 'Unsupported protocol. Use IMAP or POP3.',
  };
}

// ============================================
// Fetch Emails (for sync)
// ============================================

export function fetchIMAPEmails(
  config: EmailConfig, 
  options: { 
    folder?: string; 
    limit?: number; 
    since?: Date;
    includeSubfolders?: boolean;
  } = {}
): Promise<EmailMessage[]> {
  return new Promise((resolve, reject) => {
    const messages: EmailMessage[] = [];
    
    console.log('[IMAP] Connecting to:', config.host, 'port:', config.port, 'user:', config.username);
    
    const imap = new Imap({
      user: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.useSSL,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 5000,  // 5 seconds for faster timeout
      authTimeout: 5000,  // 5 seconds
    });

    imap.once('ready', () => {
      const folderName = options.folder || 'INBOX';
      console.log('[IMAP] Connected, opening folder:', folderName);
      
      imap.openBox(folderName, true, (err, box) => {
        if (err) {
          console.error('[IMAP] Error opening box:', err);
          imap.end();
          reject(err);
          return;
        }

        const total = box.messages.total;
        console.log('[IMAP] Total messages in', folderName, ':', total);

        // Build search criteria - IMAP SINCE requires date in format: "01-Jan-2024"
        let searchCriteria: any[] = ['ALL'];
        
        if (options.since) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const d = options.since;
          const day = String(d.getDate()).padStart(2, '0');
          const month = months[d.getMonth()];
          const year = d.getFullYear();
          const imapDate = `${day}-${month}-${year}`;
          
          console.log('[IMAP] Searching emails since:', imapDate);
          searchCriteria = [['SINCE', imapDate]];
        } else {
          console.log('[IMAP] Searching all emails');
        }

        imap.search(searchCriteria, (searchErr, results) => {
          if (searchErr) {
            console.error('[IMAP] Search error:', searchErr);
            imap.end();
            reject(searchErr);
            return;
          }

          console.log('[IMAP] Search returned', results?.length || 0, 'results');

          if (!results || results.length === 0) {
            console.log('[IMAP] No emails found matching criteria');
            imap.end();
            resolve([]);
            return;
          }

          const limit = options.limit || 50;
          const limitedResults = results.slice(-limit);
          console.log('[IMAP] Fetching', limitedResults.length, 'emails (limit:', limit, ')');

          const fetch = imap.fetch(limitedResults, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
            struct: true,
          });

          fetch.on('message', (msg, seqno) => {
            let header = '';
            let body = '';
            let attrs: any = null;
            
            msg.on('body', (stream, info) => {
              const chunks: Buffer[] = [];
              
              stream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
              });
              
              stream.once('end', () => {
                const content = Buffer.concat(chunks).toString('utf8');
                if (info.which === 'TEXT') {
                  body = content;
                } else {
                  header = content;
                }
              });
            });
            
            msg.once('attributes', (a: any) => {
              attrs = a;
            });
            
            msg.once('end', () => {
              const fromMatch = header.match(/From:\s*(.+)/i);
              const toMatch = header.match(/To:\s*(.+)/i);
              const subjectMatch = header.match(/Subject:\s*(.+)/i);
              const dateMatch = header.match(/Date:\s*(.+)/i);
              
              let fromEmail = '';
              let from = fromMatch?.[1]?.trim() || '';
              const emailMatch = from.match(/<([^>]+)>/);
              if (emailMatch) {
                fromEmail = emailMatch[1];
                from = from.replace(/<[^>]+>/, '').trim().replace(/"/g, '');
              } else {
                fromEmail = from;
              }
              
              const attachments: Array<{ filename: string; mimeType: string; size: number }> = [];
              
              function findAttachments(parts: any[]) {
                for (const part of parts) {
                  if (part.disposition && part.disposition.type === 'attachment') {
                    const filename = part.disposition.params?.filename || part.params?.name || 'unknown';
                    attachments.push({
                      filename,
                      mimeType: part.type + '/' + part.subtype,
                      size: part.size || 0,
                    });
                  }
                  if (part.childNodes && part.childNodes.length > 0) {
                    findAttachments(part.childNodes);
                  }
                }
              }
              
              if (attrs?.struct) {
                findAttachments(attrs.struct);
              }
              
              messages.push({
                id: `${folderName}-${attrs?.uid?.toString() || seqno.toString()}`,
                subject: subjectMatch?.[1]?.trim() || '(No Subject)',
                from,
                fromEmail,
                to: toMatch?.[1]?.trim() || '',
                date: dateMatch ? new Date(dateMatch[1]) : new Date(),
                body: body.substring(0, 5000),
                hasAttachment: attachments.length > 0,
                attachments,
              });
            });
          });
          
          fetch.once('error', (err) => {
            console.error('[IMAP] Fetch error:', err);
            imap.end();
            reject(err);
          });
          
          fetch.once('end', () => {
            console.log('[IMAP] Fetched', messages.length, 'messages from', folderName);
            imap.end();
            resolve(messages.reverse());
          });
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('[IMAP] Connection error:', err);
      reject(err);
    });

    imap.connect();
  });
}

// ============================================
// Fetch Emails from All Folders
// ============================================

export async function fetchEmailsFromAllFolders(
  config: EmailConfig,
  options: {
    limit?: number;
    since?: Date;
    folderWhitelist?: string[];
  } = {}
): Promise<EmailMessage[]> {
  return new Promise((resolve, reject) => {
    const allMessages: EmailMessage[] = [];
    let hasError = false;
    
    console.log('[IMAP] Connecting to scan all folders...');
    console.log('[IMAP] Host:', config.host, 'Port:', config.port, 'User:', config.username);
    
    const imap = new Imap({
      user: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.useSSL,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 60000,  // 60 seconds for slow servers like IONOS
      authTimeout: 30000,  // 30 seconds
      keepalive: true,
    });

    imap.once('ready', () => {
      console.log('[IMAP] Connection ready, getting folder list...');
      
      // Get all mailboxes/folders
      imap.getBoxes((err, boxes) => {
        if (err) {
          console.error('[IMAP] Error getting boxes:', err);
          imap.end();
          reject(err);
          return;
        }

        console.log('[IMAP] Raw boxes response:', JSON.stringify(boxes, null, 2).substring(0, 500));
        
        // Flatten folder structure and get all folder paths
        const folderPaths: string[] = [];
        
        function collectFolders(boxObj: any, parentPath: string = '') {
          if (!boxObj) return;
          
          for (const name of Object.keys(boxObj)) {
            const box = boxObj[name];
            
            // Skip special folders
            if (name.startsWith('.')) continue;
            
            // Build the full path using the server's delimiter
            let fullPath = name;
            if (parentPath && box.delimiter) {
              fullPath = parentPath + box.delimiter + name;
            } else if (parentPath) {
              fullPath = parentPath + '/' + name;
            }
            
            // Add this folder if it has no children (leaf node)
            if (!box.children || Object.keys(box.children).length === 0) {
              folderPaths.push(fullPath);
            } else {
              // Recurse into children
              collectFolders(box.children, fullPath);
            }
            
            // Also add the parent folder itself (some servers store messages in parent)
            if (box.attribs && !box.attribs.includes('\\Noselect')) {
              if (!folderPaths.includes(fullPath)) {
                folderPaths.push(fullPath);
              }
            }
          }
        }
        
        collectFolders(boxes);
        console.log('[IMAP] Found', folderPaths.length, 'folders:', folderPaths);
        
        if (folderPaths.length === 0) {
          console.log('[IMAP] No folders found, trying INBOX only');
          folderPaths.push('INBOX');
        }
        
        // Filter folders if whitelist provided
        const foldersToScan = options.folderWhitelist 
          ? folderPaths.filter(f => options.folderWhitelist!.some(w => f.toLowerCase().includes(w.toLowerCase())))
          : folderPaths;
        
        console.log('[IMAP] Will scan', foldersToScan.length, 'folders');
        
        // Process folders one by one
        let currentIndex = 0;
        const totalLimit = options.limit || 200;
        
        function processNextFolder() {
          if (hasError) return;
          
          if (currentIndex >= foldersToScan.length || allMessages.length >= totalLimit) {
            console.log('[IMAP] Finished scanning. Total messages:', allMessages.length);
            console.log('[IMAP] Messages with attachments:', allMessages.filter(m => m.hasAttachment).length);
            imap.end();
            resolve(allMessages.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, totalLimit));
            return;
          }
          
          const folder = foldersToScan[currentIndex];
          currentIndex++;
          
          console.log('[IMAP] Opening folder', currentIndex + '/' + foldersToScan.length + ':', folder);
          
          imap.openBox(folder, true, (err, box) => {
            if (err) {
              console.log('[IMAP] Could not open folder:', folder, '-', err.message);
              // Continue with next folder
              setTimeout(processNextFolder, 100);
              return;
            }
            
            const msgCount = box.messages?.total || 0;
            console.log('[IMAP] Folder', folder, 'has', msgCount, 'messages');
            
            if (msgCount === 0) {
              setTimeout(processNextFolder, 100);
              return;
            }
            
            // Build search criteria
            let searchCriteria: any[] = ['ALL'];
            if (options.since) {
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const d = options.since;
              const day = String(d.getDate()).padStart(2, '0');
              const month = months[d.getMonth()];
              const year = d.getFullYear();
              const imapDate = `${day}-${month}-${year}`;
              searchCriteria = [['SINCE', imapDate]];
              console.log('[IMAP] Searching since:', imapDate);
            }
            
            imap.search(searchCriteria, (searchErr, results) => {
              if (searchErr) {
                console.log('[IMAP] Search error in', folder, ':', searchErr.message);
                setTimeout(processNextFolder, 100);
                return;
              }
              
              const resultCount = results?.length || 0;
              console.log('[IMAP] Search found', resultCount, 'emails in', folder);
              
              if (!results || results.length === 0) {
                setTimeout(processNextFolder, 100);
                return;
              }
              
              // Get remaining limit
              const remaining = totalLimit - allMessages.length;
              if (remaining <= 0) {
                console.log('[IMAP] Limit reached, stopping');
                imap.end();
                resolve(allMessages.sort((a, b) => b.date.getTime() - a.date.getTime()));
                return;
              }
              
              const limitedResults = results.slice(-Math.min(remaining, 50));
              console.log('[IMAP] Fetching', limitedResults.length, 'emails from', folder);
              
              const fetch = imap.fetch(limitedResults, {
                bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
                struct: true,
              });
              
              let fetchedCount = 0;
              
              fetch.on('message', (msg, seqno) => {
                let header = '';
                let body = '';
                let attrs: any = null;
                
                msg.on('body', (stream, info) => {
                  const chunks: Buffer[] = [];
                  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
                  stream.once('end', () => {
                    const content = Buffer.concat(chunks).toString('utf8');
                    if (info.which === 'TEXT') body = content;
                    else header = content;
                  });
                });
                
                msg.once('attributes', (a: any) => { attrs = a; });
                
                msg.once('end', () => {
                  fetchedCount++;
                  
                  const fromMatch = header.match(/From:\s*(.+)/i);
                  const toMatch = header.match(/To:\s*(.+)/i);
                  const subjectMatch = header.match(/Subject:\s*(.+)/i);
                  const dateMatch = header.match(/Date:\s*(.+)/i);
                  
                  let fromEmail = '';
                  let from = fromMatch?.[1]?.trim() || '';
                  const emailMatch = from.match(/<([^>]+)>/);
                  if (emailMatch) {
                    fromEmail = emailMatch[1];
                    from = from.replace(/<[^>]+>/, '').trim().replace(/"/g, '');
                  } else {
                    fromEmail = from;
                  }
                  
                  const attachments: Array<{ filename: string; mimeType: string; size: number }> = [];
                  
                  function findAttachments(parts: any[]) {
                    if (!parts) return;
                    for (const part of parts) {
                      // Check for attachment disposition
                      if (part.disposition) {
                        const dispType = (part.disposition.type || part.disposition).toString().toLowerCase();
                        if (dispType === 'attachment' || dispType === 'inline') {
                          const filename = part.disposition.params?.filename || part.params?.name || part.disposition.params?.name || 'unknown';
                          if (dispType === 'attachment' || filename !== 'unknown') {
                            attachments.push({
                              filename,
                              mimeType: (part.type || 'application') + '/' + (part.subtype || 'octet-stream'),
                              size: part.size || 0,
                            });
                          }
                        }
                      }
                      // Recurse into child parts
                      if (part.childNodes?.length > 0) findAttachments(part.childNodes);
                      if (Array.isArray(part)) findAttachments(part);
                    }
                  }
                  
                  if (attrs?.struct) {
                    findAttachments([attrs.struct]);
                  }
                  
                  allMessages.push({
                    id: `${folder}-${attrs?.uid?.toString() || seqno.toString()}`,
                    subject: subjectMatch?.[1]?.trim() || '(No Subject)',
                    from,
                    fromEmail,
                    to: toMatch?.[1]?.trim() || '',
                    date: dateMatch ? new Date(dateMatch[1]) : new Date(),
                    body: body.substring(0, 5000),
                    hasAttachment: attachments.length > 0,
                    attachments,
                  });
                });
              });
              
              fetch.once('error', (err) => {
                console.log('[IMAP] Fetch error in', folder, ':', err.message);
                setTimeout(processNextFolder, 100);
              });
              
              fetch.once('end', () => {
                console.log('[IMAP] Fetched', fetchedCount, 'emails from', folder, '(total so far:', allMessages.length, ')');
                setTimeout(processNextFolder, 100);
              });
            });
          });
        }
        
        processNextFolder();
      });
    });

    imap.once('error', (err: Error) => {
      console.error('[IMAP] Connection error:', err.message, err.stack);
      hasError = true;
      
      // Provide user-friendly error message
      let errorMessage = err.message;
      if (err.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Check host and port.';
      } else if (err.message.includes('ETIMEDOUT')) {
        errorMessage = 'Connection timed out. Check host address and ensure the server is accessible.';
      } else if (err.message.includes('ENOTFOUND')) {
        errorMessage = 'Server not found. Check host address.';
      } else if (err.message.includes('Invalid credentials') || err.message.includes('LOGIN failed')) {
        errorMessage = 'Invalid username or password.';
      } else if (err.message.includes('ECONNRESET')) {
        errorMessage = 'Connection reset by server. Please try again.';
      }
      
      reject(new Error(errorMessage));
    });

    imap.once('end', () => {
      console.log('[IMAP] Connection ended');
    });

    console.log('[IMAP] Starting connection...');
    imap.connect();
  });
}
