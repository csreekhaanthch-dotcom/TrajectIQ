// ============================================
// Email Connector Factory
// ============================================
// Creates email connectors based on provider configuration

import type { EmailConnector, EmailConnectionConfig } from './types'
import { MockEmailConnector } from './mock-connector'

// ============================================
// Connector Factory
// ============================================

export function createEmailConnector(config: EmailConnectionConfig): EmailConnector {
  // For development/testing or when no real credentials, use mock connector
  if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK_EMAIL === 'true') {
    console.log('[Email] Using mock email connector')
    return new MockEmailConnector(config)
  }

  // Production - check for real credentials
  const configAny = config as any
  const hasGmailOAuth = config.provider === 'GMAIL' && 
    !!configAny.clientId && 
    !!configAny.refreshToken

  const hasIMAPCredentials = config.protocol === 'IMAP' && 
    !!configAny.password

  if (hasGmailOAuth || hasIMAPCredentials) {
    console.log('[Email] Real credentials detected, but using mock for now')
    console.warn('[Email] To enable real email, set up Gmail OAuth or IMAP credentials')
    // In production, this would return the real connector
  }

  // Default to mock connector
  return new MockEmailConnector(config)
}

// ============================================
// Email Service
// ============================================

export class EmailService {
  private connector: EmailConnector | null = null
  private config: EmailConnectionConfig | null = null

  async connect(config: EmailConnectionConfig): Promise<boolean> {
    this.config = config
    this.connector = createEmailConnector(config)
    return this.connector.connect()
  }

  async disconnect(): Promise<void> {
    if (this.connector) {
      await this.connector.disconnect()
      this.connector = null
    }
  }

  isConnected(): boolean {
    return this.connector?.isConnected() || false
  }

  getConnector(): EmailConnector | null {
    return this.connector
  }

  async testConnection(config: EmailConnectionConfig): Promise<{ success: boolean; error?: string }> {
    const connector = createEmailConnector(config)
    const result = await connector.testConnection()
    await connector.disconnect()
    return result
  }

  // Thread detection for hiring workflow
  async findJobRequirementEmails(options?: {
    since?: Date
    limit?: number
  }): Promise<{ threadId: string; subject: string; sender: string; date: Date }[]> {
    if (!this.connector) {
      throw new Error('Not connected to email')
    }

    const messages = await this.connector.searchMessages({
      hasAttachment: true,
      since: options?.since,
    })

    // Filter for job requirement patterns
    const jobPatterns = [
      /job\s*(opening|position|posting|requirement)/i,
      /hiring\s*(for|now)/i,
      /position\s*(available|open)/i,
      /looking\s*for/i,
      /seeking\s*(a|an)\s*\w+\s*(engineer|developer|manager)/i,
    ]

    const requirements: Map<string, { threadId: string; subject: string; sender: string; date: Date }> = new Map()

    for (const message of messages) {
      const isJobRequirement = jobPatterns.some(pattern => 
        pattern.test(message.subject) || pattern.test(message.body.text || '')
      )

      if (isJobRequirement && message.threadId) {
        if (!requirements.has(message.threadId)) {
          requirements.set(message.threadId, {
            threadId: message.threadId,
            subject: message.subject,
            sender: message.from.name || message.from.address,
            date: message.date,
          })
        }
      }
    }

    let results = Array.from(requirements.values())
    results.sort((a, b) => b.date.getTime() - a.date.getTime())
    
    if (options?.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  async findCandidateReplies(threadId: string): Promise<{
    messageId: string
    subject: string
    sender: string
    senderEmail: string
    date: Date
    hasAttachment: boolean
    attachmentCount: number
  }[]> {
    if (!this.connector) {
      throw new Error('Not connected to email')
    }

    const thread = await this.connector.fetchThread(threadId)
    if (!thread) return []

    const replies = thread.messages.slice(1)

    return replies.map(message => ({
      messageId: message.id,
      subject: message.subject,
      sender: message.from.name || message.from.address,
      senderEmail: message.from.address,
      date: message.date,
      hasAttachment: message.attachments.length > 0,
      attachmentCount: message.attachments.length,
    }))
  }

  async fetchResumeFromReply(messageId: string): Promise<{
    filename: string
    mimeType: string
    content: Buffer
  } | null> {
    if (!this.connector) {
      throw new Error('Not connected to email')
    }

    const message = await this.connector.fetchMessage(messageId)
    if (!message || message.attachments.length === 0) {
      return null
    }

    const resumeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ]

    const resumeAttachment = message.attachments.find(a => 
      resumeTypes.includes(a.mimeType) ||
      a.filename.toLowerCase().match(/\.(pdf|docx?|txt)$/)
    )

    if (!resumeAttachment) {
      return null
    }

    return {
      filename: resumeAttachment.filename,
      mimeType: resumeAttachment.mimeType,
      content: resumeAttachment.content,
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let emailServiceInstance: EmailService | null = null

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService()
  }
  return emailServiceInstance
}

// ============================================
// Exports
// ============================================

export * from './types'
export { MockEmailConnector } from './mock-connector'
