import { getUserId, requireAuthToken } from '@/lib/userId'
import { runtime, storage } from '@/lib/browser'
import { MESSAGE_TYPES } from '@/lib/constants'

interface ContextData {
  source: string
  url: string
  title: string
  content_snippet: string
  timestamp: number
  full_content?: string
  meaningful_content?: string
  content_summary?: string
  content_type?: string
  key_topics?: string[]
  reading_time?: number
  page_metadata?: {
    description?: string
    keywords?: string
    author?: string
    viewport?: string
    language?: string
    published_date?: string
    modified_date?: string
    canonical_url?: string
  }
  page_structure?: {
    headings: string[]
    links: string[]
    images: string[]
    forms: string[]
    code_blocks?: string[]
    tables?: string[]
  }
  user_activity?: {
    scroll_position: number
    window_size: { width: number; height: number }
    focused_element?: string
    time_on_page?: number
    interaction_count?: number
  }
  content_quality?: {
    word_count: number
    has_images: boolean
    has_code: boolean
    has_tables: boolean
    readability_score?: number
  }
}

type EmailDraftPayload = {
  subject?: string
  thread_text: string
  provider?: string
  existing_draft?: string
  participants?: string[]
  url?: string
  title?: string
}

type EmailDraftResponse = {
  subject: string
  body: string
  summary?: string
}

type EmailDraftContext = {
  provider: 'gmail' | 'outlook' | 'unknown'
  subject: string
  threadText: string
  participants: string[]
  composeElement?: HTMLElement
  subjectElement?: HTMLInputElement | HTMLTextAreaElement
  existingDraft?: string
}

