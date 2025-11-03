import { getOrCreateUserId, getAuthToken, getOrCreateAuthToken } from '@/lib/userId'

interface ContextData {
  source: string;
  url: string;
  title: string;
  content_snippet: string;
  timestamp: number;
  full_content?: string;
  meaningful_content?: string;
  content_summary?: string;
  content_type?: string;
  key_topics?: string[];
  reading_time?: number;
  page_metadata?: {
    description?: string;
    keywords?: string;
    author?: string;
    viewport?: string;
    language?: string;
    published_date?: string;
    modified_date?: string;
    canonical_url?: string;
  };
  page_structure?: {
    headings: string[];
    links: string[];
    images: string[];
    forms: string[];
    code_blocks?: string[];
    tables?: string[];
  };
  user_activity?: {
    scroll_position: number;
    window_size: { width: number; height: number };
    focused_element?: string;
    time_on_page?: number;
    interaction_count?: number;
  };
  content_quality?: {
    word_count: number;
    has_images: boolean;
    has_code: boolean;
    has_tables: boolean;
    readability_score?: number;
  };
}
let lastUrl = location.href;
let lastContent = '';
let lastTitle = '';
let lastContentHash = '';
let captureInterval: ReturnType<typeof setInterval> | null = null;
let isActive = true;
let activityLevel = 'normal';
let lastActivityTime = Date.now();
let lastCaptureTime = 0;
let hasUserActivity = false;
const MIN_CAPTURE_INTERVAL = 10000;
const ACTIVITY_TIMEOUT = 30000;
const CONTENT_CHANGE_THRESHOLD = 0.1; 
let privacyExtensionDetected = false;
let privacyExtensionType = 'unknown';
function detectPrivacyExtensions(): void {
  try {
    const privacyExtensions = [
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
    ];
    const hasAdBlockers =
      document.querySelectorAll(
        '[id*="adblock"], [class*="adblock"], [id*="ublock"], [class*="ublock"]'
      ).length > 0;
    const hasPrivacyElements =
      document.querySelectorAll(
        '[id*="privacy"], [class*="privacy"], [id*="ghostery"], [class*="ghostery"]'
      ).length > 0;
    if (hasAdBlockers || hasPrivacyElements) {
      privacyExtensionDetected = true;
      privacyExtensionType = 'adblocker';
    }
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      privacyExtensionDetected = true;
      privacyExtensionType = 'csp';
    }
    try {
      const testIframe = document.createElement('iframe');
      testIframe.style.display = 'none';
      document.body.appendChild(testIframe);
      document.body.removeChild(testIframe);
    } catch (error) {
      privacyExtensionDetected = true;
      privacyExtensionType = 'iframe_restriction';
    }
  } catch (error) {
  }
}
(window as any).pageLoadTime = Date.now();
(window as any).interactionCount = 0;
detectPrivacyExtensions();
function extractVisibleText(): string {
  try {
    if (!document.body || !document.body.textContent) {
      return document.documentElement?.textContent || document.title || '';
    }
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          try {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          } catch (error) {
            return NodeFilter.FILTER_ACCEPT;
          }
        },
      }
    );
    const textNodes: string[] = [];
    let node;
    while ((node = walker.nextNode())) {
      try {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          textNodes.push(text);
        }
      } catch (error) {
        continue;
      }
    }
    return textNodes.join(' ');
  } catch (error) {
    try {
      return (
        document.body?.textContent ||
        document.documentElement?.textContent ||
        document.title ||
        ''
      );
    } catch (fallbackError) {
      return document.title || window.location.href;
    }
  }
}
function extractMeaningfulContent(): string {
  try {
    if (!document.body || !document.body.innerHTML) {
      return extractVisibleText();
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
    ];
    const tempDiv = document.createElement('div');
    try {
      tempDiv.innerHTML = document.body.innerHTML;
    } catch (error) {
      tempDiv.textContent = document.body.textContent || '';
    }
    boilerplateSelectors.forEach(selector => {
      try {
        const elements = tempDiv.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      } catch (error) {
      }
    });
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
    ];
    let meaningfulContent = '';
    for (const selector of contentSelectors) {
      try {
        const element = tempDiv.querySelector(selector);
        if (element) {
          const text = cleanAndExtractText(element);
          if (text && text.length > 100) {
            meaningfulContent = text;
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }
    if (!meaningfulContent) {
      try {
        const meaningfulElements = tempDiv.querySelectorAll(
          'p, h1, h2, h3, h4, h5, h6, li, blockquote, div'
        );
        const paragraphs = Array.from(meaningfulElements)
          .map(el => {
            try {
              return cleanAndExtractText(el);
            } catch (error) {
              return '';
            }
          })
          .filter(text => text && text.length > 30 && !isBoilerplateText(text))
          .join(' ');
        if (paragraphs.length > 200) {
          meaningfulContent = paragraphs;
        }
      } catch (error) {
      }
    }
    if (!meaningfulContent) {
      try {
        meaningfulContent = cleanAndExtractText(tempDiv);
      } catch (error) {
        meaningfulContent = extractVisibleText();
      }
    }
    return cleanText(meaningfulContent).substring(0, 50000);
  } catch (error) {
    return extractVisibleText();
  }
}
function cleanAndExtractText(element: Element): string {
  if (!element) return '';
  try {
    const scripts = element.querySelectorAll('script, style, noscript');
    scripts.forEach(el => {
      try {
        el.remove();
      } catch (error) {
      }
    });
    const text = element.textContent || '';
    return cleanText(text);
  } catch (error) {
    try {
      return cleanText(element.textContent || '');
    } catch (fallbackError) {
      return '';
    }
  }
}
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/[^\w\s.,!?;:()\-'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  ];
  const shortText = text.toLowerCase().trim();
  if (shortText.length < 20) return true;
  return boilerplatePatterns.some(pattern => pattern.test(shortText));
}
function extractContentSummary(): string {
  const title = document.title;
  const metaDescription =
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute('content') || '';
  const ogDescription =
    document
      .querySelector('meta[property="og:description"]')
      ?.getAttribute('content') || '';
  const twitterDescription =
    document
      .querySelector('meta[name="twitter:description"]')
      ?.getAttribute('content') || '';
  const mainHeading =
    document.querySelector('h1')?.textContent?.trim() ||
    document.querySelector('h2')?.textContent?.trim() ||
    document.querySelector('h3')?.textContent?.trim() ||
    '';
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map(p => p.textContent?.trim())
    .filter(text => text && text.length > 50 && !isBoilerplateText(text));
  const firstParagraph = paragraphs[0] || '';
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => h.textContent?.trim())
    .filter(text => text && text.length > 0 && text.length < 100)
    .slice(0, 3);
  const summaryParts = [
    title,
    metaDescription || ogDescription || twitterDescription,
    mainHeading,
    firstParagraph,
    ...headings,
  ].filter(text => text && text.length > 0);
  return summaryParts.join(' | ').substring(0, 800);
}
function extractContentType(): string {
  const url = window.location.href;
  const title = document.title.toLowerCase();
  const metaKeywords =
    document
      .querySelector('meta[name="keywords"]')
      ?.getAttribute('content')
      ?.toLowerCase() || '';
  if (
    url.includes('/blog/') ||
    url.includes('/post/') ||
    title.includes('blog')
  )
    return 'blog_post';
  if (
    url.includes('/docs/') ||
    url.includes('/documentation/') ||
    title.includes('docs')
  )
    return 'documentation';
  if (
    url.includes('/tutorial/') ||
    url.includes('/guide/') ||
    title.includes('tutorial') ||
    title.includes('guide')
  )
    return 'tutorial';
  if (url.includes('/news/') || title.includes('news')) return 'news_article';
  if (url.includes('/product/') || title.includes('product'))
    return 'product_page';
  if (url.includes('/about/') || title.includes('about')) return 'about_page';
  if (url.includes('/contact/') || title.includes('contact'))
    return 'contact_page';
  if (url.includes('/search') || title.includes('search'))
    return 'search_results';
  if (url.includes('/forum/') || url.includes('/discussion/'))
    return 'forum_post';
  if (url.includes('/github.com/') || url.includes('/gitlab.com/'))
    return 'code_repository';
  if (
    url.includes('/stackoverflow.com/') ||
    url.includes('/stackexchange.com/')
  )
    return 'qa_thread';
  if (url.includes('/youtube.com/') || url.includes('/vimeo.com/'))
    return 'video_content';
  if (url.includes('/twitter.com/') || url.includes('/x.com/'))
    return 'social_media';
  if (url.includes('/reddit.com/')) return 'reddit_post';
  if (url.includes('/medium.com/') || url.includes('/substack.com/'))
    return 'article';
  return 'web_page';
}
function extractKeyTopics(): string[] {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => h.textContent?.trim())
    .filter(text => text && text.length > 0 && text.length < 100)
    .slice(0, 8);
  const metaKeywords =
    document
      .querySelector('meta[name="keywords"]')
      ?.getAttribute('content')
      ?.split(',')
      .map(k => k.trim()) || [];
  const ogTitle =
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute('content') || '';
  const ogKeywords =
    document
      .querySelector('meta[property="og:keywords"]')
      ?.getAttribute('content')
      ?.split(',')
      .map(k => k.trim()) || [];
  const twitterTitle =
    document
      .querySelector('meta[name="twitter:title"]')
      ?.getAttribute('content') || '';
  const twitterKeywords =
    document
      .querySelector('meta[name="twitter:keywords"]')
      ?.getAttribute('content')
      ?.split(',')
      .map(k => k.trim()) || [];
  const structuredData = extractStructuredDataTopics();
  const urlTopics = extractUrlTopics();
  const allTopics = [
    ...headings,
    ...metaKeywords,
    ...ogKeywords,
    ...twitterKeywords,
    ...structuredData,
    ...urlTopics,
    ogTitle,
    twitterTitle,
  ].filter(topic => topic && topic.length > 2 && topic.length < 50);
  return [...new Set(allTopics)].slice(0, 20);
}
function extractStructuredDataTopics(): string[] {
  const topics: string[] = [];
  try {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data['@type'] && data.name) {
          topics.push(data.name);
        }
        if (data.keywords) {
          if (Array.isArray(data.keywords)) {
            topics.push(...data.keywords);
          } else if (typeof data.keywords === 'string') {
            topics.push(
              ...data.keywords.split(',').map((k: string) => k.trim())
            );
          }
        }
        if (data.about) {
          if (Array.isArray(data.about)) {
            topics.push(...data.about.map((item: any) => item.name || item));
          } else if (typeof data.about === 'string') {
            topics.push(data.about);
          }
        }
      } catch (e) {}
    });
  } catch (e) {}
  return topics;
}
function extractUrlTopics(): string[] {
  const url = window.location.href;
  const pathname = window.location.pathname;
  const segments = pathname
    .split('/')
    .filter(segment => segment && segment.length > 2 && segment.length < 30)
    .filter(segment => !/^\d+$/.test(segment))
    .filter(segment => !/^(page|p|id|slug|post|article)$/i.test(segment));
  const domain = window.location.hostname;
  const domainTopics: string[] = [];
  if (domain.includes('github.com')) {
    domainTopics.push('programming', 'code', 'repository');
  } else if (
    domain.includes('stackoverflow.com') ||
    domain.includes('stackexchange.com')
  ) {
    domainTopics.push('programming', 'question', 'answer');
  } else if (domain.includes('medium.com') || domain.includes('substack.com')) {
    domainTopics.push('article', 'blog', 'writing');
  } else if (domain.includes('youtube.com')) {
    domainTopics.push('video', 'tutorial', 'education');
  } else if (domain.includes('reddit.com')) {
    domainTopics.push('discussion', 'community', 'reddit');
  } else if (domain.includes('wikipedia.org')) {
    domainTopics.push('encyclopedia', 'reference', 'information');
  }
  return [...segments, ...domainTopics];
}
function extractReadingTime(): number {
  const content = extractMeaningfulContent();
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}
function extractFullContent(): string {
  const fullText = extractVisibleText();
  return fullText.length > 5000
    ? fullText.substring(0, 5000) + '...'
    : fullText;
}
function extractPageMetadata() {
  const meta = document.querySelector(
    'meta[name="description"]'
  ) as HTMLMetaElement;
  const keywords = document.querySelector(
    'meta[name="keywords"]'
  ) as HTMLMetaElement;
  const author = document.querySelector(
    'meta[name="author"]'
  ) as HTMLMetaElement;
  const viewport = document.querySelector(
    'meta[name="viewport"]'
  ) as HTMLMetaElement;
  const published = document.querySelector(
    'meta[property="article:published_time"]'
  ) as HTMLMetaElement;
  const modified = document.querySelector(
    'meta[property="article:modified_time"]'
  ) as HTMLMetaElement;
  const canonical = document.querySelector(
    'link[rel="canonical"]'
  ) as HTMLLinkElement;
  return {
    description: meta?.content || '',
    keywords: keywords?.content || '',
    author: author?.content || '',
    viewport: viewport?.content || '',
    language: document.documentElement.lang || '',
    published_date: published?.content || '',
    modified_date: modified?.content || '',
    canonical_url: canonical?.href || '',
  };
}
function extractPageStructure() {
  const headings = Array.from(
    document.querySelectorAll('h1, h2, h3, h4, h5, h6')
  )
    .map(h => h.textContent?.trim())
    .filter(text => text && text.length > 0)
    .slice(0, 20);
  const links = Array.from(document.querySelectorAll('a[href]'))
    .map(a => {
      const href = (a as HTMLAnchorElement).href;
      const text = a.textContent?.trim();
      return text ? `${text} (${href})` : href;
    })
    .filter(link => link.length > 0)
    .slice(0, 30);
  const images = Array.from(document.querySelectorAll('img[src]'))
    .map(img => {
      const src = (img as HTMLImageElement).src;
      const alt = (img as HTMLImageElement).alt;
      return alt ? `${alt} (${src})` : src;
    })
    .filter(img => img.length > 0)
    .slice(0, 20);
  const forms = Array.from(document.querySelectorAll('form'))
    .map(form => {
      const inputs = Array.from(
        form.querySelectorAll('input, textarea, select')
      )
        .map(
          input =>
            (input as HTMLInputElement).name ||
            (input as HTMLInputElement).type ||
            'input'
        )
        .join(', ');
      return inputs ? `Form with: ${inputs}` : 'Form';
    })
    .slice(0, 10);
  const codeBlocks = Array.from(document.querySelectorAll('pre, code'))
    .map(code => code.textContent?.trim())
    .filter(code => code && code.length > 10)
    .slice(0, 10);
  const tables = Array.from(document.querySelectorAll('table'))
    .map(table => {
      const headers = Array.from(table.querySelectorAll('th'))
        .map(th => th.textContent?.trim())
        .filter(text => text && text.length > 0);
      return headers.length > 0
        ? `Table with columns: ${headers.join(', ')}`
        : 'Table';
    })
    .slice(0, 5);
  return { headings, links, images, forms, code_blocks: codeBlocks, tables };
}
function extractContentQuality() {
  const content = extractMeaningfulContent();
  const wordCount = content.split(/\s+/).length;
  const hasImages = document.querySelectorAll('img').length > 0;
  const hasCode = document.querySelectorAll('pre, code').length > 0;
  const hasTables = document.querySelectorAll('table').length > 0;
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence =
    sentences.length > 0 ? wordCount / sentences.length : 0;
  const readabilityScore = Math.max(
    0,
    Math.min(100, 100 - (avgWordsPerSentence - 10) * 2)
  );
  return {
    word_count: wordCount,
    has_images: hasImages,
    has_code: hasCode,
    has_tables: hasTables,
    readability_score: Math.round(readabilityScore),
  };
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
  };
}
function captureContext(): ContextData {
  try {
    const url = window.location.href;
    const title = document.title || '';
    const meaningfulContent = extractMeaningfulContent();
    const content_snippet = meaningfulContent.substring(0, 500);
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
    };
  } catch (error) {
    
    const basicTitle = document.title || 'Untitled Page';
    const basicUrl = window.location.href;
    const basicContent = `Page: ${basicTitle} | URL: ${basicUrl}`;
    
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
    };
  }
}
function isLocalhost(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === '0.0.0.0' ||
         hostname.startsWith('192.168.') ||
         hostname.startsWith('10.') ||
         hostname.endsWith('.local');
}

