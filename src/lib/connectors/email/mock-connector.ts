// ============================================
// Mock Email Connector
// ============================================
// Simulates email connections for development and testing

import type { EmailProvider, EmailProtocol } from '@/types';
import type {
  EmailConnector,
  EmailConnectionConfig,
  EmailMessage,
  EmailThread,
  EmailAttachment,
  ListMessagesOptions,
  SearchQuery,
  EmailAddress,
} from './types';

// ============================================
// Mock Data Generator
// ============================================

function generateMockMessages(count: number): EmailMessage[] {
  const subjects = [
    'Job Opening: Senior Software Engineer',
    'Re: Job Opening: Senior Software Engineer',
    'Application for Python Developer Position',
    'Re: Application for Python Developer Position',
    'Resume: Full Stack Developer - John Smith',
    'Re: Resume: Full Stack Developer - John Smith',
    'Frontend Engineer Position - Your Application',
    'Re: Frontend Engineer Position - Your Application',
  ];

  const senders = [
    { name: 'HR Department', address: 'hr@company.com' },
    { name: 'John Smith', address: 'john.smith@email.com' },
    { name: 'Jane Doe', address: 'jane.doe@gmail.com' },
    { name: 'Mike Johnson', address: 'mike.j@outlook.com' },
    { name: 'Sarah Williams', address: 'sarah.w@yahoo.com' },
    { name: 'Tech Recruiter', address: 'recruiter@techcorp.com' },
  ];

  const messages: EmailMessage[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const subject = subjects[i % subjects.length];
    const sender = senders[i % senders.length];
    const isReply = subject.toLowerCase().startsWith('re:');

    messages.push({
      id: `msg-${i + 1}`,
      threadId: isReply ? `thread-${Math.floor(i / 2) + 1}` : `thread-${i + 1}`,
      subject,
      from: sender,
      to: [{ name: 'Me', address: 'me@example.com' }],
      date: new Date(now.getTime() - i * 3600000), // 1 hour apart
      body: {
        text: generateMockBody(subject, sender.name),
        html: `<p>${generateMockBody(subject, sender.name)}</p>`,
      },
      attachments: i % 3 === 0 ? [generateMockAttachment(i)] : [],
      headers: {
        'Message-ID': `<msg-${i + 1}@example.com>`,
        'In-Reply-To': isReply ? `<msg-${i}@example.com>` : '',
        'References': isReply ? `<msg-${i}@example.com>` : '',
      },
    });
  }

  return messages;
}

function generateMockBody(subject: string, sender: string): string {
  if (subject.toLowerCase().includes('job opening')) {
    return `
We are looking for a Senior Software Engineer to join our team.

Requirements:
- 5+ years of experience in software development
- Proficiency in Python, JavaScript, or Java
- Experience with cloud platforms (AWS, GCP, or Azure)
- Strong problem-solving skills

Please send your resume if interested.

Best regards,
${sender}
    `.trim();
  } else if (subject.toLowerCase().includes('application') || subject.toLowerCase().includes('resume')) {
    return `
Dear Hiring Manager,

I am writing to express my interest in the position. Please find my resume attached.

I have extensive experience in the required technologies and believe I would be a great fit for the role.

Best regards,
${sender}
    `.trim();
  } else {
    return `Thank you for your email. I will review and get back to you shortly.`;
  }
}

function generateMockAttachment(index: number): EmailAttachment {
  const resumeContent = `
JOHN SMITH
Senior Software Engineer

EXPERIENCE
-----------
Senior Software Engineer | Tech Company | 2020 - Present
- Led development of microservices architecture
- Reduced system latency by 40%
- Managed team of 5 engineers

Software Engineer | Startup Inc | 2017 - 2020
- Built REST APIs using Python/Django
- Implemented CI/CD pipelines
- Developed features for 1M+ users

SKILLS
------
Programming: Python, JavaScript, TypeScript, Java
Frameworks: Django, React, Node.js, Spring
Cloud: AWS, Docker, Kubernetes
Databases: PostgreSQL, MongoDB, Redis

EDUCATION
---------
Bachelor of Science in Computer Science
University of Technology, 2017
  `.trim();

  return {
    filename: index % 2 === 0 ? 'resume.pdf' : 'CV.docx',
    mimeType: index % 2 === 0 ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: Buffer.byteLength(resumeContent, 'utf8'),
    content: Buffer.from(resumeContent, 'utf8'),
    contentId: `att-${index}`,
  };
}