const EMAIL_THREAD_CHAR_LIMIT = 15000
let lastUrl = location.href
let lastContent = ''
let lastTitle = ''
let lastContentHash = ''
let captureInterval: ReturnType<typeof setInterval> | null = null
let isActive = true
let activityLevel = 'normal'
let lastActivityTime = Date.now()
let lastCaptureTime = 0
let hasUserActivity = false
const MIN_CAPTURE_INTERVAL = 10000
const ACTIVITY_TIMEOUT = 30000
const CONTENT_CHANGE_THRESHOLD = 0.1
let privacyExtensionDetected = false
let privacyExtensionType = 'unknown'
function detectPrivacyExtensions(): void {
  try {
    const _privacyExtensions = [
      'uBlock Origin',
      'AdBlock Plus',
      'Ghostery',
      'Privacy Badger',
      'DuckDuckGo Privacy Essentials',
      'Brave Shields',
      'AdGuard',
      'NoScript',
      'ScriptSafe',
      'uMatrix',
    ]
    const hasAdBlockers =
      document.querySelectorAll(
        '[id*="adblock"], [class*="adblock"], [id*="ublock"], [class*="ublock"]'
      ).length > 0
    const hasPrivacyElements =
      document.querySelectorAll(
        '[id*="privacy"], [class*="privacy"], [id*="ghostery"], [class*="ghostery"]'
      ).length > 0
    if (hasAdBlockers || hasPrivacyElements) {
      privacyExtensionDetected = true
      privacyExtensionType = 'adblocker'
    }
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      privacyExtensionDetected = true
      privacyExtensionType = 'csp'
    }
    try {
      const testIframe = document.createElement('iframe')
      testIframe.style.display = 'none'
      document.body.appendChild(testIframe)
      document.body.removeChild(testIframe)
    } catch (_error) {
      privacyExtensionDetected = true
      privacyExtensionType = 'iframe_restriction'
    }
  } catch (_error) {}
}
;(window as any).pageLoadTime = Date.now()
;(window as any).interactionCount = 0
detectPrivacyExtensions()
function extractVisibleText(): string {
  try {
    if (!document.body || !document.body.textContent) {
      return document.documentElement?.textContent || document.title || ''
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        try {
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          const style = window.getComputedStyle(parent)
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        } catch (_error) {
          return NodeFilter.FILTER_ACCEPT
        }
      },
    })
    const textNodes: string[] = []
    let node
    while ((node = walker.nextNode())) {
      try {
        const text = node.textContent?.trim()
        if (text && text.length > 0) {
          textNodes.push(text)
        }
      } catch (_error) {
        continue
      }
    }
    return textNodes.join(' ')
  } catch (_error) {
    try {
      return (
        document.body?.textContent || document.documentElement?.textContent || document.title || ''
      )
    } catch (_fallbackError) {
      return document.title || window.location.href
    }
  }
}
function extractMeaningfulContent(): string {
  try {
    if (!document.body || !document.body.innerHTML) {
      return extractVisibleText()
    }
    const boilerplateSelectors = [
      'nav',
      'header',
      'footer',
      '.nav',
      '.navigation',
      '.menu',
      '.sidebar',
      '.advertisement',
      '.ads',
      '.ad',
      '.promo',
      '.banner',
      '.cookie-notice',
      '.newsletter',
      '.subscribe',
      '.social-share',
      '.share-buttons',
      '.comments',
      '.comment',
      '.related',
      '.recommended',
      '.trending',
      '.breadcrumb',
      '.breadcrumbs',
      '.pagination',
      '.pager',
      '.search',
      '.search-box',
      '.search-form',
      '.filter',
      '.sort',
      '.modal',
      '.popup',
      '.overlay',
      '.tooltip',
      '.dropdown',
      '.cookie-banner',
      '.gdpr',
      '.privacy-notice',
      '.terms',
      '.author-bio',
      '.author-info',
      '.author-box',
      '.byline',
      '.tags',
      '.categories',
      '.meta',
      '.metadata',
      '.date',
      '.social-media',
      '.social-links',
      '.follow-us',
      '.connect',
      '.newsletter-signup',
      '.email-signup',
      '.subscription',
      '.sponsor',
      '.sponsored',
      '.affiliate',
      '.partner',
      '.disclaimer',
      '.legal',
      '.terms-of-service',
      '.privacy-policy',
    ]
    const tempDiv = document.createElement('div')
    try {
      tempDiv.innerHTML = document.body.innerHTML
    } catch (_error) {
      tempDiv.textContent = document.body.textContent || ''
    }
    boilerplateSelectors.forEach(selector => {
      try {
        const elements = tempDiv.querySelectorAll(selector)
        elements.forEach(el => el.remove())
      } catch (_error) {}
    })
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post',
      '.article',
      '.entry',
      '.story',
      '.blog-post',
      '.news-article',
      '.tutorial',
      '.documentation',
      '.guide',
      '.how-to',
      '.explanation',
      '.text',
      '.body',
      '.main-content',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.page-content',
      '.content-body',
    ]
    let meaningfulContent = ''
    for (const selector of contentSelectors) {
      try {
        const element = tempDiv.querySelector(selector)
        if (element) {
          const text = cleanAndExtractText(element)
          if (text && text.length > 100) {
            meaningfulContent = text
            break
          }
        }
      } catch (_error) {
        continue
      }
    }
    if (!meaningfulContent) {
      try {
        const meaningfulElements = tempDiv.querySelectorAll(
          'p, h1, h2, h3, h4, h5, h6, li, blockquote, div'
        )
        const paragraphs = Array.from(meaningfulElements)
          .map(el => {
            try {
              return cleanAndExtractText(el)
            } catch (_error) {
              return ''
            }
          })
          .filter(text => text && text.length > 30 && !isBoilerplateText(text))
          .join(' ')
        if (paragraphs.length > 200) {
          meaningfulContent = paragraphs
        }
      } catch (_error) {}
    }
    if (!meaningfulContent) {
      try {
        meaningfulContent = cleanAndExtractText(tempDiv)
      } catch (_error) {
        meaningfulContent = extractVisibleText()
      }
    }
    return cleanText(meaningfulContent).substring(0, 50000)
  } catch (_error) {
    return extractVisibleText()
  }
}
function cleanAndExtractText(element: Element): string {
  if (!element) return ''
  try {
    const scripts = element.querySelectorAll('script, style, noscript')
    scripts.forEach(el => {
      try {
        el.remove()
      } catch (_error) {}
    })
    const text = element.textContent || ''
    return cleanText(text)
  } catch (_error) {
    try {
      return cleanText(element.textContent || '')
    } catch (_fallbackError) {
      return ''
    }
  }
}
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/[^\w\s.,!?;:()\-'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function isBoilerplateText(text: string): boolean {
  const boilerplatePatterns = [
    /^(cookie|privacy|terms|subscribe|newsletter|follow us|share|like|comment)/i,
    /^(advertisement|sponsored|promo|banner)/i,
    /^(menu|navigation|home|about|contact|search)/i,
    /^(copyright|©|all rights reserved)/i,
    /^(loading|please wait|error|404|not found)/i,
    /^(login|sign in|register|sign up|logout)/i,
    /^(skip to|jump to|table of contents)/i,
    /^(read more|continue reading|show more)/i,
    /^(related|recommended|trending|popular)/i,
    /^(tags|categories|archive|older|newer)/i,
    /^(social media|connect with|follow)/i,
    /^(disclaimer|legal notice|terms of service)/i,
    /^(this website uses cookies|we use cookies)/i,
    /^(accept|decline|agree|disagree)/i,
    /^(subscribe to our|get updates|stay informed)/i,
    /^(share this|tell your friends|spread the word)/i,
    /^(ad blocker|disable ad blocker)/i,
    /^(javascript|enable javascript)/i,
    /^(browser|upgrade|update)/i,
    /^(mobile|desktop|tablet)/i,
  ]
  const shortText = text.toLowerCase().trim()
  if (shortText.length < 20) return true
  return boilerplatePatterns.some(pattern => pattern.test(shortText))
}
function extractContentSummary(): string {
  const title = document.title
  const metaDescription =
    document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
  const ogDescription =
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') || ''
  const twitterDescription =
    document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || ''
  const mainHeading =
    document.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('h2')?.textContent?.trim() ||
    document.querySelector('h3')?.textContent?.trim() ||
    ''
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map(p => p.textContent?.trim())
    .filter(text => text && text.length > 50 && !isBoilerplateText(text))
  const firstParagraph = paragraphs[0] || ''
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => h.textContent?.trim())
    .filter(text => text && text.length > 0 && text.length < 100)
    .slice(0, 3)
  const summaryParts = [
    title,
    metaDescription || ogDescription || twitterDescription,
    mainHeading,
    firstParagraph,
    ...headings,
  ].filter(text => text && text.length > 0)
  return summaryParts.join(' | ').substring(0, 800)
}
function extractContentType(): string {
  const url = window.location.href
  const title = document.title.toLowerCase()
  const _metaKeywords =
    document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.toLowerCase() || ''
  if (url.includes('/blog/') || url.includes('/post/') || title.includes('blog')) return 'blog_post'
  if (url.includes('/docs/') || url.includes('/documentation/') || title.includes('docs'))
    return 'documentation'
  if (
    url.includes('/tutorial/') ||
    url.includes('/guide/') ||
    title.includes('tutorial') ||
    title.includes('guide')
  )
    return 'tutorial'
  if (url.includes('/news/') || title.includes('news')) return 'news_article'
  if (url.includes('/product/') || title.includes('product')) return 'product_page'
  if (url.includes('/about/') || title.includes('about')) return 'about_page'
  if (url.includes('/contact/') || title.includes('contact')) return 'contact_page'
  if (url.includes('/search') || title.includes('search')) return 'search_results'
  if (url.includes('/forum/') || url.includes('/discussion/')) return 'forum_post'
  if (url.includes('/github.com/') || url.includes('/gitlab.com/')) return 'code_repository'
  if (url.includes('/stackoverflow.com/') || url.includes('/stackexchange.com/')) return 'qa_thread'
  if (url.includes('/youtube.com/') || url.includes('/vimeo.com/')) return 'video_content'
  if (url.includes('/twitter.com/') || url.includes('/x.com/')) return 'social_media'
  if (url.includes('/reddit.com/')) return 'reddit_post'
  if (url.includes('/medium.com/') || url.includes('/substack.com/')) return 'article'
  return 'web_page'
}
function extractKeyTopics(): string[] {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => h.textContent?.trim())
    .filter(text => text && text.length > 0 && text.length < 100)
    .slice(0, 8)
  const metaKeywords =
    document
      .querySelector('meta[name="keywords"]')
      ?.getAttribute('content')
      ?.split(',')
      .map(k => k.trim()) || []
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || ''
  const ogKeywords =
    document
      .querySelector('meta[property="og:keywords"]')
      ?.getAttribute('content')
      ?.split(',')
      .map(k => k.trim()) || []
  const twitterTitle =
    document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || ''
  const twitterKeywords =
    document
      .querySelector('meta[name="twitter:keywords"]')
      ?.getAttribute('content')
      ?.split(',')
      .map(k => k.trim()) || []
  const structuredData = extractStructuredDataTopics()
  const urlTopics = extractUrlTopics()
  const allTopics = [
    ...headings,
    ...metaKeywords,
    ...ogKeywords,
    ...twitterKeywords,
    ...structuredData,
    ...urlTopics,
    ogTitle,
    twitterTitle,
  ].filter(topic => topic && topic.length > 2 && topic.length < 50)
  return [...new Set(allTopics)].slice(0, 20)
}
function extractStructuredDataTopics(): string[] {
  const topics: string[] = []
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '')
        if (data['@type'] && data.name) {
          topics.push(data.name)
        }
        if (data.keywords) {
          if (Array.isArray(data.keywords)) {
            topics.push(...data.keywords)
          } else if (typeof data.keywords === 'string') {
            topics.push(...data.keywords.split(',').map((k: string) => k.trim()))
          }
        }
        if (data.about) {
          if (Array.isArray(data.about)) {
            topics.push(...data.about.map((item: any) => item.name || item))
          } else if (typeof data.about === 'string') {
            topics.push(data.about)
          }
        }
      } catch (_e) {}
    })
  } catch (_e) {}
  return topics
}
function extractUrlTopics(): string[] {
  const _url = window.location.href
  const pathname = window.location.pathname
  const segments = pathname
    .split('/')
    .filter(segment => segment && segment.length > 2 && segment.length < 30)
    .filter(segment => !/^\d+$/.test(segment))
    .filter(segment => !/^(page|p|id|slug|post|article)$/i.test(segment))
  const domain = window.location.hostname
  const domainTopics: string[] = []
  if (domain.includes('github.com')) {
    domainTopics.push('programming', 'code', 'repository')
  } else if (domain.includes('stackoverflow.com') || domain.includes('stackexchange.com')) {
    domainTopics.push('programming', 'question', 'answer')
  } else if (domain.includes('medium.com') || domain.includes('substack.com')) {
    domainTopics.push('article', 'blog', 'writing')
  } else if (domain.includes('youtube.com')) {
    domainTopics.push('video', 'tutorial', 'education')
  } else if (domain.includes('reddit.com')) {
    domainTopics.push('discussion', 'community', 'reddit')
  } else if (domain.includes('wikipedia.org')) {
    domainTopics.push('encyclopedia', 'reference', 'information')
  }
  return [...segments, ...domainTopics]
}
function extractReadingTime(): number {
  const content = extractMeaningfulContent()
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  return Math.ceil(wordCount / wordsPerMinute)
}
function extractFullContent(): string {
  const fullText = extractVisibleText()
  return fullText.length > 5000 ? fullText.substring(0, 5000) + '...' : fullText
}
function extractPageMetadata() {
  const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement
  const keywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement
  const author = document.querySelector('meta[name="author"]') as HTMLMetaElement
  const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement
  const published = document.querySelector(
    'meta[property="article:published_time"]'
  ) as HTMLMetaElement
  const modified = document.querySelector(
    'meta[property="article:modified_time"]'
  ) as HTMLMetaElement
  const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
  return {
    description: meta?.content || '',
    keywords: keywords?.content || '',
    author: author?.content || '',
    viewport: viewport?.content || '',
    language: document.documentElement.lang || '',
    published_date: published?.content || '',
    modified_date: modified?.content || '',
    canonical_url: canonical?.href || '',
  }
}
function extractPageStructure() {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(h => h.textContent?.trim())
    .filter(text => text && text.length > 0)
    .slice(0, 20)
  const links = Array.from(document.querySelectorAll('a[href]'))
    .map(a => {
      const href = (a as HTMLAnchorElement).href
      const text = a.textContent?.trim()
      return text ? `${text} (${href})` : href
    })
    .filter(link => link.length > 0)
    .slice(0, 30)
  const images = Array.from(document.querySelectorAll('img[src]'))
    .map(img => {
      const src = (img as HTMLImageElement).src
      const alt = (img as HTMLImageElement).alt
      return alt ? `${alt} (${src})` : src
    })
    .filter(img => img.length > 0)
    .slice(0, 20)
  const forms = Array.from(document.querySelectorAll('form'))
    .map(form => {
      const inputs = Array.from(form.querySelectorAll('input, textarea, select'))
        .map(
          input => (input as HTMLInputElement).name || (input as HTMLInputElement).type || 'input'
        )
        .join(', ')
      return inputs ? `Form with: ${inputs}` : 'Form'
    })
    .slice(0, 10)
  const codeBlocks = Array.from(document.querySelectorAll('pre, code'))
    .map(code => code.textContent?.trim())
    .filter(code => code && code.length > 10)
    .slice(0, 10)
  const tables = Array.from(document.querySelectorAll('table'))
    .map(table => {
      const headers = Array.from(table.querySelectorAll('th'))
        .map(th => th.textContent?.trim())
        .filter(text => text && text.length > 0)
      return headers.length > 0 ? `Table with columns: ${headers.join(', ')}` : 'Table'
    })
    .slice(0, 5)
  return { headings, links, images, forms, code_blocks: codeBlocks, tables }
}
function extractContentQuality() {
  const content = extractMeaningfulContent()
  const wordCount = content.split(/\s+/).length
  const hasImages = document.querySelectorAll('img').length > 0
  const hasCode = document.querySelectorAll('pre, code').length > 0
  const hasTables = document.querySelectorAll('table').length > 0
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0
  const readabilityScore = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 10) * 2))
  return {
    word_count: wordCount,
    has_images: hasImages,
    has_code: hasCode,
    has_tables: hasTables,
    readability_score: Math.round(readabilityScore),
  }
}
function extractUserActivity() {
  return {
    scroll_position: window.pageYOffset || document.documentElement.scrollTop,
    window_size: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    focused_element: document.activeElement?.tagName || '',
    time_on_page: Date.now() - (window as any).pageLoadTime || 0,
    interaction_count: (window as any).interactionCount || 0,
  }
}
function captureContext(): ContextData {
  try {
    const url = window.location.href
    const title = document.title || ''
    const meaningfulContent = extractMeaningfulContent()
    const content_snippet = meaningfulContent.substring(0, 500)
    return {
      source: 'extension',
      url,
      title,
      content_snippet,
      timestamp: Date.now(),
      full_content: extractFullContent(),
      meaningful_content: meaningfulContent,
      content_summary: extractContentSummary(),
      content_type: extractContentType(),
      key_topics: extractKeyTopics(),
      reading_time: extractReadingTime(),
      page_metadata: extractPageMetadata(),
      page_structure: extractPageStructure(),
      user_activity: extractUserActivity(),
      content_quality: extractContentQuality(),
    }
  } catch (_error) {
    const basicTitle = document.title || 'Untitled Page'
    const basicUrl = window.location.href
    const basicContent = `Page: ${basicTitle} | URL: ${basicUrl}`

    return {
      source: 'extension',
      url: basicUrl,
      title: basicTitle,
      content_snippet: basicContent,
      timestamp: Date.now(),
      full_content: basicContent,
      meaningful_content: basicContent,
      content_summary: `Basic page information for ${basicTitle}`,
      content_type: 'web_page',
      key_topics: [],
      reading_time: 0,
      page_metadata: {
        description: '',
        keywords: '',
        author: '',
        viewport: '',
        language: document.documentElement.lang || '',
        published_date: '',
        modified_date: '',
        canonical_url: '',
      },
      page_structure: {
        headings: [],
        links: [],
        images: [],
        forms: [],
      },
      user_activity: {
        scroll_position: 0,
        window_size: { width: 0, height: 0 },
        focused_element: '',
        time_on_page: 0,
        interaction_count: 0,
      },
      content_quality: {
        word_count: basicContent.split(' ').length,
        has_images: false,
        has_code: false,
        has_tables: false,
        readability_score: 0,
      },
    }
  }
}
function isLocalhost(): boolean {
  const hostname = window.location.hostname
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
  )
}

