// ============================================
// Email Connector Types
// ============================================

import type { EmailProvider, EmailProtocol } from '@/types';

// ============================================
// Connection Configuration
// ============================================

export interface EmailConnectionConfig {
  provider: EmailProvider;
  protocol: EmailProtocol;
  email: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  useTLS?: boolean;
}

// ============================================
// Email Message Types
// ============================================

export interface EmailMessage {
  id: string;
  threadId?: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  date: Date;
  body: {
    text?: string;
    html?: string;
  };
  attachments: EmailAttachment[];
  headers: Record<string, string>;
}

export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  content: Buffer;
  contentId?: string;
}

// ============================================
// Thread Types
// ============================================

export interface EmailThread {
  id: string;
  subject: string;
  messages: EmailMessage[];
  participants: EmailAddress[];
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
}

// ============================================
// Connector Interface
// ============================================

export interface EmailConnector {
  // Connection management
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  
  // Folder/mailbox operations
  listFolders(): Promise<string[]>;
  
  // Message operations
  listMessages(options?: ListMessagesOptions): Promise<EmailMessage[]>;
  fetchMessage(id: string): Promise<EmailMessage | null>;
  fetchThread(threadId: string): Promise<EmailThread | null>;
  searchMessages(query: SearchQuery): Promise<EmailMessage[]>;
  
  // Thread detection
  findReplies(messageId: string): Promise<EmailMessage[]>;
  findRepliesToThread(threadId: string): Promise<EmailMessage[]>;
  
  // Attachment handling
  fetchAttachment(messageId: string, attachmentId: string): Promise<EmailAttachment | null>;
  
  // Metadata
  getProvider(): EmailProvider;
  getProtocol(): EmailProtocol;
  getEmail(): string;
}

// ============================================
// Search Options
// ============================================

export interface ListMessagesOptions {
  folder?: string;
  limit?: number;
  offset?: number;
  since?: Date;
  before?: Date;
  unreadOnly?: boolean;
}

export interface SearchQuery {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  since?: Date;
  before?: Date;
  hasAttachment?: boolean;
  unreadOnly?: boolean;
}

// ============================================
// Provider Configurations
// ============================================

export const PROVIDER_CONFIGS: Record<EmailProvider, {
  defaultHost: string;
  defaultPort: number;
  supportsOAuth: boolean;
  protocols: EmailProtocol[];
}> = {
  GMAIL: {
    defaultHost: 'imap.gmail.com',
    defaultPort: 993,
    supportsOAuth: true,
    protocols: ['IMAP', 'OAUTH'],
  },
  OUTLOOK: {
    defaultHost: 'outlook.office365.com',
    defaultPort: 993,
    supportsOAuth: true,
    protocols: ['IMAP', 'OAUTH'],
  },
  YAHOO: {
    defaultHost: 'imap.mail.yahoo.com',
    defaultPort: 993,
    supportsOAuth: true,
    protocols: ['IMAP', 'OAUTH'],
  },
  CUSTOM_IMAP: {
    defaultHost: '',
    defaultPort: 993,
    supportsOAuth: false,
    protocols: ['IMAP'],
  },
  CUSTOM_POP3: {
    defaultHost: '',
    defaultPort: 995,
    supportsOAuth: false,
    protocols: ['POP3'],
  },
};

// ============================================
// Thread Detection Helpers
// ============================================

export interface ThreadDetectionResult {
  threadId: string;
  rootMessageId: string;
  replyIds: string[];
  subject: string;
}

export function extractThreadId(message: EmailMessage): string | null {
  // Thread-ID header (custom)
  if (message.headers['thread-id']) {
    return message.headers['thread-id'];
  }
  
  // References header (standard)
  if (message.headers['references']) {
    const refs = message.headers['references'].split(/\s+/);
    if (refs.length > 0) {
      return refs[0];
    }
  }
  
  // In-Reply-To header
  if (message.headers['in-reply-to']) {
    return message.headers['in-reply-to'];
  }
  
  // Use Message-ID as root
  return message.id;
}

export function isReply(message: EmailMessage): boolean {
  return !!(message.headers['in-reply-to'] || message.headers['references']);
}

export function extractSubjectWithoutRe(subject: string): string {
  return subject.replace(/^(\s*re:\s*)+/i, '').trim();
}