// ============================================
// Mock Email Connector Class
// ============================================

export class MockEmailConnector implements EmailConnector {
  private config: EmailConnectionConfig;
  private connected: boolean = false;
  private messages: EmailMessage[] = [];

  constructor(config: EmailConnectionConfig) {
    this.config = config;
    this.messages = generateMockMessages(20);
  }

  async connect(): Promise<boolean> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!this.config.email || !this.config.email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }
    
    return { success: true };
  }

  async listFolders(): Promise<string[]> {
    return ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam'];
  }

  async listMessages(options?: ListMessagesOptions): Promise<EmailMessage[]> {
    let messages = [...this.messages];

    if (options?.since) {
      messages = messages.filter(m => m.date >= options.since!);
    }

    if (options?.before) {
      messages = messages.filter(m => m.date <= options.before!);
    }

    if (options?.offset) {
      messages = messages.slice(options.offset);
    }

    if (options?.limit) {
      messages = messages.slice(0, options.limit);
    }

    return messages;
  }

  async fetchMessage(id: string): Promise<EmailMessage | null> {
    return this.messages.find(m => m.id === id) || null;
  }

  async fetchThread(threadId: string): Promise<EmailThread | null> {
    const threadMessages = this.messages.filter(m => m.threadId === threadId);
    
    if (threadMessages.length === 0) {
      return null;
    }

    const sortedMessages = threadMessages.sort((a, b) => a.date.getTime() - b.date.getTime());
    const participants: EmailAddress[] = [];
    
    threadMessages.forEach(m => {
      if (!participants.some(p => p.address === m.from.address)) {
        participants.push(m.from);
      }
    });

    return {
      id: threadId,
      subject: sortedMessages[0].subject,
      messages: sortedMessages,
      participants,
      startedAt: sortedMessages[0].date,
      lastMessageAt: sortedMessages[sortedMessages.length - 1].date,
      messageCount: sortedMessages.length,
    };
  }

  async searchMessages(query: SearchQuery): Promise<EmailMessage[]> {
    let results = [...this.messages];

    if (query.from) {
      results = results.filter(m => 
        m.from.address.toLowerCase().includes(query.from!.toLowerCase()) ||
        m.from.name.toLowerCase().includes(query.from!.toLowerCase())
      );
    }

    if (query.subject) {
      results = results.filter(m => 
        m.subject.toLowerCase().includes(query.subject!.toLowerCase())
      );
    }

    if (query.body) {
      results = results.filter(m => 
        m.body.text?.toLowerCase().includes(query.body!.toLowerCase())
      );
    }

    if (query.hasAttachment) {
      results = results.filter(m => m.attachments.length > 0);
    }

    if (query.since) {
      results = results.filter(m => m.date >= query.since!);
    }

    if (query.before) {
      results = results.filter(m => m.date <= query.before!);
    }

    return results;
  }

  async findReplies(messageId: string): Promise<EmailMessage[]> {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) return [];

    return this.messages.filter(m => 
      m.headers['in-reply-to']?.includes(messageId) ||
      m.headers['references']?.includes(messageId)
    );
  }

  async findRepliesToThread(threadId: string): Promise<EmailMessage[]> {
    return this.messages.filter(m => m.threadId === threadId);
  }

  async fetchAttachment(messageId: string, attachmentId: string): Promise<EmailAttachment | null> {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) return null;

    return message.attachments.find(a => a.contentId === attachmentId) || null;
  }

  getProvider(): EmailProvider {
    return this.config.provider;
  }

  getProtocol(): EmailProtocol {
    return this.config.protocol;
  }

  getEmail(): string {
    return this.config.email;
  }
}

// ============================================
// Factory Function
// ============================================

export function createMockConnector(config: EmailConnectionConfig): EmailConnector {
  return new MockEmailConnector(config);
}
