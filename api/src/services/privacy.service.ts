import { prisma } from '../lib/prisma.lib'

export class PrivacyService {
  /**
   * Get privacy settings for a user, optionally filtered by domain
   */
  async getUserPrivacySettings(userId: string, domain?: string) {
    const where: any = { user_id: userId }
    if (domain) {
      where.domain = domain
    }

    return await prisma.privacySetting.findMany({
      where,
      orderBy: { updated_at: 'desc' },
    })
  }

  /**
   * Get privacy setting for a specific domain
   */
  async getDomainPrivacySetting(userId: string, domain: string) {
    return await prisma.privacySetting.findUnique({
      where: {
        user_id_domain: {
          user_id: userId,
          domain,
        },
      },
    })
  }

  /**
   * Check if a domain should block capture
   */
  async shouldBlockCapture(userId: string, domain: string): Promise<boolean> {
    const setting = await this.getDomainPrivacySetting(userId, domain)
    return setting?.block_capture ?? false
  }

  /**
   * Check if a domain should block search
   */
  async shouldBlockSearch(userId: string, domain: string): Promise<boolean> {
    const setting = await this.getDomainPrivacySetting(userId, domain)
    return setting?.block_search ?? false
  }

  /**
   * Check if content from a domain should be redacted
   */
  async shouldRedactContent(userId: string, domain: string): Promise<boolean> {
    const setting = await this.getDomainPrivacySetting(userId, domain)
    return setting?.redact_content ?? false
  }

  /**
   * Create or update privacy setting for a domain
   */
  async upsertPrivacySetting(
    userId: string,
    domain: string,
    settings: {
      block_capture?: boolean
      block_search?: boolean
      redact_content?: boolean
      notes?: string
    }
  ) {
    return await prisma.privacySetting.upsert({
      where: {
        user_id_domain: {
          user_id: userId,
          domain,
        },
      },
      update: {
        ...settings,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        domain,
        block_capture: settings.block_capture ?? false,
        block_search: settings.block_search ?? false,
        redact_content: settings.redact_content ?? false,
        notes: settings.notes,
      },
    })
  }

  /**
   * Delete privacy setting for a domain
   */
  async deletePrivacySetting(userId: string, domain: string) {
    return await prisma.privacySetting.delete({
      where: {
        user_id_domain: {
          user_id: userId,
          domain,
        },
      },
    })
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace(/^www\./, '')
    } catch {
      // If URL parsing fails, try to extract domain manually
      const match = url.match(/https?:\/\/([^/]+)/)
      if (match) {
        return match[1].replace(/^www\./, '')
      }
      return url
    }
  }
}

export const privacyService = new PrivacyService()