async function sendContextToBackground() {
  try {
    if (!chrome.runtime?.id) {
      return;
    }
    
    if (isLocalhost()) {
      return;
    }
    
    // Check if extension is enabled
    const enabled = await checkExtensionEnabled();
    if (!enabled) {
      console.log('RecallOS: Extension is disabled, skipping context capture');
      return;
    }
    
    const now = Date.now();
    if (now - lastCaptureTime < MIN_CAPTURE_INTERVAL) {
      return;
    }
    const contextData = captureContext();
    
    const hasValidContent = contextData.content_snippet && 
                           contextData.content_snippet.length > 50 && 
                           !contextData.content_snippet.includes('Content extraction failed');
    
    if (privacyExtensionDetected && !hasValidContent) {
      return;
    }
    
    if (!hasValidContent) {
      return;
    }
    
    (contextData as any).privacy_extension_info = {
      detected: privacyExtensionDetected,
      type: privacyExtensionType,
      compatibility_mode: privacyExtensionDetected,
    };
    chrome.runtime.sendMessage(
      { type: 'CAPTURE_CONTEXT', data: contextData },
      response => {
        if (chrome.runtime.lastError) {
          console.error(
            'RecallOS: Error sending to background:',
            chrome.runtime.lastError
          );
          return;
        }
      }
    );
    lastCaptureTime = now;
  } catch (error) {
    console.error('RecallOS: Error capturing context:', error);
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    hasUserActivity = true;
    if (!isLocalhost()) {
      sendContextToBackground();
    }
  });
} else {
  hasUserActivity = true;
  if (!isLocalhost()) {
    sendContextToBackground();
  }
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    hasUserActivity = true;
    lastActivityTime = Date.now();
  }
});
window.addEventListener('focus', () => {
  hasUserActivity = true;
  lastActivityTime = Date.now();
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!chrome.runtime?.id) {
    return false;
  }
  if (message.type === 'GET_WALLET_ADDRESS') {
    try {
      const walletAddress = localStorage.getItem('wallet_address');
      sendResponse({ walletAddress });
    } catch (error) {
      console.error(
        'RecallOS: Error getting wallet address from localStorage:',
        error
      );
      sendResponse({ walletAddress: null });
    }
    return true;
  }
  if (message.type === 'CAPTURE_CONTEXT_NOW') {
    hasUserActivity = true;
    if (!isLocalhost()) {
      sendContextToBackground();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, reason: 'localhost detected' });
    }
    return true;
  }
  if (message.type === 'START_MONITORING') {
    if (!isLocalhost()) {
      startContinuousMonitoring();
      sendResponse({ success: true, activityLevel });
    } else {
      sendResponse({ success: false, reason: 'localhost detected' });
    }
    return true;
  }
  if (message.type === 'STOP_MONITORING') {
    stopContinuousMonitoring();
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'GET_MONITORING_STATUS') {
    sendResponse({
      success: true,
      isActive,
      activityLevel,
      isMonitoring: !!captureInterval,
    });
    return true;
  }
});
window.addEventListener('message', event => {
  if (event.data.type === 'WALLET_ADDRESS' && event.data.walletAddress) {
    chrome.storage.sync.set(
      { wallet_address: event.data.walletAddress },
      () => {
      }
    );
  }
});
setInterval(() => {
  try {
    const walletAddress = localStorage.getItem('wallet_address');
    if (walletAddress) {
      chrome.storage.sync.set({ wallet_address: walletAddress }, () => {
      });
    }
  } catch (error) {}
}, 2000);
chrome.storage.sync.get(['wallet_address'], result => {
  if (result.wallet_address) {
  } else {
  }
});
function calculateContentHash(content: string): string {
  let hash = 0;
  if (content.length === 0) return hash.toString();
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; 
  }
  return hash.toString();
}

