import { createHash } from 'crypto'

const TRACKING_PATTERNS = [
  /\b(?:ga|gtag|gtm|analytics|_ga|_gid|_gat)[-_]?[a-z0-9_]*[:=]\s*['"]?[a-zA-Z0-9_-]+['"]?/gi,
  /\b(?:fb|facebook)[-_]?(?:pixel|track|event)[-_]?[a-z0-9_]*[:=]\s*['"]?[a-zA-Z0-9_-]+['"]?/gi,
  /\b(?:tracking|track)[-_]?(?:id|code|token|key)[:=]\s*['"]?[a-zA-Z0-9_-]{10,}['"]?/gi,
  /\b(?:session|sess)[-_]?(?:id|token)[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
  /\b(?:utm_[a-z]+|ref|source|campaign|medium|term|content|gclid|fbclid|_hsenc|_hsmi)=[^&\s]*/gi,
  /\b(?:marketing|promo|affiliate)[-_]?(?:id|code|tag)[:=]\s*['"]?[a-zA-Z0-9_-]+['"]?/gi,
]

export function normalizeText(input: string): string {
  if (typeof input !== 'string') return ''
  let normalized = input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[Z]?/g, '') // ISO timestamps
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '') // Date formats
    .replace(/\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?/gi, '') // Time formats
    .replace(/\d{13,}/g, '') // Unix timestamps (13+ digits)
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '') // UUIDs
    .replace(/data-[\w-]+="[^"]*"/g, '') // Data attributes
    .replace(/id="[^"]*"/g, '') // ID attributes
    .replace(/class="[^"]*"/g, '') // Class attributes
    .replace(/style="[^"]*"/g, '') // Style attributes
    .replace(/<!--[\s\S]*?-->/g, '') // HTML comments
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Script tags
    .replace(/<style[\s\S]*?<\/style>/gi, '') // Style tags
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '') // Noscript tags
    .replace(/<[^>]+>/g, ' ') // Remove remaining HTML tags

  TRACKING_PATTERNS.forEach(pattern => {
    normalized = normalized.replace(pattern, '')
  })

  return normalized.replace(/\s+/g, ' ').trim()
}

export function hashCanonical(canonical: string): string {
  return createHash('sha256').update(canonical).digest('hex')
}

export function normalizeUrl(url: string): string {
  if (typeof url !== 'string') return ''
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.toLowerCase()
  } catch {
    return url.toLowerCase().split('?')[0].split('#')[0]
  }
}

export function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0
  if (text1 === text2) return 1

  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 0))
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 0))

  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

export function buildContentPreview(text: string | null | undefined, length: number = 400): string {
  if (!text) return ''
  return text.replace(/\s+/g, ' ').trim().slice(0, length)
}

export function sanitizeContentForStorage(content: string): string {
  if (typeof content !== 'string') return ''
  if (!content.trim()) return ''

  let sanitized = content

  sanitized = sanitized
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')

  TRACKING_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '')
  })

  sanitized = sanitized
    .replace(/<img[^>]*src=["'][^"']*pixel[^"']*["'][^>]*>/gi, '')
    .replace(/<img[^>]*src=["'][^"']*tracking[^"']*["'][^>]*>/gi, '')
    .replace(/<img[^>]*src=["'][^"']*analytics[^"']*["'][^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')

  sanitized = sanitized
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/\.{3,}/g, '...')
    .replace(/[!]{2,}/g, '!')
    .replace(/[?]{2,}/g, '?')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:])\s{2,}/g, '$1 ')
    .replace(/\n\s*\n+/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()

  return sanitized
}