async function sendContextToBackground() {
  try {
    if (!runtime.id) {
      return
    }

    if (isLocalhost()) {
      return
    }

    // Check if extension is enabled
    const enabled = await checkExtensionEnabled()
    if (!enabled) {
      return
    }

    // Check if website is blocked
    const currentUrl = window.location.href
    const isBlocked = await checkWebsiteBlocked(currentUrl)
    if (isBlocked) {
      return
    }

    const now = Date.now()
    if (now - lastCaptureTime < MIN_CAPTURE_INTERVAL) {
      return
    }
    const contextData = captureContext()

    const hasValidContent =
      contextData.content_snippet &&
      contextData.content_snippet.length > 50 &&
      !contextData.content_snippet.includes('Content extraction failed')

    if (privacyExtensionDetected && !hasValidContent) {
      return
    }

    if (!hasValidContent) {
      return
    }

    ;(contextData as any).privacy_extension_info = {
      detected: privacyExtensionDetected,
      type: privacyExtensionType,
      compatibility_mode: privacyExtensionDetected,
    }
    runtime.sendMessage({ type: 'CAPTURE_CONTEXT', data: contextData }, _response => {
      // Show capture indicator
      showCaptureIndicator()
    })
    lastCaptureTime = now
  } catch (_error) {}
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    hasUserActivity = true
    if (!isLocalhost()) {
      sendContextToBackground()
    }
  })
} else {
  hasUserActivity = true
  if (!isLocalhost()) {
    sendContextToBackground()
  }
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    hasUserActivity = true
    lastActivityTime = Date.now()
  }
})
window.addEventListener('focus', () => {
  hasUserActivity = true
  lastActivityTime = Date.now()
})
runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!runtime.id) {
    return false
  }
  if (message.type === 'CAPTURE_CONTEXT_NOW') {
    hasUserActivity = true
    if (!isLocalhost()) {
      sendContextToBackground()
      sendResponse({ success: true })
    } else {
      sendResponse({ success: false, reason: 'localhost detected' })
    }
    return true
  }
  if (message.type === 'START_MONITORING') {
    if (!isLocalhost()) {
      startContinuousMonitoring()
      sendResponse({ success: true, activityLevel })
    } else {
      sendResponse({ success: false, reason: 'localhost detected' })
    }
    return true
  }
  if (message.type === 'STOP_MONITORING') {
    stopContinuousMonitoring()
    sendResponse({ success: true })
    return true
  }
  if (message.type === 'GET_MONITORING_STATUS') {
    sendResponse({
      success: true,
      isActive,
      activityLevel,
      isMonitoring: !!captureInterval,
    })
    return true
  }
  if (message.type === MESSAGE_TYPES.DRAFT_EMAIL_REPLY) {
    handleDraftEmailRequest()
      .then(result => sendResponse(result))
      .catch(error =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to draft email reply',
        })
      )
    return true
  }
})
function calculateContentHash(content: string): string {
  let hash = 0
  if (content.length === 0) return hash.toString()
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString()
}

function calculateContentSimilarity(content1: string, content2: string): number {
  if (!content1 || !content2) return 0

  const words1 = content1
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2)
  const words2 = content2
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2)

  if (words1.length === 0 || words2.length === 0) return 0

  const set1 = new Set(words1)
  const set2 = new Set(words2)

  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

function hasContentChanged(): boolean {
  const currentUrl = location.href
  const currentTitle = document.title
  const currentContent = extractVisibleText()
  const currentContentHash = calculateContentHash(currentContent)

  const urlChanged = currentUrl !== lastUrl
  const titleChanged = currentTitle !== lastTitle

  const contentHashChanged = currentContentHash !== lastContentHash

  const contentSimilarity = calculateContentSimilarity(currentContent, lastContent)
  const contentSignificantlyChanged = contentSimilarity < 1 - CONTENT_CHANGE_THRESHOLD

  const shouldCapture =
    urlChanged || titleChanged || contentHashChanged || contentSignificantlyChanged

  if (shouldCapture) {
    lastUrl = currentUrl
    lastTitle = currentTitle
    lastContent = currentContent
    lastContentHash = currentContentHash
  }

  return shouldCapture
}
function shouldCaptureBasedOnActivity(): boolean {
  const now = Date.now()
  const timeSinceLastActivity = now - lastActivityTime
  const timeSinceLastCapture = now - lastCaptureTime
  return (
    hasUserActivity &&
    timeSinceLastCapture >= MIN_CAPTURE_INTERVAL &&
    (hasContentChanged() || timeSinceLastActivity >= ACTIVITY_TIMEOUT)
  )
}
function getMonitoringInterval(): number {
  switch (activityLevel) {
    case 'high':
      return 10000
    case 'normal':
      return 20000
    case 'low':
      return 60000
    default:
      return 20000
  }
}
function updateActivityLevel() {
  const now = Date.now()
  const timeSinceLastActivity = now - lastActivityTime
  if (timeSinceLastActivity < 15000) {
    activityLevel = 'high'
  } else if (timeSinceLastActivity < 120000) {
    activityLevel = 'normal'
  } else {
    activityLevel = 'low'
  }
}
function startContinuousMonitoring() {
  if (isLocalhost()) {
    return
  }

  if (captureInterval) {
    clearInterval(captureInterval)
  }
  updateActivityLevel()
  const interval = getMonitoringInterval()
  captureInterval = setInterval(() => {
    if (!runtime.id) {
      stopContinuousMonitoring()
      return
    }
    if (isActive) {
      updateActivityLevel()
      if (shouldCaptureBasedOnActivity()) {
        sendContextToBackground()
        hasUserActivity = false
        if (Date.now() - lastCaptureTime < 1000) {
          lastUrl = location.href
          lastTitle = document.title
          lastContent = extractVisibleText()
          lastContentHash = calculateContentHash(lastContent)
        }
      }
      const newInterval = getMonitoringInterval()
      if (newInterval !== interval) {
        startContinuousMonitoring()
      }
    }
  }, interval)
}
function stopContinuousMonitoring() {
  if (captureInterval) {
    clearInterval(captureInterval)
    captureInterval = null
  }
}
startContinuousMonitoring()
new MutationObserver(() => {
  const url = location.href
  if (url !== lastUrl) {
    lastUrl = url
    if (!isLocalhost()) {
      setTimeout(sendContextToBackground, 1000)
    }
  }
}).observe(document, { subtree: true, childList: true })
document.addEventListener('visibilitychange', () => {
  isActive = !document.hidden
  if (isActive) {
    startContinuousMonitoring()
  } else {
    stopContinuousMonitoring()
  }
})
window.addEventListener('blur', () => {
  isActive = false
  stopContinuousMonitoring()
})
window.addEventListener('focus', () => {
  isActive = true
  startContinuousMonitoring()
})
document.addEventListener('click', () => {
  lastActivityTime = Date.now()
  hasUserActivity = true
  activityLevel = 'high'
  ;(window as any).interactionCount++
})
document.addEventListener('scroll', () => {
  lastActivityTime = Date.now()
  hasUserActivity = true
  if (activityLevel === 'low') {
    activityLevel = 'normal'
  }
  ;(window as any).interactionCount++
})
document.addEventListener('keydown', () => {
  lastActivityTime = Date.now()
  hasUserActivity = true
  activityLevel = 'high'
  ;(window as any).interactionCount++
})
let mouseMoveTimeout: ReturnType<typeof setTimeout> | null = null
document.addEventListener('mousemove', () => {
  if (mouseMoveTimeout) return
  mouseMoveTimeout = setTimeout(() => {
    lastActivityTime = Date.now()
    hasUserActivity = true
    if (activityLevel === 'low') {
      activityLevel = 'normal'
    }
    mouseMoveTimeout = null
  }, 3000)
})

