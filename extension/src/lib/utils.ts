import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SENSITIVE_PATTERNS = {
  creditCard: /(?:\d[ -]*?){13,19}/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  bankAccount: /\b\d{8,17}\b/g,
  cvv: /\b\d{3,4}\b(?=.*(?:cvv|cvc|security|code))/gi,
  apiKey:
    /\b(?:api[_-]?key|apikey|access[_-]?token|secret[_-]?key)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
  emailPassword: /password\s*[:=]\s*['"]?([^\s'"]+)['"]?/gi,
}

const SENSITIVE_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete*="password"]',
  'input[autocomplete*="credit-card"]',
  'input[autocomplete*="cc-"]',
  'input[name*="password" i]',
  'input[name*="passwd" i]',
  'input[name*="pwd" i]',
  'input[name*="credit" i]',
  'input[name*="card" i]',
  'input[name*="cvv" i]',
  'input[name*="cvc" i]',
  'input[name*="ssn" i]',
  'input[name*="social" i]',
  'input[name*="account" i]',
  'input[name*="routing" i]',
  'input[id*="password" i]',
  'input[id*="passwd" i]',
  'input[id*="pwd" i]',
  'input[id*="credit" i]',
  'input[id*="card" i]',
  'input[id*="cvv" i]',
  'input[id*="cvc" i]',
  'input[id*="ssn" i]',
  'input[id*="social" i]',
  'input[id*="account" i]',
  'input[id*="routing" i]',
  'textarea[name*="password" i]',
  'textarea[name*="passwd" i]',
  'textarea[id*="password" i]',
  'textarea[id*="passwd" i]',
]

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

const TRACKING_PATTERNS = {
  googleAnalytics:
    /\b(?:ga|gtag|gtm|analytics|_ga|_gid|_gat)[-_]?[a-z0-9_]*[:=]\s*['"]?[a-zA-Z0-9_-]+['"]?/gi,
  facebookPixel:
    /\b(?:fb|facebook)[-_]?(?:pixel|track|event)[-_]?[a-z0-9_]*[:=]\s*['"]?[a-zA-Z0-9_-]+['"]?/gi,
  trackingId: /\b(?:tracking|track)[-_]?(?:id|code|token|key)[:=]\s*['"]?[a-zA-Z0-9_-]{10,}['"]?/gi,
  sessionId: /\b(?:session|sess)[-_]?(?:id|token)[:=]\s*['"]?[a-zA-Z0-9_-]{20,}['"]?/gi,
  utmParams:
    /[?&](?:utm_[a-z]+|ref|source|campaign|medium|term|content|gclid|fbclid|_hsenc|_hsmi)=[^&\s]*/gi,
  marketingTags:
    /\b(?:marketing|promo|affiliate)[-_]?(?:id|code|tag)[:=]\s*['"]?[a-zA-Z0-9_-]+['"]?/gi,
}

const UI_NOISE_PATTERNS = [
  /\b(?:click|tap)\s+(?:here|now|to)\s+(?:continue|proceed|learn more|read more|see more)/gi,
  /\b(?:subscribe|sign up|register)\s+(?:now|today|free|for|to)/gi,
  /\b(?:cookie|privacy|terms)\s+(?:notice|banner|popup|dialog)/gi,
  /\b(?:accept|decline|agree|disagree)\s+(?:all|all cookies|cookies)/gi,
  /\b(?:skip|jump)\s+to\s+(?:content|main|navigation)/gi,
  /\b(?:menu|navigation|nav)\s+(?:toggle|button|icon)/gi,
  /\b(?:close|×|✕)\s*(?:menu|dialog|popup|modal)/gi,
  /\b(?:loading|please wait|processing)/gi,
  /\b(?:error|404|not found|page not found)/gi,
]

export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text
  }

  let sanitized = text

  sanitized = decodeHtmlEntities(sanitized)

  sanitized = sanitized.replace(SENSITIVE_PATTERNS.creditCard, '[REDACTED: Credit Card]')
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.ssn, '[REDACTED: SSN]')
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.apiKey, '[REDACTED: API Key]')
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.emailPassword, '[REDACTED: Password]')

  const bankAccountMatches = sanitized.match(SENSITIVE_PATTERNS.bankAccount)
  if (bankAccountMatches) {
    bankAccountMatches.forEach(match => {
      if (match.length >= 8 && match.length <= 17) {
        const context = sanitized
          .substring(
            Math.max(0, sanitized.indexOf(match) - 20),
            Math.min(sanitized.length, sanitized.indexOf(match) + match.length + 20)
          )
          .toLowerCase()
        if (
          context.includes('account') ||
          context.includes('routing') ||
          context.includes('bank') ||
          context.includes('checking') ||
          context.includes('saving')
        ) {
          sanitized = sanitized.replace(match, '[REDACTED: Bank Account]')
        }
      }
    })
  }

  sanitized = sanitized.replace(TRACKING_PATTERNS.googleAnalytics, '')
  sanitized = sanitized.replace(TRACKING_PATTERNS.facebookPixel, '')
  sanitized = sanitized.replace(TRACKING_PATTERNS.trackingId, '')
  sanitized = sanitized.replace(TRACKING_PATTERNS.sessionId, '')
  sanitized = sanitized.replace(TRACKING_PATTERNS.utmParams, '')
  sanitized = sanitized.replace(TRACKING_PATTERNS.marketingTags, '')

  UI_NOISE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '')
  })

  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  return sanitized
}

