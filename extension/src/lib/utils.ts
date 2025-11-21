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

export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text
  }

  let sanitized = text

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

  return sanitized
}

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

export function sanitizeElementContent(element: Element): string {
  if (!element) return ''

  const clone = element.cloneNode(true) as Element
  removeSensitiveElements(clone)

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