let draftToastTimeout: ReturnType<typeof setTimeout> | null = null
let draftToastElement: HTMLDivElement | null = null
let draftPillElement: HTMLDivElement | null = null
let draftPillObserver: MutationObserver | null = null
let isDrafting = false

async function handleDraftEmailRequest(): Promise<{ success: boolean; error?: string }> {
  const context = extractEmailContext()
  if (!context) {
    return { success: false, error: 'No supported email thread detected on this page.' }
  }

  try {
    showDraftToast('Drafting reply...', 'info')
    const payload: EmailDraftPayload = {
      subject: context.subject,
      thread_text: context.threadText,
      provider: context.provider,
      existing_draft: context.existingDraft,
      participants: context.participants,
      url: window.location.href,
      title: document.title,
    }
    const draft = await requestDraftFromBackground(payload)
    const injection = injectEmailDraft(context, draft)

    if (!injection.bodyApplied) {
      if (copyTextToClipboard(draft.body)) {
        showDraftToast('Draft copied to clipboard. Paste it into the compose box.', 'error')
      } else {
        showDraftToast('Unable to insert draft automatically.', 'error')
      }
      return { success: false, error: 'Could not insert draft automatically.' }
    }

    const subjectMessage = injection.subjectApplied ? '' : ' (Update subject manually if needed.)'
    showDraftToast(`Draft inserted into compose box${subjectMessage}`, 'success')
    return { success: true }
  } catch (error) {
    showDraftToast('Failed to draft reply.', 'error')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to draft reply.',
    }
  }
}

function extractEmailContext(): EmailDraftContext | null {
  const host = window.location.hostname
  if (host.includes('mail.google')) {
    return extractGmailContext()
  }
  if (
    host.includes('outlook.') ||
    host.includes('office.com') ||
    host.includes('live.com') ||
    host.includes('microsoft.com')
  ) {
    return extractOutlookContext()
  }
  return null
}

function extractGmailContext(): EmailDraftContext | null {
  const subject =
    document.querySelector('h2.hP')?.textContent?.trim() ||
    (document.querySelector('input[name="subjectbox"]') as HTMLInputElement | null)?.value?.trim() ||
    document.title ||
    'No subject'

  const messageNodes = Array.from(document.querySelectorAll('div[data-message-id]'))
  const threadParts = messageNodes
    .map(node => {
      const sender =
        node.querySelector('.gD')?.textContent?.trim() ||
        node.querySelector('.g2')?.textContent?.trim() ||
        ''
      const timestamp = node.querySelector('.g3')?.textContent?.trim() || ''
      const body =
        node.querySelector('.a3s')?.textContent?.trim() ||
        node.querySelector('.a3s')?.innerHTML?.replace(/<[^>]+>/g, ' ').trim() ||
        ''
      if (!body) {
        return ''
      }
      return `From: ${sender || 'Unknown'} ${timestamp}\n${body}`
    })
    .filter(Boolean)

  const threadText = threadParts.join('\n\n---\n\n').substring(0, EMAIL_THREAD_CHAR_LIMIT)
  if (!threadText) {
    return null
  }

  const composeElement = Array.from(
    document.querySelectorAll('div[aria-label="Message Body"], div[role="textbox"]')
  ).find(
    el => el.getAttribute('contenteditable') === 'true' && isElementVisible(el as HTMLElement)
  ) as HTMLElement | undefined

  const subjectElement = document.querySelector('input[name="subjectbox"]') as HTMLInputElement | null

  const participantSet = new Set<string>()
  document.querySelectorAll('span.gD, span.g2, span.go').forEach(el => {
    const name = el.textContent?.trim()
    if (name) {
      participantSet.add(name)
    }
  })

  return {
    provider: 'gmail',
    subject,
    threadText,
    participants: Array.from(participantSet),
    composeElement,
    subjectElement: subjectElement || undefined,
    existingDraft: composeElement?.textContent?.trim(),
  }
}

function extractOutlookContext(): EmailDraftContext | null {
  const subject =
    document
      .querySelector('div[role="heading"][aria-level="1"]')
      ?.textContent?.trim() ||
    (document.querySelector('input[aria-label*="subject"]') as HTMLInputElement | null)?.value?.trim() ||
    document.title ||
    'No subject'

  const messageNodes = Array.from(
    document.querySelectorAll('[data-testid="messageBodyContent"], div[aria-label="Message body"]')
  )

  const threadParts = messageNodes
    .filter(node => node.getAttribute('contenteditable') !== 'true')
    .map(node => node.textContent?.trim() || '')
    .filter(Boolean)

  const threadText = threadParts.join('\n\n---\n\n').substring(0, EMAIL_THREAD_CHAR_LIMIT)
  if (!threadText) {
    return null
  }

  const composeElement = Array.from(
    document.querySelectorAll('div[aria-label="Message body"]')
  ).find(
    el => el.getAttribute('contenteditable') === 'true' && isElementVisible(el as HTMLElement)
  ) as HTMLElement | undefined

  const subjectElement =
    (document.querySelector('input[aria-label*="subject"]') as HTMLInputElement | null) ||
    (document.querySelector('input[data-testid="subjectLine"]') as HTMLInputElement | null)

  const participantSet = new Set<string>()
  document
    .querySelectorAll('[data-testid="messageHeaderFrom"] span, span[role="presentation"]')
    .forEach(el => {
      const text = el.textContent?.trim()
      if (text) {
        participantSet.add(text)
      }
    })

  return {
    provider: 'outlook',
    subject,
    threadText,
    participants: Array.from(participantSet),
    composeElement,
    subjectElement: subjectElement || undefined,
    existingDraft: composeElement?.textContent?.trim(),
  }
}

function isElementVisible(element?: Element | null): element is HTMLElement {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
  )
}

function injectEmailDraft(
  context: EmailDraftContext,
  draft: EmailDraftResponse
): { bodyApplied: boolean; subjectApplied: boolean } {
  let subjectApplied = false
  if (context.subjectElement && draft.subject) {
    subjectApplied = setSubjectValue(context.subjectElement, draft.subject)
  }

  let bodyApplied = false
  if (context.composeElement) {
    bodyApplied = setComposeBody(context.composeElement, draft.body)
  }

  return { bodyApplied, subjectApplied }
}

function setSubjectValue(
  element: HTMLInputElement | HTMLTextAreaElement | undefined,
  value: string
): boolean {
  if (!element) {
    return false
  }
  try {
    element.focus()
    element.value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  } catch (_error) {
    return false
  }
}

function setComposeBody(element: HTMLElement, body: string): boolean {
  try {
    element.focus()
    const html = convertPlainTextToHtml(body)
    element.innerHTML = html
    const inputEvent = new Event('input', { bubbles: true })
    element.dispatchEvent(inputEvent)
    const changeEvent = new Event('change', { bubbles: true })
    element.dispatchEvent(changeEvent)
    return true
  } catch (_error) {
    return false
  }
}

function convertPlainTextToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => {
      if (!line.trim()) {
        return '<div><br></div>'
      }
      return `<div>${escapeHtml(line)}</div>`
    })
    .join('')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function copyTextToClipboard(text: string): boolean {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {})
      return true
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  } catch (_error) {
    return false
  }
}

function showCaptureIndicator(): void {
  // Remove existing indicator if any
  const existing = document.getElementById('cognia-capture-indicator')
  if (existing) {
    existing.remove()
  }

  const indicator = document.createElement('div')
  indicator.id = 'cognia-capture-indicator'
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #000;
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideIn 0.3s ease-out;
  `

  const icon = document.createElement('span')
  icon.textContent = '✓'
  icon.style.cssText = 'font-size: 14px;'

  const text = document.createElement('span')
  text.textContent = 'Captured'

  indicator.appendChild(icon)
  indicator.appendChild(text)
  document.body.appendChild(indicator)

  // Add animation
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `
  if (!document.head.querySelector('#cognia-capture-animations')) {
    style.id = 'cognia-capture-animations'
    document.head.appendChild(style)
  }

  // Auto-remove after 2 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.style.animation = 'slideIn 0.3s ease-out reverse'
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator)
        }
      }, 300)
    }
  }, 2000)
}

