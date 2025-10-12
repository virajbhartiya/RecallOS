/// <reference types="chrome" />

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
let captureInterval: ReturnType<typeof setInterval> | null = null;
let isActive = true;
let activityLevel = 'normal';
let lastActivityTime = Date.now();
let lastCaptureTime = 0;
let hasUserActivity = false;
const MIN_CAPTURE_INTERVAL = 10000; 
const ACTIVITY_TIMEOUT = 30000; 
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
      'uMatrix'
    ];
    const hasAdBlockers = document.querySelectorAll('[id*="adblock"], [class*="adblock"], [id*="ublock"], [class*="ublock"]').length > 0;
    const hasPrivacyElements = document.querySelectorAll('[id*="privacy"], [class*="privacy"], [id*="ghostery"], [class*="ghostery"]').length > 0;
    if (hasAdBlockers || hasPrivacyElements) {
      privacyExtensionDetected = true;
      privacyExtensionType = 'adblocker';
      console.log('RecallOS: Privacy extension detected, enabling compatibility mode');
    }
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      privacyExtensionDetected = true;
      privacyExtensionType = 'csp';
      console.log('RecallOS: CSP detected, enabling compatibility mode');
    }
    try {
      const testIframe = document.createElement('iframe');
      testIframe.style.display = 'none';
      document.body.appendChild(testIframe);
      document.body.removeChild(testIframe);
    } catch (error) {
      privacyExtensionDetected = true;
      privacyExtensionType = 'iframe_restriction';
      console.log('RecallOS: Iframe restrictions detected, enabling compatibility mode');
    }
  } catch (error) {
    console.log('RecallOS: Error detecting privacy extensions:', error);
  }
}
(window as any).pageLoadTime = Date.now();
(window as any).interactionCount = 0;
detectPrivacyExtensions();
function extractVisibleText(): string {
  try {
    if (!document.body || !document.body.textContent) {
      console.log('RecallOS: Document body not accessible, using fallback');
      return document.documentElement?.textContent || document.title || '';
    }
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          try {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          } catch (error) {
            console.log('RecallOS: Privacy extension blocking style access, accepting node');
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      }
    );
    const textNodes: string[] = [];
    let node;
    while (node = walker.nextNode()) {
      try {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          textNodes.push(text);
        }
      } catch (error) {
        console.log('RecallOS: Error accessing text content:', error);
        continue;
      }
    }
    return textNodes.join(' ');
  } catch (error) {
    console.log('RecallOS: Error in extractVisibleText, using fallback:', error);
    try {
      return document.body?.textContent || document.documentElement?.textContent || document.title || '';
    } catch (fallbackError) {
      console.log('RecallOS: Fallback also failed:', fallbackError);
      return document.title || window.location.href;
    }
  }
}
function extractMeaningfulContent(): string {
  try {
    if (!document.body || !document.body.innerHTML) {
      console.log('RecallOS: Document body not accessible for meaningful content extraction');
      return extractVisibleText();
    }
    const boilerplateSelectors = [
      'nav', 'header', 'footer', '.nav', '.navigation', '.menu', '.sidebar',
      '.advertisement', '.ads', '.ad', '.promo', '.banner', '.cookie-notice',
      '.newsletter', '.subscribe', '.social-share', '.share-buttons',
      '.comments', '.comment', '.related', '.recommended', '.trending',
      '.breadcrumb', '.breadcrumbs', '.pagination', '.pager',
      '.search', '.search-box', '.search-form', '.filter', '.sort',
      '.modal', '.popup', '.overlay', '.tooltip', '.dropdown',
      '.cookie-banner', '.gdpr', '.privacy-notice', '.terms',
      '.author-bio', '.author-info', '.author-box', '.byline',
      '.tags', '.categories', '.meta', '.metadata', '.date',
      '.social-media', '.social-links', '.follow-us', '.connect',
      '.newsletter-signup', '.email-signup', '.subscription',
      '.sponsor', '.sponsored', '.affiliate', '.partner',
      '.disclaimer', '.legal', '.terms-of-service', '.privacy-policy'
    ];
    const tempDiv = document.createElement('div');
    try {
      tempDiv.innerHTML = document.body.innerHTML;
    } catch (error) {
      console.log('RecallOS: Error accessing innerHTML, using textContent fallback');
      tempDiv.textContent = document.body.textContent || '';
    }
    boilerplateSelectors.forEach(selector => {
      try {
        const elements = tempDiv.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      } catch (error) {
        console.log('RecallOS: Error removing boilerplate elements:', error);
      }
    });
    const contentSelectors = [
      'article', 'main', '[role="main"]', '.content', '.post', '.article',
      '.entry', '.story', '.blog-post', '.news-article', '.tutorial',
      '.documentation', '.guide', '.how-to', '.explanation', '.text',
      '.body', '.main-content', '.article-content', '.post-content',
      '.entry-content', '.page-content', '.content-body'
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
        console.log('RecallOS: Error querying content selector:', selector, error);
        continue;
      }
    }
    if (!meaningfulContent) {
      try {
        const meaningfulElements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, div');
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
        console.log('RecallOS: Error extracting meaningful elements:', error);
      }
    }
    if (!meaningfulContent) {
      try {
        meaningfulContent = cleanAndExtractText(tempDiv);
      } catch (error) {
        console.log('RecallOS: Error in fallback extraction:', error);
        meaningfulContent = extractVisibleText();
      }
    }
    return cleanText(meaningfulContent).substring(0, 10000);
  } catch (error) {
    console.log('RecallOS: Error in extractMeaningfulContent, using fallback:', error);
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
        console.log('RecallOS: Error removing script/style element:', error);
      }
    });
    const text = element.textContent || '';
    return cleanText(text);
  } catch (error) {
    console.log('RecallOS: Error in cleanAndExtractText:', error);
    try {
      return cleanText(element.textContent || '');
    } catch (fallbackError) {
      console.log('RecallOS: Fallback also failed in cleanAndExtractText:', fallbackError);
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
    /^(mobile|desktop|tablet)/i
  ];
  const shortText = text.toLowerCase().trim();
  if (shortText.length < 20) return true;
  return boilerplatePatterns.some(pattern => pattern.test(shortText));
}
function extractContentSummary(): string {
  const title = document.title;
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
  const twitterDescription = document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '';
  const mainHeading = document.querySelector('h1')?.textContent?.trim() || 
                     document.querySelector('h2')?.textContent?.trim() || 
                     document.querySelector('h3')?.textContent?.trim() || '';
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
    ...headings
  ].filter(text => text && text.length > 0);
  return summaryParts.join(' | ').substring(0, 800);
}
function extractContentType(): string {
  const url = window.location.href;
  const title = document.title.toLowerCase();
  const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.toLowerCase() || '';
  if (url.includes('/blog/') || url.includes('/post/') || title.includes('blog')) return 'blog_post';
  if (url.includes('/docs/') || url.includes('/documentation/') || title.includes('docs')) return 'documentation';
  if (url.includes('/tutorial/') || url.includes('/guide/') || title.includes('tutorial') || title.includes('guide')) return 'tutorial';
  if (url.includes('/news/') || title.includes('news')) return 'news_article';
  if (url.includes('/product/') || title.includes('product')) return 'product_page';
  if (url.includes('/about/') || title.includes('about')) return 'about_page';
  if (url.includes('/contact/') || title.includes('contact')) return 'contact_page';
  if (url.includes('/search') || title.includes('search')) return 'search_results';
  if (url.includes('/forum/') || url.includes('/discussion/')) return 'forum_post';
  if (url.includes('/github.com/') || url.includes('/gitlab.com/')) return 'code_repository';
  if (url.includes('/stackoverflow.com/') || url.includes('/stackexchange.com/')) return 'qa_thread';
  if (url.includes('/youtube.com/') || url.includes('/vimeo.com/')) return 'video_content';
  if (url.includes('/twitter.com/') || url.includes('/x.com/')) return 'social_media';
  if (url.includes('/reddit.com/')) return 'reddit_post';
  if (url.includes('/medium.com/') || url.includes('/substack.com/')) return 'article';
  return 'web_page';
}
function extractKeyTopics(): string[] {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map(h => h.textContent?.trim())
    .filter(text => text && text.length > 0 && text.length < 100)
    .slice(0, 8);
  const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || [];
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
  const ogKeywords = document.querySelector('meta[property="og:keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || [];
  const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '';
  const twitterKeywords = document.querySelector('meta[name="twitter:keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || [];
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
    twitterTitle
  ].filter(topic => topic && topic.length > 2 && topic.length < 50);
  return [...new Set(allTopics)].slice(0, 20);
}
function extractStructuredDataTopics(): string[] {
  const topics: string[] = [];
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
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
            topics.push(...data.keywords.split(',').map((k: string) => k.trim()));
          }
        }
        if (data.about) {
          if (Array.isArray(data.about)) {
            topics.push(...data.about.map((item: any) => item.name || item));
          } else if (typeof data.about === 'string') {
            topics.push(data.about);
          }
        }
      } catch (e) {
      }
    });
  } catch (e) {
  }
  return topics;
}
function extractUrlTopics(): string[] {
  const url = window.location.href;
  const pathname = window.location.pathname;
  const segments = pathname.split('/')
    .filter(segment => segment && segment.length > 2 && segment.length < 30)
    .filter(segment => !/^\d+$/.test(segment)) 
    .filter(segment => !/^(page|p|id|slug|post|article)$/i.test(segment)); 
  const domain = window.location.hostname;
  const domainTopics: string[] = [];
  if (domain.includes('github.com')) {
    domainTopics.push('programming', 'code', 'repository');
  } else if (domain.includes('stackoverflow.com') || domain.includes('stackexchange.com')) {
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
  return fullText.length > 5000 ? fullText.substring(0, 5000) + '...' : fullText;
}
function extractPageMetadata() {
  const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
  const keywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
  const author = document.querySelector('meta[name="author"]') as HTMLMetaElement;
  const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
  const published = document.querySelector('meta[property="article:published_time"]') as HTMLMetaElement;
  const modified = document.querySelector('meta[property="article:modified_time"]') as HTMLMetaElement;
  const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  return {
    description: meta?.content || '',
    keywords: keywords?.content || '',
    author: author?.content || '',
    viewport: viewport?.content || '',
    language: document.documentElement.lang || '',
    published_date: published?.content || '',
    modified_date: modified?.content || '',
    canonical_url: canonical?.href || ''
  };
}
function extractPageStructure() {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
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
      const inputs = Array.from(form.querySelectorAll('input, textarea, select'))
        .map(input => (input as HTMLInputElement).name || (input as HTMLInputElement).type || 'input')
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
      return headers.length > 0 ? `Table with columns: ${headers.join(', ')}` : 'Table';
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
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
  const readabilityScore = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 10) * 2));
  return {
    word_count: wordCount,
    has_images: hasImages,
    has_code: hasCode,
    has_tables: hasTables,
    readability_score: Math.round(readabilityScore)
  };
}
function extractUserActivity() {
  return {
    scroll_position: window.pageYOffset || document.documentElement.scrollTop,
    window_size: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    focused_element: document.activeElement?.tagName || '',
    time_on_page: Date.now() - (window as any).pageLoadTime || 0,
    interaction_count: (window as any).interactionCount || 0
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
      content_quality: extractContentQuality()
    };
  } catch (error) {
    console.log('RecallOS: Error in captureContext, using minimal fallback:', error);
    return {
      source: 'extension',
      url: window.location.href,
      title: document.title || '',
      content_snippet: 'Content extraction failed due to privacy extension conflicts',
      timestamp: Date.now(),
      full_content: 'Content extraction failed due to privacy extension conflicts',
      meaningful_content: 'Content extraction failed due to privacy extension conflicts',
      content_summary: 'Content extraction failed due to privacy extension conflicts',
      content_type: 'web_page',
      key_topics: [],
      reading_time: 0,
      page_metadata: {
        description: '',
        keywords: '',
        author: '',
        viewport: '',
        language: '',
        published_date: '',
        modified_date: '',
        canonical_url: ''
      },
      page_structure: {
        headings: [],
        links: [],
        images: [],
        forms: []
      },
      user_activity: {
        scroll_position: 0,
        window_size: { width: 0, height: 0 },
        focused_element: '',
        time_on_page: 0,
        interaction_count: 0
      },
      content_quality: {
        word_count: 0,
        has_images: false,
        has_code: false,
        has_tables: false,
        readability_score: 0
      }
    };
  }
}
function sendContextToBackground() {
  try {
    if (!chrome.runtime?.id) {
      console.log('RecallOS: Extension context invalidated, skipping capture');
      return;
    }
    const now = Date.now();
    if ((now - lastCaptureTime) < MIN_CAPTURE_INTERVAL) {
      console.log('RecallOS: Skipping capture - too soon since last capture');
      return;
    }
    const contextData = captureContext();
    (contextData as any).privacy_extension_info = {
      detected: privacyExtensionDetected,
      type: privacyExtensionType,
      compatibility_mode: privacyExtensionDetected
    };
    console.log('RecallOS: Captured context:', contextData);
    console.log('RecallOS: Privacy extension detected:', privacyExtensionDetected, 'Type:', privacyExtensionType);
    chrome.runtime.sendMessage(
      { type: 'CAPTURE_CONTEXT', data: contextData },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('RecallOS: Error sending to background:', chrome.runtime.lastError);
          return;
        }
        console.log('RecallOS: Background response:', response);
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
    sendContextToBackground();
  });
} else {
  hasUserActivity = true;
  sendContextToBackground();
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
      console.error('RecallOS: Error getting wallet address from localStorage:', error);
      sendResponse({ walletAddress: null });
    }
    return true;
  }
  if (message.type === 'CAPTURE_CONTEXT_NOW') {
    hasUserActivity = true;
    sendContextToBackground();
    sendResponse({ success: true });
    return true;
  }
  if (message.type === 'START_MONITORING') {
    startContinuousMonitoring();
    sendResponse({ success: true, activityLevel });
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
      isMonitoring: !!captureInterval 
    });
    return true;
  }
});
window.addEventListener('message', (event) => {
  if (event.data.type === 'WALLET_ADDRESS' && event.data.walletAddress) {
    chrome.storage.sync.set({ wallet_address: event.data.walletAddress }, () => {
      console.log('RecallOS: Wallet address received and stored from frontend');
    });
  }
});
setInterval(() => {
  try {
    const walletAddress = localStorage.getItem('wallet_address');
    if (walletAddress) {
      chrome.storage.sync.set({ wallet_address: walletAddress }, () => {
        console.log('RecallOS: Wallet address synced from localStorage:', walletAddress);
      });
    }
  } catch (error) {
  }
}, 2000);
chrome.storage.sync.get(['wallet_address'], (result) => {
  if (result.wallet_address) {
  } else {
    console.log('RecallOS: No wallet address found in storage');
  }
});
function hasContentChanged(): boolean {
  const currentUrl = location.href;
  const currentTitle = document.title;
  const currentContent = extractVisibleText();
  const urlChanged = currentUrl !== lastUrl;
  const titleChanged = currentTitle !== lastTitle;
  const contentChanged = currentContent !== lastContent && 
    (Math.abs(currentContent.length - lastContent.length) > 100 ||
     currentContent.substring(0, 200) !== lastContent.substring(0, 200));
  return urlChanged || titleChanged || contentChanged;
}
function shouldCaptureBasedOnActivity(): boolean {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  const timeSinceLastCapture = now - lastCaptureTime;
  return hasUserActivity && 
         timeSinceLastCapture >= MIN_CAPTURE_INTERVAL &&
         (hasContentChanged() || timeSinceLastActivity >= ACTIVITY_TIMEOUT);
}
function getMonitoringInterval(): number {
  switch (activityLevel) {
    case 'high': return 10000;
    case 'normal': return 20000;
    case 'low': return 60000;
    default: return 20000;
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
    setTimeout(sendContextToBackground, 1000);
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