function calculateContentSimilarity(content1: string, content2: string): number {
  if (!content1 || !content2) return 0;
  
  const words1 = content1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = content2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function hasContentChanged(): boolean {
  const currentUrl = location.href;
  const currentTitle = document.title;
  const currentContent = extractVisibleText();
  const currentContentHash = calculateContentHash(currentContent);
  
  const urlChanged = currentUrl !== lastUrl;
  const titleChanged = currentTitle !== lastTitle;
  
  const contentHashChanged = currentContentHash !== lastContentHash;
  
  const contentSimilarity = calculateContentSimilarity(currentContent, lastContent);
  const contentSignificantlyChanged = contentSimilarity < (1 - CONTENT_CHANGE_THRESHOLD);
  
  const shouldCapture = urlChanged || titleChanged || contentHashChanged || contentSignificantlyChanged;
  
  if (shouldCapture) {
    lastUrl = currentUrl;
    lastTitle = currentTitle;
    lastContent = currentContent;
    lastContentHash = currentContentHash;
  }
  
  return shouldCapture;
}
function shouldCaptureBasedOnActivity(): boolean {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  const timeSinceLastCapture = now - lastCaptureTime;
  return (
    hasUserActivity &&
    timeSinceLastCapture >= MIN_CAPTURE_INTERVAL &&
    (hasContentChanged() || timeSinceLastActivity >= ACTIVITY_TIMEOUT)
  );
}
function getMonitoringInterval(): number {
  switch (activityLevel) {
    case 'high':
      return 10000;
    case 'normal':
      return 20000;
    case 'low':
      return 60000;
    default:
      return 20000;
  }
}
function updateActivityLevel() {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  if (timeSinceLastActivity < 15000) {
    activityLevel = 'high';
  } else if (timeSinceLastActivity < 120000) {
    activityLevel = 'normal';
  } else {
    activityLevel = 'low';
  }
}
function startContinuousMonitoring() {
  if (isLocalhost()) {
    return;
  }
  
  if (captureInterval) {
    clearInterval(captureInterval);
  }
  updateActivityLevel();
  const interval = getMonitoringInterval();
  captureInterval = setInterval(() => {
    if (!chrome.runtime?.id) {
      stopContinuousMonitoring();
      return;
    }
    if (isActive) {
      updateActivityLevel();
      if (shouldCaptureBasedOnActivity()) {
        sendContextToBackground();
        hasUserActivity = false;
        if (Date.now() - lastCaptureTime < 1000) {
          lastUrl = location.href;
          lastTitle = document.title;
          lastContent = extractVisibleText();
          lastContentHash = calculateContentHash(lastContent);
        }
      }
      const newInterval = getMonitoringInterval();
      if (newInterval !== interval) {
        startContinuousMonitoring();
      }
    }
  }, interval);
}
function stopContinuousMonitoring() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
}
startContinuousMonitoring();
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (!isLocalhost()) {
      setTimeout(sendContextToBackground, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true });