function showDraftToast(message: string, variant: 'info' | 'success' | 'error' = 'info'): void {
  if (draftToastTimeout && draftToastElement) {
    draftToastElement.remove()
    draftToastElement = null
  }

  const toast = document.createElement('div')
  const colors: Record<typeof variant, { bg: string; text: string; border: string }> = {
    info: { bg: 'rgba(59,130,246,0.95)', text: '#ffffff', border: 'rgba(59,130,246,0.4)' },
    success: { bg: 'rgba(16,185,129,0.95)', text: '#ffffff', border: 'rgba(16,185,129,0.4)' },
    error: { bg: 'rgba(239,68,68,0.95)', text: '#ffffff', border: 'rgba(239,68,68,0.4)' },
  }
  const palette = colors[variant]
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    padding: 12px 16px;
    border-radius: 10px;
    background: ${palette.bg};
    color: ${palette.text};
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    border: 1px solid ${palette.border};
    max-width: 320px;
  `
  toast.textContent = message
  document.body.appendChild(toast)
  draftToastElement = toast

  draftToastTimeout = setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast)
    }
    draftToastElement = null
  }, 5000)
}

function requestDraftFromBackground(payload: EmailDraftPayload): Promise<EmailDraftResponse> {
  return new Promise((resolve, reject) => {
    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout - background script did not respond'))
    }, 6000000) // 60 second timeout

    runtime.sendMessage({ type: MESSAGE_TYPES.DRAFT_EMAIL_REPLY, payload }, response => {
      clearTimeout(timeout)
      
      // Check for Chrome extension API errors
      if (chrome.runtime.lastError) {
        reject(new Error(`Extension error: ${chrome.runtime.lastError.message}`))
        return
      }
      
      if (!response) {
        reject(new Error('No response from background script.'))
        return
      }
      
      if (response.success && response.data) {
        resolve(response.data as EmailDraftResponse)
      } else {
        reject(new Error(response.error || 'Draft request failed.'))
      }
    })
  })
}

function initEmailDraftPill(): void {
  const host = window.location.hostname
  const isEmailSite = host.includes('mail.google') || 
                      host.includes('outlook.') || 
                      host.includes('office.com') || 
                      host.includes('live.com') || 
                      host.includes('microsoft.com')
  
  if (!isEmailSite) {
    return
  }

  // Watch for compose fields appearing or being focused
  const checkForComposeField = () => {
    const context = extractEmailContext()
    if (context?.composeElement && isElementVisible(context.composeElement)) {
      ensureDraftPill(context.composeElement, context)
    } else {
      removeDraftPill()
    }
  }

  // Check on focus events
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement
    if (target && (target.contentEditable === 'true' || target.closest('[contenteditable="true"]'))) {
      setTimeout(checkForComposeField, 100)
    }
  }, true)

  // Check on input events (user typing)
  document.addEventListener('input', (e) => {
    const target = e.target as HTMLElement
    if (target && target.contentEditable === 'true') {
      setTimeout(checkForComposeField, 100)
    }
  }, true)

  // Watch for DOM changes (Gmail/Outlook dynamically load compose windows)
  if (!draftPillObserver) {
    draftPillObserver = new MutationObserver(() => {
      checkForComposeField()
    })
    draftPillObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
    })
  }

  // Initial check
  setTimeout(checkForComposeField, 500)
}

function ensureDraftPill(composeElement: HTMLElement, context: EmailDraftContext): void {
  // Check if pill already exists for this element
  if (draftPillElement && document.body.contains(draftPillElement)) {
    const existingCompose = (draftPillElement as any)._composeElement
    if (existingCompose === composeElement) {
      return // Same element, keep existing pill
    }
    // Different element, remove old pill
    removeDraftPill()
  }

  // Create pill element - ChatGPT style
  const pill = document.createElement('div')
  pill.className = 'cognia-draft-pill'
  
  // ChatGPT-style pill design - compact and small
  pill.style.cssText = `
    position: fixed;
    z-index: 10000;
    background: #f0f0f0;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 2px 8px;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: #1a1a1a;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    user-select: none;
    pointer-events: auto;
    white-space: nowrap;
    line-height: 1.2;
    height: 20px;
  `

  // Create icon (sparkle - smaller)
  const icon = document.createElement('span')
  icon.innerHTML = '✨'
  icon.style.cssText = `
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    line-height: 1;
    margin-top: -1px;
  `

  // Create text
  const text = document.createElement('span')
  text.textContent = 'Draft'
  text.style.cssText = `
    display: inline-flex;
    align-items: center;
    font-size: 11px;
  `

  pill.appendChild(icon)
  pill.appendChild(text)

  // Hover effects - ChatGPT style
  pill.addEventListener('mouseenter', () => {
    pill.style.background = '#e8e8e8'
    pill.style.borderColor = '#d0d0d0'
    pill.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.12)'
  })
  pill.addEventListener('mouseleave', () => {
    pill.style.background = '#f0f0f0'
    pill.style.borderColor = '#e0e0e0'
    pill.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
  })

  // Click handler
  pill.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isDrafting) {
      return
    }

    isDrafting = true
    pill.style.opacity = '0.7'
    pill.style.cursor = 'wait'
    text.textContent = '...'
    
    try {
      const currentContext = extractEmailContext()
      if (!currentContext) {
        text.textContent = 'Draft'
        showDraftToast('No email thread detected.', 'error')
        return
      }
      
      const payload: EmailDraftPayload = {
        thread_text: currentContext.threadText,
        subject: currentContext.subject,
        provider: currentContext.provider,
        participants: currentContext.participants,
        existing_draft: currentContext.existingDraft,
        url: window.location.href,
        title: document.title,
      }

      const draft = await requestDraftFromBackground(payload)
      const injection = injectEmailDraft(currentContext, draft)
      
      if (!injection.bodyApplied) {
        if (copyTextToClipboard(draft.body)) {
          showDraftToast('Draft copied to clipboard. Paste it into the compose box.', 'error')
        } else {
          showDraftToast('Unable to insert draft automatically.', 'error')
        }
        return
      }

      const subjectMessage = injection.subjectApplied ? ' and subject updated' : ''
      showDraftToast(`Draft inserted${subjectMessage}`, 'success')
      
      // Update pill to show success state briefly
      text.textContent = '✓'
      pill.style.background = '#e8f5e9'
      pill.style.borderColor = '#c8e6c9'
      pill.style.color = '#2e7d32'
      
      // Remove pill after successful draft
      setTimeout(() => {
        removeDraftPill()
      }, 2000)
    } catch (error) {
      text.textContent = 'Draft'
      showDraftToast('Failed to draft reply.', 'error')
      console.error('[Cognia] Draft error:', error)
    } finally {
      isDrafting = false
      if (text.textContent !== '✓') {
        pill.style.opacity = '1'
        pill.style.cursor = 'pointer'
        pill.style.background = '#f0f0f0'
        pill.style.borderColor = '#e0e0e0'
        pill.style.color = '#1a1a1a'
      }
    }
  })

  // Position the pill relative to compose element
  // Try to find the compose element's container (Gmail/Outlook use specific containers)
  const composeContainer = composeElement.closest('[role="dialog"], .aYF, .ms-ComposeHeader, .ms-ComposeBody') || composeElement.parentElement
  
  const positionPill = () => {
    if (!composeElement || !isElementVisible(composeElement)) {
      removeDraftPill()
      return
    }
    
    const rect = composeElement.getBoundingClientRect()
    
    // Position at bottom-right corner of compose field, similar to ChatGPT
    // ChatGPT positions it just above the bottom edge, slightly inset from the right
    pill.style.position = 'fixed'
    
    // Position relative to compose field's bottom-right, with small offset
    const offsetX = 12 // pixels from right edge
    const offsetY = 8  // pixels from bottom edge
    
    pill.style.top = `${rect.bottom - offsetY - 24}px` // 24px is approximate pill height (compact)
    pill.style.left = `${rect.right - offsetX - 70}px` // 70px is approximate pill width (compact)
    
    // Ensure it doesn't go off-screen
    const pillRect = pill.getBoundingClientRect()
    if (pillRect.right > window.innerWidth - 10) {
      pill.style.left = `${window.innerWidth - pillRect.width - 10}px`
    }
    if (pillRect.left < 10) {
      pill.style.left = '10px'
    }
    if (pillRect.bottom > window.innerHeight - 10) {
      pill.style.top = `${window.innerHeight - pillRect.height - 10}px`
    }
    if (pillRect.top < 10) {
      pill.style.top = `${rect.top + 10}px`
    }
  }

  positionPill()
  
  // Append to compose container if it exists, otherwise to body
  if (composeContainer && composeContainer !== document.body && composeContainer instanceof HTMLElement) {
    composeContainer.style.position = 'relative'
    composeContainer.appendChild(pill)
  } else {
    document.body.appendChild(pill)
  }
  
  draftPillElement = pill

  // Reposition on scroll/resize
  const repositionHandler = () => {
    if (isElementVisible(composeElement)) {
      positionPill()
    } else {
      removeDraftPill()
    }
  }
  window.addEventListener('scroll', repositionHandler, true)
  window.addEventListener('resize', repositionHandler)
  
  // Store handler for cleanup
  ;(pill as any)._repositionHandler = repositionHandler
  ;(pill as any)._composeElement = composeElement
}

function removeDraftPill(): void {
  if (draftPillElement) {
    const handler = (draftPillElement as any)._repositionHandler
    if (handler) {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
    draftPillElement.remove()
    draftPillElement = null
  }
}

// AI Chat Platform Detection
type AIChatPlatform = 'chatgpt' | 'claude' | 'none'

let currentPlatform: AIChatPlatform = 'none'
let chatInput: HTMLTextAreaElement | HTMLElement | null = null
let chatSendButton: HTMLButtonElement | null = null
let originalSendHandler: ((event: Event) => void) | null = null
const _isProcessingMemory = false
let cogniaIcon: HTMLElement | null = null
let typingTimeout: ReturnType<typeof setTimeout> | null = null
let lastTypedText = ''
let isAutoInjecting = false

function detectAIChatPlatform(): AIChatPlatform {
  const hostname = window.location.hostname

  // ChatGPT detection
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
    return 'chatgpt'
  }

  // Claude detection
  if (hostname.includes('claude.ai') || hostname.includes('anthropic.com')) {
    return 'claude'
  }

  return 'none'
}

async function pollSearchJob(jobId: string): Promise<string | null> {
  try {
    // Derive API base from extension settings
    let apiBase = 'http://localhost:3000/api'
    try {
      const cfg = await storage.sync.get(['apiEndpoint'])
      const endpoint = cfg?.apiEndpoint as string | undefined
      if (endpoint) {
        const u = new URL(endpoint)
        apiBase = `${u.protocol}//${u.host}/api`
      }
    } catch {}
    // Require authentication token
    let authToken: string
    try {
      authToken = await requireAuthToken()
    } catch (_error) {
      console.error('Cognia: Authentication required. Please log in through the web client first.')
      return null
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    }

    const response = await fetch(`${apiBase}/search/job/${jobId}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json()

    if (result.status === 'completed' && result.answer) {
      return result.answer
    } else if (result.status === 'failed') {
      return null
    }

    return null // Still pending
  } catch (_error) {
    return null
  }
}

async function getMemorySummary(query: string): Promise<string | null> {
  try {
    let userId: string
    try {
      userId = await getUserId()
    } catch (_error) {
      return null
    }
    // Derive API base from extension settings
    let apiBase = 'http://localhost:3000/api'
    try {
      const cfg = await storage.sync.get(['apiEndpoint'])
      const endpoint = cfg?.apiEndpoint as string | undefined
      if (endpoint) {
        const u = new URL(endpoint)
        apiBase = `${u.protocol}//${u.host}/api`
      }
    } catch {}
    const searchEndpoint = `${apiBase}/search`

    const requestBody = {
      userId: userId,
      query: query,
      limit: 5,
      contextOnly: false,
    }

    // Require authentication token
    let authToken: string
    try {
      authToken = await requireAuthToken()
    } catch (_error) {
      console.error('Cognia: Authentication required. Please log in through the web client first.')
      return null
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`,
    }

    const response = await fetch(searchEndpoint, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      console.error('Cognia: Search request failed:', response.status, response.statusText)
      return null
    }

    const responseText = await response.text()

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Cognia: Failed to parse search response:', parseError)
      return null
    }

    // Handle response structure exactly like client-side
    let summaryParts: string[] = []

    console.log('Cognia: Search response received:', {
      hasAnswer: !!result.answer,
      hasMetaSummary: !!result.meta_summary,
      resultsCount: result.results?.length || 0,
      hasCitations: !!result.citations,
      citationsCount: result.citations?.length || 0,
      hasJobId: !!result.job_id,
    })

    if (result.answer) {
      console.log('Cognia: Using answer from response')
      summaryParts.push(result.answer)
    } else if (result.meta_summary) {
      console.log('Cognia: Using meta_summary from response')
      summaryParts.push(result.meta_summary)
    } else if (result.results && result.results.length > 0) {
      console.log('Cognia: Using results count from response')
      summaryParts.push(`Found ${result.results.length} relevant memories about "${query}".`)
    }

    if (result.citations && result.citations.length > 0) {
      const citationTexts = result.citations
        .slice(0, 6)
        .map((c: any) => `[${c.label}] ${c.title || 'Open memory'}`)
      summaryParts.push(citationTexts.join('\n'))
    }

    // If we have a job_id but no immediate answer, poll for the result
    if (result.job_id && !result.answer) {
      // Poll for up to 10 seconds (6 attempts with 1.5s intervals)
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        const jobResult = await pollSearchJob(result.job_id)

        if (jobResult) {
          summaryParts = [jobResult]
          if (result.citations && result.citations.length > 0) {
            const citationTexts = result.citations
              .slice(0, 6)
              .map((c: any) => `[${c.label}] ${c.title || 'Open memory'}`)
            summaryParts.push(citationTexts.join('\n'))
          }
          break
        }
      }
    }

    if (summaryParts.length === 0) {
      console.log('Cognia: No summary parts found, returning null')
      return null
    }

    const finalSummary = summaryParts.join('\n\n')
    console.log('Cognia: Final memory summary:', finalSummary.substring(0, 200) + '...')
    return finalSummary
  } catch (error) {
    console.error('Cognia: Error in getMemorySummary:', error)
    return null
  }
}

async function getApiEndpointForMemory(): Promise<string> {
  try {
    const result = await storage.sync.get(['apiEndpoint'])
    return result.apiEndpoint || 'http://localhost:3000/api/memory/process'
  } catch (error) {
    console.error('Cognia: Error getting API endpoint:', error)
    return 'http://localhost:3000/api/memory/process'
  }
}

function injectMemorySummary(summary: string, originalMessage: string): void {
  if (!chatInput) {
    console.log('Cognia: No chat input found for injection')
    return
  }

  const combinedMessage = `[Cognia Memory Context]\n${summary}\n\n[Your Question]\n${originalMessage}`
  console.log('Cognia: Injecting combined message:', combinedMessage.substring(0, 200) + '...')

  if (chatInput.tagName === 'TEXTAREA') {
    console.log('Cognia: Injecting into textarea')
    ;(chatInput as HTMLTextAreaElement).value = combinedMessage
    const inputEvent = new Event('input', { bubbles: true })
    chatInput.dispatchEvent(inputEvent)
  } else if ((chatInput as HTMLElement).contentEditable === 'true') {
    console.log('Cognia: Injecting into contentEditable div')
    chatInput.textContent = combinedMessage
    const inputEvent = new Event('input', { bubbles: true })
    chatInput.dispatchEvent(inputEvent)
  } else {
    console.log('Cognia: Unknown input type:', chatInput.tagName, chatInput)
  }
}

async function autoInjectMemories(userText: string): Promise<void> {
  if (isAutoInjecting || !userText || userText.length < 3) return

  if (userText.includes('[Cognia Memory Context]')) return

  const enabled = await checkExtensionEnabled()
  if (!enabled) {
    return
  }

  const memoryInjectionEnabled = await checkMemoryInjectionEnabled()
  if (!memoryInjectionEnabled) {
    return
  }

  isAutoInjecting = true

  try {
    if (cogniaIcon) {
      cogniaIcon.style.color = '#f59e0b'
      cogniaIcon.style.animation = 'pulse 1s infinite'
    }

    const memorySummary = await getMemorySummary(userText)

    if (memorySummary) {
      const currentText = getCurrentInputText()
      console.log('Cognia: Memory found, checking text match:', {
        originalText: userText,
        currentText: currentText,
        textsMatch: currentText === userText,
        currentTextLength: currentText.length,
        originalTextLength: userText.length,
      })

      // More lenient text matching - check if current text contains the original text
      const textMatches =
        currentText === userText ||
        currentText.includes(userText) ||
        userText.includes(currentText) ||
        currentText.trim() === userText.trim()

      if (textMatches) {
        console.log('Cognia: Injecting memory summary')
        injectMemorySummary(memorySummary, userText)

        if (cogniaIcon) {
          cogniaIcon.style.color = '#10a37f'
          cogniaIcon.style.animation = 'none'
        }
      } else {
        console.log('Cognia: Text changed during search, not injecting')
        if (cogniaIcon) {
          cogniaIcon.style.color = '#8e8ea0'
          cogniaIcon.style.animation = 'none'
        }
      }
    } else {
      if (cogniaIcon) {
        cogniaIcon.style.color = '#8e8ea0'
        cogniaIcon.style.animation = 'none'
      }
    }
  } catch (error) {
    console.error('Cognia: Error auto-injecting memories:', error)
    if (cogniaIcon) {
      cogniaIcon.style.color = '#ef4444'
      cogniaIcon.style.animation = 'none'
    }
  } finally {
    isAutoInjecting = false
    setTimeout(() => {
      if (cogniaIcon) {
        cogniaIcon.style.color = '#8e8ea0'
      }
    }, 2000)
  }
}

function getCurrentInputText(): string {
  if (!chatInput) return ''

  if (chatInput.tagName === 'TEXTAREA') {
    return (chatInput as HTMLTextAreaElement).value?.trim() || ''
  } else if ((chatInput as HTMLElement).contentEditable === 'true') {
    return chatInput.textContent?.trim() || ''
  }

  return ''
}

function handleTyping(): void {
  if (!chatInput) return

  const currentText = getCurrentInputText()

  if (currentText.includes('[Cognia Memory Context]')) return

  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }

  typingTimeout = setTimeout(async () => {
    if (currentText && currentText.length >= 3 && currentText !== lastTypedText) {
      lastTypedText = currentText
      await autoInjectMemories(currentText)
    }
  }, 1500)
}

function calculateIconPosition(): string {
  if (chatSendButton && chatInput) {
    try {
      const container = (chatInput as HTMLElement).closest('div')
      if (container) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = chatSendButton.getBoundingClientRect()
        const buttonRightFromContainer = containerRect.right - buttonRect.right
        const buttonWidth = buttonRect.width || 40
        const spacing = 12
        const rightPosition = buttonRightFromContainer + buttonWidth + spacing
        return `${Math.max(rightPosition, 60)}px`
      }
    } catch (_error) {}
  }
  return '60px'
}

async function createCogniaIcon(): Promise<HTMLElement> {
  const icon = document.createElement('div')
  icon.id = 'cognia-extension-icon'
  icon.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
      <path d="M19 15L19.5 17.5L22 18L19.5 18.5L19 21L18.5 18.5L16 18L18.5 17.5L19 15Z" fill="currentColor"/>
      <path d="M5 15L5.5 17.5L8 18L5.5 18.5L5 21L4.5 18.5L2 18L4.5 17.5L5 15Z" fill="currentColor"/>
    </svg>
  `

  const enabled = await checkExtensionEnabled()
  const baseColor = enabled ? '#10a37f' : '#8e8ea0'
  const bgColor = enabled ? 'rgba(16, 163, 127, 0.1)' : 'rgba(142, 142, 160, 0.1)'
  const borderColor = enabled ? 'rgba(16, 163, 127, 0.2)' : 'rgba(142, 142, 160, 0.2)'

  const rightPosition = calculateIconPosition()

  icon.style.cssText = `
    position: absolute !important;
    right: ${rightPosition} !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 32px !important;
    height: 32px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: ${baseColor} !important;
    cursor: pointer !important;
    border-radius: 8px !important;
    transition: all 0.2s ease !important;
    z-index: 1 !important;
    background: ${bgColor} !important;
    border: 1px solid ${borderColor} !important;
    padding: 0 !important;
    box-shadow: 0 2px 12px ${enabled ? 'rgba(16, 163, 127, 0.15)' : 'rgba(142, 142, 160, 0.15)'} !important;
    visibility: visible !important;
    opacity: ${enabled ? '1' : '0.6'} !important;
    pointer-events: auto !important;
    backdrop-filter: blur(8px) !important;
  `

  icon.addEventListener('mouseenter', () => {
    icon.style.color = '#ffffff'
    icon.style.backgroundColor = '#10a37f'
    icon.style.borderColor = '#10a37f'
    icon.style.transform = 'translateY(-50%) scale(1.05)'
    icon.style.boxShadow = '0 4px 16px rgba(16, 163, 127, 0.3)'
  })

  icon.addEventListener('mouseleave', () => {
    icon.style.color = '#10a37f'
    icon.style.backgroundColor = 'rgba(16, 163, 127, 0.1)'
    icon.style.borderColor = 'rgba(16, 163, 127, 0.2)'
    icon.style.transform = 'translateY(-50%) scale(1)'
    icon.style.boxShadow = '0 2px 12px rgba(16, 163, 127, 0.15)'
  })

  icon.addEventListener('click', async () => {
    await showCogniaStatus()
  })

  return icon
}

