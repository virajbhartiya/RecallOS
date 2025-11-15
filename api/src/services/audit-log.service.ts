import { prisma } from '../lib/prisma.lib'
import { logger } from '../utils/logger.util'
import { privacyService } from './privacy.service'
import { Prisma } from '@prisma/client'

export type AuditEventType =
  | 'memory_capture'
  | 'memory_search'
  | 'memory_delete'
  | 'memory_update'
  | 'privacy_setting_change'
  | 'export_data'
  | 'import_data'

export type AuditEventCategory = 'capture' | 'search' | 'privacy' | 'data_management'

interface AuditLogData {
  userId: string
  eventType: AuditEventType
  eventCategory: AuditEventCategory
  action: string
  resourceType?: string
  resourceId?: string
  domain?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export class AuditLogService {
  /**
   * Log an audit event
   */
  async logEvent(data: AuditLogData): Promise<void> {
    try {
      // Extract domain from URL if provided in metadata
      let domain = data.domain
      if (!domain && data.metadata?.url && typeof data.metadata.url === 'string') {
        domain = privacyService.extractDomain(data.metadata.url)
      }

      await prisma.auditLog.create({
        data: {
          user_id: data.userId,
          event_type: data.eventType,
          event_category: data.eventCategory,
          action: data.action,
          resource_type: data.resourceType,
          resource_id: data.resourceId,
          domain,
          metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
          ip_address: data.ipAddress,
          user_agent: data.userAgent,
        },
      })
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      logger.warn('[audit] Failed to log event', {
        error: error instanceof Error ? error.message : String(error),
        eventType: data.eventType,
        userId: data.userId,
      })
    }
  }

  /**
   * Get audit logs for a user with optional filters
   */
  async getUserAuditLogs(
    userId: string,
    options?: {
      eventType?: AuditEventType
      eventCategory?: AuditEventCategory
      domain?: string
      limit?: number
      offset?: number
      startDate?: Date
      endDate?: Date
    }
  ) {
    const where: Prisma.AuditLogWhereInput = { user_id: userId }

    if (options?.eventType) {
      where.event_type = options.eventType
    }

    if (options?.eventCategory) {
      where.event_category = options.eventCategory
    }

    if (options?.domain) {
      where.domain = options.domain
    }

    if (options?.startDate || options?.endDate) {
      where.created_at = {}
      if (options.startDate) {
        where.created_at.gte = options.startDate
      }
      if (options.endDate) {
        where.created_at.lte = options.endDate
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: options?.limit ?? 100,
        skip: options?.offset ?? 0,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      logs,
      total,
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
    }
  }

  /**
   * Log memory capture event
   */
  async logMemoryCapture(
    userId: string,
    memoryId: string,
    url: string,
    options?: { ipAddress?: string; userAgent?: string }
  ) {
    const domain = privacyService.extractDomain(url)
    await this.logEvent({
      userId,
      eventType: 'memory_capture',
      eventCategory: 'capture',
      action: 'captured',
      resourceType: 'memory',
      resourceId: memoryId,
      domain,
      metadata: { url },
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    })
  }

  /**
   * Log memory search event
   */
  async logMemorySearch(
    userId: string,
    query: string,
    resultCount: number,
    options?: { ipAddress?: string; userAgent?: string }
  ) {
    await this.logEvent({
      userId,
      eventType: 'memory_search',
      eventCategory: 'search',
      action: 'searched',
      metadata: {
        query: query.substring(0, 200), // Truncate long queries
        resultCount,
      },
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    })
  }

  /**
   * Log memory deletion event
   */
  async logMemoryDelete(
    userId: string,
    memoryId: string,
    domain?: string,
    options?: { ipAddress?: string; userAgent?: string }
  ) {
    await this.logEvent({
      userId,
      eventType: 'memory_delete',
      eventCategory: 'data_management',
      action: 'deleted',
      resourceType: 'memory',
      resourceId: memoryId,
      domain,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    })
  }

  /**
   * Log privacy setting change
   */
  async logPrivacySettingChange(
    userId: string,
    domain: string,
    action: string,
    settings: Record<string, unknown>,
    options?: { ipAddress?: string; userAgent?: string }
  ) {
    await this.logEvent({
      userId,
      eventType: 'privacy_setting_change',
      eventCategory: 'privacy',
      action,
      domain,
      metadata: settings,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    })
  }
}

export const auditLogService = new AuditLogService()