document.addEventListener('visibilitychange', () => {
  isActive = !document.hidden;
  if (isActive) {
    startContinuousMonitoring();
  } else {
    stopContinuousMonitoring();
  }
});
window.addEventListener('blur', () => {
  isActive = false;
  stopContinuousMonitoring();
});
window.addEventListener('focus', () => {
  isActive = true;
  startContinuousMonitoring();
});
document.addEventListener('click', () => {
  lastActivityTime = Date.now();
  hasUserActivity = true;
  activityLevel = 'high';
  (window as any).interactionCount++;
});
document.addEventListener('scroll', () => {
  lastActivityTime = Date.now();
  hasUserActivity = true;
  if (activityLevel === 'low') {
    activityLevel = 'normal';
  }
  (window as any).interactionCount++;
});
document.addEventListener('keydown', () => {
  lastActivityTime = Date.now();
  hasUserActivity = true;
  activityLevel = 'high';
  (window as any).interactionCount++;
});
let mouseMoveTimeout: ReturnType<typeof setTimeout> | null = null;
document.addEventListener('mousemove', () => {
  if (mouseMoveTimeout) return;
  mouseMoveTimeout = setTimeout(() => {
    lastActivityTime = Date.now();
    hasUserActivity = true;
    if (activityLevel === 'low') {
      activityLevel = 'normal';
    }
    mouseMoveTimeout = null;
  }, 3000);
});

// AI Chat Platform Detection
type AIChatPlatform = 'chatgpt' | 'claude' | 'none';

let currentPlatform: AIChatPlatform = 'none';
let chatInput: HTMLTextAreaElement | HTMLElement | null = null;
let chatSendButton: HTMLButtonElement | null = null;
let originalSendHandler: ((event: Event) => void) | null = null;
let isProcessingMemory = false;
let recallOSIcon: HTMLElement | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
let lastTypedText = '';
let isAutoInjecting = false;