// async function checkApiHealth(): Promise<boolean> {
//   try {
//     // Extension needs full URL since it's not running on the same domain
//     const healthEndpoint = 'http://localhost:3000/api/search';

//     const response = await fetch(healthEndpoint, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         wallet: 'health-check',
//         query: 'test',
//         limit: 1,
//         contextOnly: false
//       }),
//     });

//     return response.status < 500;
//   } catch (_error) {
//     console.error('Cognia: Health check failed:', error);
//     return false;
//   }
// }

async function checkExtensionEnabled(): Promise<boolean> {
  try {
    return new Promise(resolve => {
      runtime.sendMessage({ type: 'GET_EXTENSION_ENABLED' }, (response: any) => {
        resolve(response?.success ? response.enabled : true)
      })
    })
  } catch (error) {
    console.error('Cognia: Error checking extension enabled state:', error)
    return true
  }
}

async function checkMemoryInjectionEnabled(): Promise<boolean> {
  try {
    return new Promise(resolve => {
      runtime.sendMessage({ type: 'GET_MEMORY_INJECTION_ENABLED' }, (response: any) => {
        resolve(response?.success ? response.enabled : true)
      })
    })
  } catch (error) {
    console.error('Cognia: Error checking memory injection enabled state:', error)
    return true
  }
}

