import { prisma } from '../lib/prisma.lib'
import { logger } from '../utils/logger.util'
import { privacyService } from './privacy.service'
import { auditLogService } from './audit-log.service'
import { Prisma } from '@prisma/client'

export class MemoryRedactionService {
  /**
   * Redact specific fields from a memory
   */
  async redactMemoryFields(
    userId: string,
    memoryId: string,
    fieldsToRedact: Array<'url' | 'content' | 'title' | 'summary'>,
    options?: { ipAddress?: string; userAgent?: string }
  ) {
    const memory = await prisma.memory.findUnique({
      where: { id: memoryId },
    })

    if (!memory || memory.user_id !== userId) {
      throw new Error('Memory not found or access denied')
    }

    const updates: Prisma.MemoryUpdateInput = {}

    if (fieldsToRedact.includes('url')) {
      updates.url = '[REDACTED]'
    }

    if (fieldsToRedact.includes('title')) {
      updates.title = '[REDACTED]'
    }

    if (fieldsToRedact.includes('summary')) {
      updates.summary = '[REDACTED]'
    }

    if (fieldsToRedact.includes('content')) {
      updates.content = '[REDACTED]'
      // Also redact canonical text if it exists
      if (memory.canonical_text) {
        updates.canonical_text = '[REDACTED]'
      }
    }

    const updated = await prisma.memory.update({
      where: { id: memoryId },
      data: updates,
    })

    // Log redaction event
    await auditLogService.logEvent({
      userId,
      eventType: 'memory_update',
      eventCategory: 'data_management',
      action: 'redacted',
      resourceType: 'memory',
      resourceId: memoryId,
      domain: memory.url ? privacyService.extractDomain(memory.url) : undefined,
      metadata: {
        fieldsRedacted: fieldsToRedact,
      },
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    })

    logger.log('[redaction] memory_fields_redacted', {
      memoryId,
      userId,
      fieldsRedacted: fieldsToRedact,
    })

    return updated
  }

  /**
   * Redact all memories from a specific domain
   */
  async redactDomainMemories(
    userId: string,
    domain: string,
    fieldsToRedact: Array<'url' | 'content' | 'title' | 'summary'>,
    options?: { ipAddress?: string; userAgent?: string }
  ) {
    const memories = await prisma.memory.findMany({
      where: {
        user_id: userId,
        url: {
          contains: domain,
        },
      },
      select: { id: true },
    })

    const results = await Promise.all(
      memories.map(memory =>
        this.redactMemoryFields(userId, memory.id, fieldsToRedact, options).catch((err): null => {
          logger.warn('[redaction] failed_to_redact_memory', {
            memoryId: memory.id,
            error: err instanceof Error ? err.message : String(err),
          })
          return null
        })
      )
    )

    const successful = results.filter(r => r !== null).length

    logger.log('[redaction] domain_redaction_complete', {
      domain,
      userId,
      totalMemories: memories.length,
      successful,
      fieldsRedacted: fieldsToRedact,
    })

    return {
      domain,
      totalMemories: memories.length,
      successful,
      failed: memories.length - successful,
    }
  }
}

export const memoryRedactionService = new MemoryRedactionService()