function detectAIChatPlatform(): AIChatPlatform {
  const hostname = window.location.hostname;
  
  // ChatGPT detection
  if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
    return 'chatgpt';
  }
  
  // Claude detection
  if (hostname.includes('claude.ai') || hostname.includes('anthropic.com')) {
    return 'claude';
  }
  
  return 'none';
}

async function pollSearchJob(jobId: string): Promise<string | null> {
  try {
    // Derive API base from extension settings
    let apiBase = 'http://localhost:3000/api';
    try {
      const cfg = await chrome.storage?.sync?.get?.(['apiEndpoint']);
      const endpoint = cfg?.apiEndpoint as string | undefined;
      if (endpoint) {
        const u = new URL(endpoint);
        apiBase = `${u.protocol}//${u.host}/api`;
      }
    } catch {}
    // Get or create auth token
    const authToken = await getOrCreateAuthToken();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${apiBase}/search/job/${jobId}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.error('RecallOS: Job polling failed:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();
    
    if (result.status === 'completed' && result.answer) {
      return result.answer;
    } else if (result.status === 'failed') {
      console.error('RecallOS: Search job failed');
      return null;
    }
    
    return null; // Still pending
  } catch (error) {
    console.error('RecallOS: Error polling search job:', error);
    return null;
  }
}

async function getMemorySummary(query: string): Promise<string | null> {
  try {
    const userId = getOrCreateUserId();
    // Derive API base from extension settings
    let apiBase = 'http://localhost:3000/api';
    try {
      const cfg = await chrome.storage?.sync?.get?.(['apiEndpoint']);
      const endpoint = cfg?.apiEndpoint as string | undefined;
      if (endpoint) {
        const u = new URL(endpoint);
        apiBase = `${u.protocol}//${u.host}/api`;
      }
    } catch {}
    const searchEndpoint = `${apiBase}/search`;
    
    const requestBody = {
      userId: userId,
      query: query,
      limit: 5,
      contextOnly: false
    };
        
    // Get or create auth token
    const authToken = await getOrCreateAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(searchEndpoint, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      console.error('RecallOS: Search request failed:', response.status, response.statusText);
      return null;
    }

    const responseText = await response.text();
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('RecallOS: Failed to parse search response:', parseError);
      return null;
    }
    
    // Handle response structure exactly like client-side
    let summaryParts: string[] = [];
    
    console.log('RecallOS: Search response received:', {
      hasAnswer: !!result.answer,
      hasMetaSummary: !!result.meta_summary,
      resultsCount: result.results?.length || 0,
      hasCitations: !!result.citations,
      citationsCount: result.citations?.length || 0,
      hasJobId: !!result.job_id
    });
    
    if (result.answer) {
      console.log('RecallOS: Using answer from response');
      summaryParts.push(result.answer);
    } else if (result.meta_summary) {
      console.log('RecallOS: Using meta_summary from response');
      summaryParts.push(result.meta_summary);
    } else if (result.results && result.results.length > 0) {
      console.log('RecallOS: Using results count from response');
      summaryParts.push(`Found ${result.results.length} relevant memories about "${query}".`);
    }
    
    if (result.citations && result.citations.length > 0) {
      const citationTexts = result.citations
        .slice(0, 6)
        .map((c: any) => `[${c.label}] ${c.title || 'Open memory'}`);
      summaryParts.push(citationTexts.join('\n'));
    }
    
    // If we have a job_id but no immediate answer, poll for the result
    if (result.job_id && !result.answer) {
      
      // Poll for up to 10 seconds (6 attempts with 1.5s intervals)
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const jobResult = await pollSearchJob(result.job_id);
        
        if (jobResult) {
          summaryParts = [jobResult];
          if (result.citations && result.citations.length > 0) {
            const citationTexts = result.citations
              .slice(0, 6)
              .map((c: any) => `[${c.label}] ${c.title || 'Open memory'}`);
            summaryParts.push(citationTexts.join('\n'));
          }
          break;
        }
      }
    }
    
    if (summaryParts.length === 0) {
      console.log('RecallOS: No summary parts found, returning null');
      return null;
    }
    
    const finalSummary = summaryParts.join('\n\n');
    console.log('RecallOS: Final memory summary:', finalSummary.substring(0, 200) + '...');
    return finalSummary;
  } catch (error) {
    console.error('RecallOS: Error in getMemorySummary:', error);
    return null;
  }
}

async function getWalletAddressForMemory(): Promise<string | null> {
  try {
    const result = await chrome.storage.sync.get(['wallet_address']);
    return result.wallet_address || null;
  } catch (error) {
    console.error('RecallOS: Error getting wallet address:', error);
    return null;
  }
}

async function getApiEndpointForMemory(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['apiEndpoint']);
    return result.apiEndpoint || 'http://localhost:3000/api/memory/process';
  } catch (error) {
    console.error('RecallOS: Error getting API endpoint:', error);
    return 'http://localhost:3000/api/memory/process';
  }
}

function injectMemorySummary(summary: string, originalMessage: string): void {
  if (!chatInput) {
    console.log('RecallOS: No chat input found for injection');
    return;
  }
  
  const combinedMessage = `[RecallOS Memory Context]\n${summary}\n\n[Your Question]\n${originalMessage}`;
  console.log('RecallOS: Injecting combined message:', combinedMessage.substring(0, 200) + '...');
  
  if (chatInput.tagName === 'TEXTAREA') {
    console.log('RecallOS: Injecting into textarea');
    (chatInput as HTMLTextAreaElement).value = combinedMessage;
    const inputEvent = new Event('input', { bubbles: true });
    chatInput.dispatchEvent(inputEvent);
  } else if ((chatInput as HTMLElement).contentEditable === 'true') {
    console.log('RecallOS: Injecting into contentEditable div');
    chatInput.textContent = combinedMessage;
    const inputEvent = new Event('input', { bubbles: true });
    chatInput.dispatchEvent(inputEvent);
  } else {
    console.log('RecallOS: Unknown input type:', chatInput.tagName, chatInput);
  }
}

