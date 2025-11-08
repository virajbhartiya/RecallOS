import { createHash } from 'crypto'

export function normalizeText(input: string): string {
  if (typeof input !== 'string') return ''
  return input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
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
    .replace(/\s+/g, ' ')
    .trim()
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