async function checkWebsiteBlocked(url: string): Promise<boolean> {
  try {
    return new Promise(resolve => {
      runtime.sendMessage({ type: 'CHECK_WEBSITE_BLOCKED', url: url }, (response: any) => {
        resolve(response?.success ? response.blocked : false)
      })
    })
  } catch (_error) {
    return false
  }
}

async function showCogniaStatus(): Promise<void> {
  const tooltip = document.createElement('div')
  tooltip.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(16, 163, 127, 0.95);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 24px rgba(16, 163, 127, 0.3);
    z-index: 10000;
    max-width: 320px;
    border: 1px solid rgba(16, 163, 127, 0.3);
    backdrop-filter: blur(12px);
  `

  tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff; animation: pulse 1s infinite;"></div>
        <strong>Cognia Extension</strong>
      </div>
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">
        Checking status...
      </div>
    `

  document.body.appendChild(tooltip)

  try {
    const [apiHealthy, extensionEnabled] = await Promise.all([
      // checkApiHealth()
      true,
      checkExtensionEnabled(),
    ])

    const apiStatus = apiHealthy ? 'Connected' : 'Not Connected'
    const extensionStatus = extensionEnabled ? 'Enabled' : 'Disabled'
    const overallStatus = apiHealthy && extensionEnabled ? 'Active' : 'Inactive'
    const statusColor = overallStatus === 'Active' ? '#10a37f' : '#ef4444'

    const platformName =
      currentPlatform === 'chatgpt'
        ? 'ChatGPT'
        : currentPlatform === 'claude'
          ? 'Claude'
          : 'Unknown'

    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></div>
        <strong>Cognia on ${platformName}</strong>
      </div>
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9);">
        <div>Extension: ${extensionStatus}</div>
        <div>API: ${apiStatus}</div>
      </div>
      <div style="font-size: 11px; color: rgba(255, 255, 255, 0.7); margin-top: 8px;">
        ${extensionEnabled ? 'Memories are automatically injected as you type (1.5s delay).' : 'Extension is disabled. Click the popup to enable.'}
      </div>
    `
  } catch (error) {
    console.error('Cognia: Error checking status:', error)
    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div>
        <strong>Cognia Extension</strong>
      </div>
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9);">
        Error checking status
      </div>
    `
  }

  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip)
    }
  }, 6000)
}

function findChatInputElements(): void {
  let inputSelectors: string[] = []
  let buttonSelectors: string[] = []

  if (currentPlatform === 'chatgpt') {
    inputSelectors = [
      'div[contenteditable="true"]',
      'textarea[placeholder*="Ask anything"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Send a message"]',
      'textarea[placeholder*="Type a message"]',
      'textarea[role="textbox"]',
      'textarea',
      'input[type="text"]',
    ]

    buttonSelectors = [
      'button[data-testid*="send"]',
      'button[aria-label*="Send"]',
      'button[title*="Send"]',
      'button[aria-label*="Submit"]',
      'button[type="submit"]',
      'button:has(svg)',
      'button[class*="send"]',
      'button[class*="submit"]',
      'button',
    ]
  } else if (currentPlatform === 'claude') {
    inputSelectors = [
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="Reply"]',
      'textarea[placeholder*="Talk to Claude"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Ask"]',
      'div.ProseMirror',
      'textarea',
      'input[type="text"]',
    ]

    buttonSelectors = [
      'button[aria-label*="Send"]',
      'button[title*="Send"]',
      'button[aria-label*="Submit"]',
      'button[type="submit"]',
      'button:has(svg)',
      'button[class*="send"]',
      'button[class*="submit"]',
      'button',
    ]
  }

  // Find input element
  for (const selector of inputSelectors) {
    const element = document.querySelector(selector) as HTMLElement
    if (element && element.offsetParent !== null) {
      chatInput = element as any
      break
    }
  }

  // Find send button
  for (const selector of buttonSelectors) {
    const element = document.querySelector(selector) as HTMLButtonElement
    if (element && element.offsetParent !== null) {
      chatSendButton = element
      break
    }
  }
}