async function autoInjectMemories(userText: string): Promise<void> {
  if (isAutoInjecting || !userText || userText.length < 3) return;
  
  if (userText.includes('[RecallOS Memory Context]')) return;
  
  // Check if extension is enabled
  const enabled = await checkExtensionEnabled();
  if (!enabled) {
    console.log('RecallOS: Extension is disabled, skipping memory injection');
    return;
  }
  
  isAutoInjecting = true;
  
  try {
    if (recallOSIcon) {
      recallOSIcon.style.color = '#f59e0b';
      recallOSIcon.style.animation = 'pulse 1s infinite';
    }
    
    const memorySummary = await getMemorySummary(userText);
    
    if (memorySummary) {
      const currentText = getCurrentInputText();
      console.log('RecallOS: Memory found, checking text match:', {
        originalText: userText,
        currentText: currentText,
        textsMatch: currentText === userText,
        currentTextLength: currentText.length,
        originalTextLength: userText.length
      });
      
      // More lenient text matching - check if current text contains the original text
      const textMatches = currentText === userText || 
                         currentText.includes(userText) || 
                         userText.includes(currentText) ||
                         currentText.trim() === userText.trim();
      
      if (textMatches) {
        console.log('RecallOS: Injecting memory summary');
        injectMemorySummary(memorySummary, userText);
        
        if (recallOSIcon) {
          recallOSIcon.style.color = '#10a37f';
          recallOSIcon.style.animation = 'none';
        }
      } else {
        console.log('RecallOS: Text changed during search, not injecting');
        if (recallOSIcon) {
          recallOSIcon.style.color = '#8e8ea0';
          recallOSIcon.style.animation = 'none';
        }
      }
    } else {
      if (recallOSIcon) {
        recallOSIcon.style.color = '#8e8ea0';
        recallOSIcon.style.animation = 'none';
      }
    }
  } catch (error) {
    console.error('RecallOS: Error auto-injecting memories:', error);
    if (recallOSIcon) {
      recallOSIcon.style.color = '#ef4444';
      recallOSIcon.style.animation = 'none';
    }
  } finally {
    isAutoInjecting = false;
    setTimeout(() => {
      if (recallOSIcon) {
        recallOSIcon.style.color = '#8e8ea0';
      }
    }, 2000);
  }
}

function getCurrentInputText(): string {
  if (!chatInput) return '';
  
  if (chatInput.tagName === 'TEXTAREA') {
    return (chatInput as HTMLTextAreaElement).value?.trim() || '';
  } else if ((chatInput as HTMLElement).contentEditable === 'true') {
    return chatInput.textContent?.trim() || '';
  }
  
  return '';
}

function handleTyping(): void {
  if (!chatInput) return;
  
  const currentText = getCurrentInputText();
  
  if (currentText.includes('[RecallOS Memory Context]')) return;
  
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  typingTimeout = setTimeout(async () => {
    if (currentText && currentText.length >= 3 && currentText !== lastTypedText) {
      lastTypedText = currentText;
      await autoInjectMemories(currentText);
    }
  }, 1500); 
}