const WEB_NOISE_SELECTORS = [
  'script[src*="analytics"]',
  'script[src*="gtag"]',
  'script[src*="gtm"]',
  'script[src*="facebook"]',
  'script[src*="tracking"]',
  'iframe[src*="facebook"]',
  'iframe[src*="twitter"]',
  'iframe[src*="instagram"]',
  'iframe[src*="youtube"]',
  'iframe[src*="analytics"]',
  '[class*="cookie"]',
  '[class*="gdpr"]',
  '[class*="privacy-notice"]',
  '[class*="newsletter"]',
  '[class*="subscribe"]',
  '[class*="social-share"]',
  '[class*="share-buttons"]',
  '[class*="related-articles"]',
  '[class*="trending"]',
  '[class*="recommended"]',
  '[id*="cookie"]',
  '[id*="gdpr"]',
  '[id*="privacy-notice"]',
  '[id*="newsletter"]',
  '[id*="subscribe"]',
  '[id*="social-share"]',
  '[id*="share-buttons"]',
  '[id*="related-articles"]',
  '[id*="trending"]',
  '[id*="recommended"]',
]

/**
 * Removes tracking scripts, pixels, and noise elements from the DOM.
 * WARNING: This function modifies the element in place. Only call on clones, never on the actual DOM.
 * @param element - Element or Document to clean (must be a clone, not the actual DOM)
 */
export function cleanWebPageContent(element: Element | Document): void {
  if (!element) return

  WEB_NOISE_SELECTORS.forEach(selector => {
    try {
      const noiseElements = element.querySelectorAll(selector)
      noiseElements.forEach(el => {
        el.remove()
      })
    } catch (_error) {}
  })

  const trackingScripts = element.querySelectorAll('script')
  trackingScripts.forEach(script => {
    const src = script.getAttribute('src') || ''
    const content = script.textContent || ''
    if (
      src.includes('analytics') ||
      src.includes('gtag') ||
      src.includes('gtm') ||
      src.includes('facebook') ||
      src.includes('tracking') ||
      content.includes('analytics') ||
      content.includes('gtag') ||
      content.includes('gtm') ||
      content.includes('facebook') ||
      content.includes('tracking')
    ) {
      script.remove()
    }
  })

  const trackingPixels = element.querySelectorAll(
    'img[src*="pixel"], img[src*="tracking"], img[src*="analytics"]'
  )
  trackingPixels.forEach(img => {
    img.remove()
  })
}

/**
 * Removes or redacts sensitive form elements (passwords, credit cards, etc.) from the DOM.
 * WARNING: This function modifies the element in place. Only call on clones, never on the actual DOM.
 * @param element - Element or Document to sanitize (must be a clone, not the actual DOM)
 */
export function removeSensitiveElements(element: Element | Document): void {
  if (!element) return

  SENSITIVE_SELECTORS.forEach(selector => {
    try {
      const sensitiveElements = element.querySelectorAll(selector)
      sensitiveElements.forEach(el => {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.value = ''
          el.setAttribute('data-cognia-redacted', 'true')
        }
        if (el.parentElement) {
          const label = el.parentElement.querySelector('label')
          if (label) {
            label.textContent = label.textContent?.replace(/\S+/g, '[REDACTED]') || ''
          }
        }
      })
    } catch (_error) {}
  })
}

/**
 * Sanitizes element content by cloning it first, then removing sensitive data.
 * Safe to call on actual DOM elements as it works on a clone.
 * @param element - Element to sanitize (can be actual DOM, will be cloned internally)
 * @returns Sanitized text content
 */
export function sanitizeElementContent(element: Element): string {
  if (!element) return ''

  const clone = element.cloneNode(true) as Element
  removeSensitiveElements(clone)
  cleanWebPageContent(clone)

  let text = clone.textContent || ''
  text = sanitizeText(text)

  return text
}

export function sanitizeContextData(data: {
  content_snippet?: string
  full_content?: string
  meaningful_content?: string
  content_summary?: string
  page_structure?: {
    forms?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}): typeof data {
  const sanitized = { ...data }

  if (sanitized.content_snippet) {
    sanitized.content_snippet = sanitizeText(sanitized.content_snippet)
  }
  if (sanitized.full_content) {
    sanitized.full_content = sanitizeText(sanitized.full_content)
  }
  if (sanitized.meaningful_content) {
    sanitized.meaningful_content = sanitizeText(sanitized.meaningful_content)
  }
  if (sanitized.content_summary) {
    sanitized.content_summary = sanitizeText(sanitized.content_summary)
  }

  if (sanitized.page_structure && Array.isArray(sanitized.page_structure.forms)) {
    sanitized.page_structure.forms = sanitized.page_structure.forms.map((form: string) =>
      sanitizeText(form)
    )
  }

  return sanitized
}