function setupAIChatIntegration(): void {
  if (currentPlatform === 'none') return

  if (originalSendHandler) {
    return
  }

  findChatInputElements()

  if (chatInput && !cogniaIcon) {
    const containerSelectors = [
      'div[class*="input"]',
      'div[class*="chat"]',
      'div[class*="message"]',
      'div[class*="form"]',
      'div[class*="composer"]',
      'div[class*="prompt"]',
      'div[class*="textbox"]',
      'div',
    ]

    let inputContainer: Element | null = null
    for (const selector of containerSelectors) {
      const container = (chatInput as HTMLElement).closest(selector)
      if (container) {
        inputContainer = container
        break
      }
    }

    if (!inputContainer) {
      inputContainer = (chatInput as HTMLElement).parentElement
    }

    if (inputContainer) {
      const containerStyle = window.getComputedStyle(inputContainer)
      if (containerStyle.position === 'static') {
        ;(inputContainer as HTMLElement).style.position = 'relative'
      }

      const existingIcon = document.getElementById('cognia-extension-icon')
      if (existingIcon) {
        existingIcon.remove()
      }

      createCogniaIcon().then(icon => {
        cogniaIcon = icon
        inputContainer.appendChild(cogniaIcon)
        setTimeout(() => {
          if (cogniaIcon && chatSendButton) {
            const newRightPosition = calculateIconPosition()
            cogniaIcon.style.right = newRightPosition
          }
        }, 100)
      })

      const ensureIconVisible = () => {
        if (!cogniaIcon || !document.body.contains(cogniaIcon)) {
          findChatInputElements()

          if (chatInput) {
            let newContainer: Element | null = null
            const containerSelectors = [
              'div[class*="input"]',
              'div[class*="chat"]',
              'div[class*="message"]',
              'div[class*="form"]',
              'div[class*="composer"]',
              'div[class*="prompt"]',
              'div[class*="textbox"]',
              'div',
            ]

            for (const selector of containerSelectors) {
              const container = (chatInput as HTMLElement).closest(selector)
              if (container) {
                newContainer = container
                break
              }
            }

            if (!newContainer) {
              newContainer = (chatInput as HTMLElement).parentElement
            }

            if (newContainer && document.body.contains(newContainer)) {
              const existingIcon = document.getElementById('cognia-extension-icon')
              if (existingIcon) {
                existingIcon.remove()
              }

              createCogniaIcon().then(icon => {
                cogniaIcon = icon
                newContainer.appendChild(cogniaIcon)
                setTimeout(() => {
                  if (cogniaIcon && chatSendButton) {
                    const newRightPosition = calculateIconPosition()
                    cogniaIcon.style.right = newRightPosition
                  }
                }, 100)
              })
            }
          }
        }
      }

      setInterval(ensureIconVisible, 1000)

      const iconObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            const removedNodes = Array.from(mutation.removedNodes)
            const iconRemoved = removedNodes.some(
              node =>
                node.nodeType === Node.ELEMENT_NODE &&
                (node as Element).id === 'cognia-extension-icon'
            )

            if (iconRemoved) {
              setTimeout(() => {
                if (!cogniaIcon || !document.body.contains(cogniaIcon)) {
                  ensureIconVisible()
                }
              }, 500)
            }
          }
        })
      })

      if (inputContainer) {
        iconObserver.observe(inputContainer, {
          childList: true,
          subtree: true,
        })
      }
    }
  }

  if (chatInput && !originalSendHandler) {
    const inputHandler = (_e: Event) => {
      handleTyping()
    }

    const keyupHandler = (_e: Event) => {
      handleTyping()
    }

    const pasteHandler = (_e: Event) => {
      setTimeout(handleTyping, 100)
    }

    chatInput.addEventListener('input', inputHandler, true)
    chatInput.addEventListener('keyup', keyupHandler, true)
    chatInput.addEventListener('paste', pasteHandler, true)

    if ((chatInput as HTMLElement).contentEditable === 'true') {
      document.addEventListener(
        'input',
        e => {
          if (e.target === chatInput) {
            handleTyping()
          }
        },
        true
      )

      const contentObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            handleTyping()
          }
        })
      })

      contentObserver.observe(chatInput as Node, {
        childList: true,
        subtree: true,
        characterData: true,
      })
    }

    originalSendHandler = () => {}
  } else if (!chatInput) {
    console.log('Cognia: No chat input found for event listeners')
  } else if (originalSendHandler) {
    console.log('Cognia: Event listeners already attached')
  }
}

function addCogniaStyles(): void {
  if (document.getElementById('cognia-styles')) return

  const style = document.createElement('style')
  style.id = 'cognia-styles'
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    #cognia-extension-icon {
      transition: all 0.2s ease;
    }
    
    #cognia-extension-icon:hover {
      transform: translateY(-50%) scale(1.1) !important;
    }
  `
  document.head.appendChild(style)
}

function waitForAIChatReady(): Promise<void> {
  return new Promise(resolve => {
    let attempts = 0
    const maxAttempts = 5

    const checkReady = () => {
      attempts++

      const hasInput =
        document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea')
      const hasSendButton = document.querySelector(
        'button[data-testid*="send"], button[aria-label*="Send"], button[title*="Send"]'
      )

      if (hasInput && hasSendButton) {
        resolve()
      } else if (attempts >= maxAttempts) {
        resolve()
      } else {
        setTimeout(checkReady, 1000)
      }
    }

    setTimeout(checkReady, 1000)
  })
}

function trySetupImmediately(): void {
  setupAIChatIntegration()

  if (!cogniaIcon) {
    setTimeout(() => {
      setupAIChatIntegration()
    }, 3000)

    setTimeout(() => {
      setupAIChatIntegration()
    }, 6000)
  }
}

function initAIChatIntegration(): void {
  currentPlatform = detectAIChatPlatform()

  if (currentPlatform !== 'none') {
    addCogniaStyles()

    trySetupImmediately()

    waitForAIChatReady().then(() => {
      setupAIChatIntegration()
    })

    let setupTimeout: ReturnType<typeof setTimeout> | null = null
    let isWaitingForReady = true

    const observer = new MutationObserver(mutations => {
      if (originalSendHandler || isWaitingForReady) return

      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const hasNewChatElements = Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              return (
                element.querySelector &&
                (element.querySelector('div[contenteditable="true"]') ||
                  element.querySelector('textarea') ||
                  element.querySelector('button[data-testid*="send"]') ||
                  element.tagName === 'TEXTAREA' ||
                  element.tagName === 'BUTTON')
              )
            }
            return false
          })

          if (hasNewChatElements && !setupTimeout) {
            setupTimeout = setTimeout(() => {
              setupAIChatIntegration()
              setupTimeout = null
            }, 1000)
          }
        }
      })
    })

    waitForAIChatReady().then(() => {
      isWaitingForReady = false
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
    })

    let retryCount = 0
    const maxRetries = 3
    const retrySetup = () => {
      if (!cogniaIcon && !originalSendHandler && retryCount < maxRetries) {
        retryCount++
        setupAIChatIntegration()
        setTimeout(retrySetup, 3000)
      } else if (retryCount >= maxRetries) {
        // Max retries reached, giving up
      }
    }

    waitForAIChatReady().then(() => {
      setTimeout(retrySetup, 2000)
    })

    const continuousIconMonitor = () => {
      if (!cogniaIcon && currentPlatform !== 'none') {
        setupAIChatIntegration()
      }
    }

    setInterval(continuousIconMonitor, 5000)
  }
}

function debugAIChatElements(): void {
  console.log('Cognia Debug Info:')
  console.log('Platform:', currentPlatform)
  console.log('Chat Input:', chatInput)
  console.log('Cognia Icon:', cogniaIcon)
}

;(window as any).debugCognia = debugAIChatElements
;(window as any).triggerCognia = async () => {
  const currentText = getCurrentInputText()
  if (currentText && currentText.length >= 3) {
    await autoInjectMemories(currentText)
  } else {
    // Text too short, skipping
  }
}
;(window as any).setupCogniaListeners = () => {
  findChatInputElements()
  if (chatInput) {
    console.log('Cognia: Setting up listeners')
    const inputHandler = (_e: Event) => {
      handleTyping()
    }

    chatInput.addEventListener('input', inputHandler, true)
    chatInput.addEventListener('keyup', inputHandler, true)
    chatInput.addEventListener('paste', inputHandler, true)
  } else {
    console.log('Cognia: No chat input found')
  }
}
;(window as any).testMemoryInjection = async () => {
  const currentText = getCurrentInputText()
  if (currentText && currentText.length >= 3) {
    await autoInjectMemories(currentText)
  } else {
    // Text too short, skipping
  }
}
;(window as any).testCogniaSearch = async (query = 'server boilerplates') => {
  try {
    const result = await getMemorySummary(query)
    return result
  } catch (_error) {
    return null
  }
}
;(window as any).checkCogniaStatus = async () => {
  // const apiHealthy = await checkApiHealth();
  const apiEndpoint = await getApiEndpointForMemory()

  return {
    apiEndpoint,
    // apiHealthy,
    apiHealthy: true,
    platform: currentPlatform,
    chatInput: !!chatInput,
    cogniaIcon: !!cogniaIcon,
  }
}

initAIChatIntegration()
initEmailDraftPill()

document.addEventListener(
  'input',
  e => {
    const target = e.target as HTMLElement
    if (
      target &&
      (target.contentEditable === 'true' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('[data-testid*="textbox"]') ||
        target.closest('div[contenteditable="true"]') ||
        target.closest('div[role="textbox"]'))
    ) {
      if (!chatInput || !document.body.contains(chatInput)) {
        chatInput = target as any
      }
      handleTyping()
    }
  },
  true
)

document.addEventListener(
  'keyup',
  e => {
    const target = e.target as HTMLElement
    if (
      target &&
      (target.contentEditable === 'true' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('[data-testid*="textbox"]') ||
        target.closest('div[contenteditable="true"]') ||
        target.closest('div[role="textbox"]'))
    ) {
      if (!chatInput || !document.body.contains(chatInput)) {
        chatInput = target as any
      }
      handleTyping()
    }
  },
  true
)