async function createRecallOSIcon(): Promise<HTMLElement> {
  const icon = document.createElement('div');
  icon.id = 'recallos-extension-icon';
  icon.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
      <path d="M19 15L19.5 17.5L22 18L19.5 18.5L19 21L18.5 18.5L16 18L18.5 17.5L19 15Z" fill="currentColor"/>
      <path d="M5 15L5.5 17.5L8 18L5.5 18.5L5 21L4.5 18.5L2 18L4.5 17.5L5 15Z" fill="currentColor"/>
    </svg>
  `;
  
  // Check if extension is enabled to set initial state
  const enabled = await checkExtensionEnabled();
  const baseColor = enabled ? '#10a37f' : '#8e8ea0';
  const bgColor = enabled ? 'rgba(16, 163, 127, 0.1)' : 'rgba(142, 142, 160, 0.1)';
  const borderColor = enabled ? 'rgba(16, 163, 127, 0.2)' : 'rgba(142, 142, 160, 0.2)';
  
  icon.style.cssText = `
    position: absolute !important;
    right: 12px !important;
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
    z-index: 99999 !important;
    background: ${bgColor} !important;
    border: 1px solid ${borderColor} !important;
    padding: 0 !important;
    box-shadow: 0 2px 12px ${enabled ? 'rgba(16, 163, 127, 0.15)' : 'rgba(142, 142, 160, 0.15)'} !important;
    visibility: visible !important;
    opacity: ${enabled ? '1' : '0.6'} !important;
    pointer-events: auto !important;
    backdrop-filter: blur(8px) !important;
  `;
  
  icon.addEventListener('mouseenter', () => {
    icon.style.color = '#ffffff';
    icon.style.backgroundColor = '#10a37f';
    icon.style.borderColor = '#10a37f';
    icon.style.transform = 'translateY(-50%) scale(1.05)';
    icon.style.boxShadow = '0 4px 16px rgba(16, 163, 127, 0.3)';
  });
  
  icon.addEventListener('mouseleave', () => {
    icon.style.color = '#10a37f';
    icon.style.backgroundColor = 'rgba(16, 163, 127, 0.1)';
    icon.style.borderColor = 'rgba(16, 163, 127, 0.2)';
    icon.style.transform = 'translateY(-50%) scale(1)';
    icon.style.boxShadow = '0 2px 12px rgba(16, 163, 127, 0.15)';
  });
  
  icon.addEventListener('click', async () => {
    await showRecallOSStatus();
  });
  
  return icon;
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
//   } catch (error) {
//     console.error('RecallOS: Health check failed:', error);
//     return false;
//   }
// }

async function getWalletAddressFromStorage(): Promise<string | null> { return null; }

async function checkExtensionEnabled(): Promise<boolean> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_EXTENSION_ENABLED',
    });
    return response.success ? response.enabled : true; // Default to enabled on error
  } catch (error) {
    console.error('RecallOS: Error checking extension enabled state:', error);
    return true; // Default to enabled on error
  }
}


async function showRecallOSStatus(): Promise<void> {
  const tooltip = document.createElement('div');
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
  `;
  
    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff; animation: pulse 1s infinite;"></div>
        <strong>RecallOS Extension</strong>
      </div>
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.8);">
        Checking status...
      </div>
    `;
  
  document.body.appendChild(tooltip);
  
  try {
    const [walletAddress, apiHealthy, extensionEnabled] = await Promise.all([
      getWalletAddressFromStorage(),
      // checkApiHealth()
      true,
      checkExtensionEnabled()
    ]);
    
    const walletStatus = walletAddress ? 'Connected' : 'Not Connected';
    const apiStatus = apiHealthy ? 'Connected' : 'Not Connected';
    const extensionStatus = extensionEnabled ? 'Enabled' : 'Disabled';
    const overallStatus = walletAddress && apiHealthy && extensionEnabled ? 'Active' : 'Inactive';
    const statusColor = overallStatus === 'Active' ? '#10a37f' : '#ef4444';
    
    const platformName = currentPlatform === 'chatgpt' ? 'ChatGPT' : currentPlatform === 'claude' ? 'Claude' : 'Unknown';
    
    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></div>
        <strong>RecallOS on ${platformName}</strong>
      </div>
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9);">
        <div>Extension: ${extensionStatus}</div>
        <div>Wallet: ${walletStatus}</div>
        <div>API: ${apiStatus}</div>
        ${walletAddress ? `<div>Address: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}</div>` : ''}
      </div>
      <div style="font-size: 11px; color: rgba(255, 255, 255, 0.7); margin-top: 8px;">
        ${extensionEnabled ? 'Memories are automatically injected as you type (1.5s delay).' : 'Extension is disabled. Click the popup to enable.'}
      </div>
    `;
  } catch (error) {
    console.error('RecallOS: Error checking status:', error);
    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div>
        <strong>RecallOS Extension</strong>
      </div>
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9);">
        Error checking status
      </div>
    `;
  }
  
  setTimeout(() => {
    if (tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
    }
  }, 6000);
}

function findChatInputElements(): void {
  let inputSelectors: string[] = [];
  let buttonSelectors: string[] = [];
  
  if (currentPlatform === 'chatgpt') {
    inputSelectors = [
      'div[contenteditable="true"]',
      'textarea[placeholder*="Ask anything"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Send a message"]',
      'textarea[placeholder*="Type a message"]',
      'textarea[role="textbox"]',
      'textarea',
      'input[type="text"]'
    ];
    
    buttonSelectors = [
      'button[data-testid*="send"]',
      'button[aria-label*="Send"]',
      'button[title*="Send"]',
      'button[aria-label*="Submit"]',
      'button[type="submit"]',
      'button:has(svg)',
      'button[class*="send"]',
      'button[class*="submit"]',
      'button'
    ];
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
      'input[type="text"]'
    ];
    
    buttonSelectors = [
      'button[aria-label*="Send"]',
      'button[title*="Send"]',
      'button[aria-label*="Submit"]',
      'button[type="submit"]',
      'button:has(svg)',
      'button[class*="send"]',
      'button[class*="submit"]',
      'button'
    ];
  }
  
  // Find input element
  for (const selector of inputSelectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.offsetParent !== null) {
      chatInput = element as any;
      break;
    }
  }

  // Find send button
  for (const selector of buttonSelectors) {
    const element = document.querySelector(selector) as HTMLButtonElement;
    if (element && element.offsetParent !== null) {
      chatSendButton = element;
      break;
    }
  }
}

function setupAIChatIntegration(): void {
  if (currentPlatform === 'none') return;
  
  if (originalSendHandler) {
    return;
  }
  
  findChatInputElements();
  
  if (chatInput && !recallOSIcon) {
    
    const containerSelectors = [
      'div[class*="input"]',
      'div[class*="chat"]',
      'div[class*="message"]',
      'div[class*="form"]',
      'div[class*="composer"]',
      'div[class*="prompt"]',
      'div[class*="textbox"]',
      'div'
    ];
    
    let inputContainer: Element | null = null;
    for (const selector of containerSelectors) {
      const container = (chatInput as HTMLElement).closest(selector);
      if (container) {
        inputContainer = container;
        break;
      }
    }
    
    if (!inputContainer) {
      inputContainer = (chatInput as HTMLElement).parentElement;
    }
    
    if (inputContainer) {
      const containerStyle = window.getComputedStyle(inputContainer);
      if (containerStyle.position === 'static') {
        (inputContainer as HTMLElement).style.position = 'relative';
      }
      
      const existingIcon = document.getElementById('recallos-extension-icon');
      if (existingIcon) {
        existingIcon.remove();
      }
      
      createRecallOSIcon().then(icon => {
        recallOSIcon = icon;
        inputContainer.appendChild(recallOSIcon);
      });
      
      const ensureIconVisible = () => {
        if (!recallOSIcon || !document.body.contains(recallOSIcon)) {
          
          findChatInputElements();
          
          if (chatInput) {
            let newContainer: Element | null = null;
            const containerSelectors = [
              'div[class*="input"]',
              'div[class*="chat"]',
              'div[class*="message"]',
              'div[class*="form"]',
              'div[class*="composer"]',
              'div[class*="prompt"]',
              'div[class*="textbox"]',
              'div'
            ];
            
            for (const selector of containerSelectors) {
              const container = (chatInput as HTMLElement).closest(selector);
              if (container) {
                newContainer = container;
                break;
              }
            }
            
            if (!newContainer) {
              newContainer = (chatInput as HTMLElement).parentElement;
            }
            
            if (newContainer && document.body.contains(newContainer)) {
              const existingIcon = document.getElementById('recallos-extension-icon');
              if (existingIcon) {
                existingIcon.remove();
              }
              
              createRecallOSIcon().then(icon => {
                recallOSIcon = icon;
                newContainer.appendChild(recallOSIcon);
              });
            }
          }
        }
      };
      
      setInterval(ensureIconVisible, 1000);
      
      const iconObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            const removedNodes = Array.from(mutation.removedNodes);
            const iconRemoved = removedNodes.some(node => 
              node.nodeType === Node.ELEMENT_NODE && 
              (node as Element).id === 'recallos-extension-icon'
            );
            
            if (iconRemoved) {
              setTimeout(() => {
                if (!recallOSIcon || !document.body.contains(recallOSIcon)) {
                  ensureIconVisible();
                }
              }, 500);
            }
          }
        });
      });
      
      if (inputContainer) {
        iconObserver.observe(inputContainer, {
          childList: true,
          subtree: true
        });
      }
    } 
  }
  
  if (chatInput && !originalSendHandler) {
    
    const inputHandler = (e: Event) => {
      handleTyping();
    };
    
    const keyupHandler = (e: Event) => {
      handleTyping();
    };
    
    const pasteHandler = (e: Event) => {
      setTimeout(handleTyping, 100);
    };
    
    chatInput.addEventListener('input', inputHandler, true);
    chatInput.addEventListener('keyup', keyupHandler, true);
    chatInput.addEventListener('paste', pasteHandler, true);
    
    if ((chatInput as HTMLElement).contentEditable === 'true') {
      document.addEventListener('input', (e) => {
        if (e.target === chatInput) {
          handleTyping();
        }
      }, true);
      
      const contentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            handleTyping();
          }
        });
      });
      
      contentObserver.observe(chatInput as Node, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
    }
    
    
    originalSendHandler = () => {}; 
  } else if (!chatInput) {
    console.log('RecallOS: No chat input found for event listeners');
  } else if (originalSendHandler) {
    console.log('RecallOS: Event listeners already attached');
  }
}

function addRecallOSStyles(): void {
  if (document.getElementById('recallos-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'recallos-styles';
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    #recallos-extension-icon {
      transition: all 0.2s ease;
    }
    
    #recallos-extension-icon:hover {
      transform: translateY(-50%) scale(1.1) !important;
    }
  `;
  document.head.appendChild(style);
}

