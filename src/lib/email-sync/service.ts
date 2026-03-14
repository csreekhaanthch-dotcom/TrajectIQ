// ============================================
// Email Synchronization Service
// ============================================
// Background service that periodically syncs emails
// and processes candidate resumes

import type { EmailConnectionConfig } from '@/lib/connectors/email/types'
import { getEmailService } from '@/lib/connectors/email'
import { parseResume } from '@/lib/parsing/resume-parser'
import { calculateHiringScore } from '@/lib/scoring/pipeline'
import { prisma } from '@/lib/db'

// ============================================
// Types
// ============================================

export interface SyncConfig {
  organizationId: string
  emailAccountId: string
  intervalMinutes: number
  enabled: boolean
}

export interface SyncResult {
  syncedAt: Date
  messagesProcessed: number
  resumesExtracted: number
  candidatesCreated: number
  errors: string[]
}

// ============================================
// Sync State Management
// ============================================

interface SyncState {
  lastSync: Date | null
  isRunning: boolean
  lastError: string | null
}

const syncStates = new Map<string, SyncState>()

function getSyncState(organizationId: string): SyncState {
  if (!syncStates.has(organizationId)) {
    syncStates.set(organizationId, {
      lastSync: null,
      isRunning: false,
      lastError: null,
    })
  }
  return syncStates.get(organizationId)!
}

// ============================================
// Email Sync Functions
// ============================================

/**
 * Run a manual sync for an organization
 */
export async function runEmailSync(
  organizationId: string,
  config: EmailConnectionConfig
): Promise<SyncResult> {
  const state = getSyncState(organizationId)
  const result: SyncResult = {
    syncedAt: new Date(),
    messagesProcessed: 0,
    resumesExtracted: 0,
    candidatesCreated: 0,
    errors: [],
  }

  // Check database
  if (!prisma) {
    result.errors.push('Database not available')
    return result
  }

  // Prevent concurrent syncs
  if (state.isRunning) {
    console.log(`[EmailSync] Sync already in progress for ${organizationId}`)
    return result
  }

  state.isRunning = true
  const emailService = getEmailService()

  try {
    // Connect to email
    const connected = await emailService.connect(config)
    if (!connected) {
      throw new Error('Failed to connect to email server')
    }

    // Find job requirement emails since last sync
    const since = state.lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const jobEmails = await emailService.findJobRequirementEmails({
      since,
      limit: 100,
    })

    console.log(`[EmailSync] Found ${jobEmails.length} job requirement emails for ${organizationId}`)

    // Process each job requirement thread
    for (const jobEmail of jobEmails) {
      try {
        result.messagesProcessed++

        const replies = await emailService.findCandidateReplies(jobEmail.threadId)

        for (const reply of replies) {
          if (!reply.hasAttachment) continue

          const resume = await emailService.fetchResumeFromReply(reply.messageId)
          if (!resume) continue

          result.resumesExtracted++

          const parseResult = await parseResume(resume.content.toString('utf-8'), resume.filename)
          if (!parseResult.success || !parseResult.data) {
            result.errors.push(`Failed to parse resume from ${reply.senderEmail}`)
            continue
          }

          const candidate = await createCandidate(
            organizationId,
            parseResult.data,
            reply.senderEmail,
            jobEmail.threadId
          )

          if (candidate) {
            result.candidatesCreated++

            const requirements = await prisma.requirement.findMany({
              where: {
                organizationId,
                status: 'ACTIVE',
              },
            })

            for (const requirement of requirements) {
              await calculateHiringScore({
                candidateId: candidate.id,
                requirementId: requirement.id,
              })
            }
          }
        }
      } catch (error) {
        result.errors.push(
          `Error processing thread ${jobEmail.threadId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    state.lastSync = result.syncedAt
    state.lastError = null

  } catch (error) {
    state.lastError = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(state.lastError)
    console.error(`[EmailSync] Sync error for ${organizationId}:`, error)
  } finally {
    state.isRunning = false
    await emailService.disconnect()
  }

  return result
}

/**
 * Create candidate from parsed resume
 */
async function createCandidate(
  organizationId: string,
  resumeData: any,
  email: string,
  threadId: string
): Promise<{ id: string } | null> {
  if (!prisma) {
    return null
  }

  try {
    const user = await prisma.user.findFirst({
      where: { organizationId },
    })

    if (!user) {
      console.error('[EmailSync] No user found for organization')
      return null
    }

    const existing = await prisma.candidate.findFirst({
      where: {
        organizationId,
        email,
      },
    })

    if (existing) {
      return await prisma.candidate.update({
        where: { id: existing.id },
        data: {
          firstName: resumeData.firstName || existing.firstName,
          lastName: resumeData.lastName || existing.lastName,
          currentTitle: resumeData.currentTitle || existing.currentTitle,
          rawResumeText: JSON.stringify(resumeData),
          updatedAt: new Date(),
        },
      })
    }

    return await prisma.candidate.create({
      data: {
        organizationId,
        email,
        firstName: resumeData.firstName || '',
        lastName: resumeData.lastName || '',
        currentTitle: resumeData.currentTitle || null,
        rawResumeText: JSON.stringify(resumeData),
        status: 'NEW',
        source: 'EMAIL',
        createdById: user.id,
      },
    })
  } catch (error) {
    console.error('[EmailSync] Error creating candidate:', error)
    return null
  }
}

/**
 * Get sync status for an organization
 */
export function getSyncStatus(organizationId: string): {
  isRunning: boolean
  lastSync: Date | null
  lastError: string | null
} {
  const state = getSyncState(organizationId)
  return {
    isRunning: state.isRunning,
    lastSync: state.lastSync,
    lastError: state.lastError,
  }
}