function waitForAIChatReady(): Promise<void> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 5;
    
    const checkReady = () => {
      attempts++;
      
      const hasInput = document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
      const hasSendButton = document.querySelector('button[data-testid*="send"], button[aria-label*="Send"], button[title*="Send"]');
      
      if (hasInput && hasSendButton) {
        resolve();
      } else if (attempts >= maxAttempts) {
        resolve();
      } else {
        setTimeout(checkReady, 1000);
      }
    };
    
    setTimeout(checkReady, 1000);
  });
}

function trySetupImmediately(): void {
  setupAIChatIntegration();
  
  if (!recallOSIcon) {
    setTimeout(() => {
      setupAIChatIntegration();
    }, 3000);
    
    setTimeout(() => {
      setupAIChatIntegration();
    }, 6000);
  }
}

function initAIChatIntegration(): void {
  currentPlatform = detectAIChatPlatform();
  
  if (currentPlatform !== 'none') {
    addRecallOSStyles();
    
    trySetupImmediately();
    
    waitForAIChatReady().then(() => {
      setupAIChatIntegration();
    });
    
    let setupTimeout: ReturnType<typeof setTimeout> | null = null;
    let isWaitingForReady = true;
    
    const observer = new MutationObserver((mutations) => {
      if (originalSendHandler || isWaitingForReady) return;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const hasNewChatElements = Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              return element.querySelector && (
                element.querySelector('div[contenteditable="true"]') ||
                element.querySelector('textarea') ||
                element.querySelector('button[data-testid*="send"]') ||
                element.tagName === 'TEXTAREA' ||
                element.tagName === 'BUTTON'
              );
            }
            return false;
          });
          
          if (hasNewChatElements && !setupTimeout) {
            setupTimeout = setTimeout(() => {
              setupAIChatIntegration();
              setupTimeout = null;
            }, 1000);
          }
        }
      });
    });
    
    waitForAIChatReady().then(() => {
      isWaitingForReady = false;
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
    
    let retryCount = 0;
    const maxRetries = 3;
    const retrySetup = () => {
      if (!recallOSIcon && !originalSendHandler && retryCount < maxRetries) {
        retryCount++;
        setupAIChatIntegration();
        setTimeout(retrySetup, 3000);
      } else if (retryCount >= maxRetries) {
      }
    };
    
    waitForAIChatReady().then(() => {
      setTimeout(retrySetup, 2000);
    });
    
    const continuousIconMonitor = () => {
      if (!recallOSIcon && currentPlatform !== 'none') {
        setupAIChatIntegration();
      }
    };
    
    setInterval(continuousIconMonitor, 5000);
  }
}

function debugAIChatElements(): void {
  console.log('RecallOS Debug Info:');
  console.log('Platform:', currentPlatform);
  console.log('Chat Input:', chatInput);
  console.log('RecallOS Icon:', recallOSIcon);
}

(window as any).debugRecallOS = debugAIChatElements;

(window as any).triggerRecallOS = async () => {
  const currentText = getCurrentInputText();
  if (currentText && currentText.length >= 3) {
    await autoInjectMemories(currentText);
  } else {
  }
};

(window as any).setupRecallOSListeners = () => {
  findChatInputElements();
  if (chatInput) {
    console.log('RecallOS: Setting up listeners');
    const inputHandler = (e: Event) => {
      handleTyping();
    };
    
    chatInput.addEventListener('input', inputHandler, true);
    chatInput.addEventListener('keyup', inputHandler, true);
    chatInput.addEventListener('paste', inputHandler, true);
    
  } else {
    console.log('RecallOS: No chat input found');
  }
};

(window as any).testMemoryInjection = async () => {
  const currentText = getCurrentInputText();
  if (currentText && currentText.length >= 3) {
    await autoInjectMemories(currentText);
  } else {
  }
};
(window as any).testRecallOSSearch = async (query = 'server boilerplates') => {
  try {
    const result = await getMemorySummary(query);
    return result;
  } catch (error) {
    return null;
  }
};

(window as any).checkRecallOSStatus = async () => {
  const walletAddress = await getWalletAddressFromStorage();
  // const apiHealthy = await checkApiHealth();
  const apiEndpoint = await getApiEndpointForMemory();
  
  return {
    walletAddress,
    apiEndpoint,
    // apiHealthy,
    apiHealthy: true,
    platform: currentPlatform,
    chatInput: !!chatInput,
    recallOSIcon: !!recallOSIcon
  };
};

initAIChatIntegration();

document.addEventListener('input', (e) => {
  const target = e.target as HTMLElement;
  if (target && (
    target.contentEditable === 'true' || 
    target.tagName === 'TEXTAREA' ||
    target.closest('[data-testid*="textbox"]') ||
    target.closest('div[contenteditable="true"]') ||
    target.closest('div[role="textbox"]')
  )) {
    if (!chatInput || !document.body.contains(chatInput)) {
      chatInput = target as any;
    }
    handleTyping();
  }
}, true);

document.addEventListener('keyup', (e) => {
  const target = e.target as HTMLElement;
  if (target && (
    target.contentEditable === 'true' || 
    target.tagName === 'TEXTAREA' ||
    target.closest('[data-testid*="textbox"]') ||
    target.closest('div[contenteditable="true"]') ||
    target.closest('div[role="textbox"]')
  )) {
    if (!chatInput || !document.body.contains(chatInput)) {
      chatInput = target as any;
    }
    handleTyping();
  }
}, true);
