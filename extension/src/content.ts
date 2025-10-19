
// Chrome extension types
declare const chrome: any;

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
      console.log(
        'RecallOS: Privacy extension detected, enabling compatibility mode'
      );
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
      console.log(
        'RecallOS: Iframe restrictions detected, enabling compatibility mode'
      );
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
            console.log(
              'RecallOS: Privacy extension blocking style access, accepting node'
            );
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
        console.log('RecallOS: Error accessing text content:', error);
        continue;
      }
    }
    return textNodes.join(' ');
  } catch (error) {
    console.log(
      'RecallOS: Error in extractVisibleText, using fallback:',
      error
    );
    try {
      return (
        document.body?.textContent ||
        document.documentElement?.textContent ||
        document.title ||
        ''
      );
    } catch (fallbackError) {
      console.log('RecallOS: Fallback also failed:', fallbackError);
      return document.title || window.location.href;
    }
  }
}
function extractMeaningfulContent(): string {
  try {
    if (!document.body || !document.body.innerHTML) {
      console.log(
        'RecallOS: Document body not accessible for meaningful content extraction'
      );
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
      console.log(
        'RecallOS: Error accessing innerHTML, using textContent fallback'
      );
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
        console.log(
          'RecallOS: Error querying content selector:',
          selector,
          error
        );
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
    return cleanText(meaningfulContent).substring(0, 50000);
  } catch (error) {
    console.log(
      'RecallOS: Error in extractMeaningfulContent, using fallback:',
      error
    );
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
      console.log(
        'RecallOS: Fallback also failed in cleanAndExtractText:',
        fallbackError
      );
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
    console.log(
      'RecallOS: Error in captureContext, using minimal fallback:',
      error
    );
    
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

function sendContextToBackground() {
  try {
    if (!chrome.runtime?.id) {
      console.log('RecallOS: Extension context invalidated, skipping capture');
      return;
    }
    
    if (isLocalhost()) {
      console.log('RecallOS: Skipping capture - localhost detected');
      return;
    }
    
    const now = Date.now();
    if (now - lastCaptureTime < MIN_CAPTURE_INTERVAL) {
      console.log('RecallOS: Skipping capture - too soon since last capture');
      return;
    }
    const contextData = captureContext();
    
    const hasValidContent = contextData.content_snippet && 
                           contextData.content_snippet.length > 50 && 
                           !contextData.content_snippet.includes('Content extraction failed');
    
    if (privacyExtensionDetected && !hasValidContent) {
      console.log('RecallOS: Privacy extension blocking content capture, skipping backend send');
      return;
    }
    
    if (!hasValidContent) {
      console.log('RecallOS: Insufficient content captured, skipping backend send');
      return;
    }
    
    (contextData as any).privacy_extension_info = {
      detected: privacyExtensionDetected,
      type: privacyExtensionType,
      compatibility_mode: privacyExtensionDetected,
    };
    console.log('RecallOS: Captured context:', contextData);
    console.log(
      'RecallOS: Privacy extension detected:',
      privacyExtensionDetected,
      'Type:',
      privacyExtensionType
    );
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
        console.log(
          'RecallOS: Wallet address received and stored from frontend'
        );
      }
    );
  }
});
setInterval(() => {
  try {
    const walletAddress = localStorage.getItem('wallet_address');
    if (walletAddress) {
      chrome.storage.sync.set({ wallet_address: walletAddress }, () => {
        console.log(
          'RecallOS: Wallet address synced from localStorage:',
          walletAddress
        );
      });
    }
  } catch (error) {}
}, 2000);
chrome.storage.sync.get(['wallet_address'], result => {
  if (result.wallet_address) {
  } else {
    console.log('RecallOS: No wallet address found in storage');
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
    console.log('RecallOS: Skipping continuous monitoring - localhost detected');
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

let isChatGPT = false;
let chatGPTInput: HTMLTextAreaElement | null = null;
let chatGPTSendButton: HTMLButtonElement | null = null;
let originalSendHandler: ((event: Event) => void) | null = null;
let isProcessingMemory = false;
let recallOSIcon: HTMLElement | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;
let lastTypedText = '';
let isAutoInjecting = false;

function detectChatGPT(): boolean {
  const hostname = window.location.hostname;
  return hostname.includes('chatgpt.com') || hostname.includes('openai.com');
}

async function pollSearchJob(jobId: string): Promise<string | null> {
  try {
    const response = await fetch(`http://localhost:3000/api/search/job/${jobId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
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
    const walletAddress = await getWalletAddressFromStorage();
    if (!walletAddress) {
      return null;
    }

    // Extension needs full URL since it's not running on the same domain
    const searchEndpoint = 'http://localhost:3000/api/search';
    
    const requestBody = {
      wallet: walletAddress.toLowerCase(),
      query: query,
      limit: 5,
      contextOnly: false
    };
        
    const response = await fetch(searchEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
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
    
    if (result.answer) {
      summaryParts.push(result.answer);
    } else if (result.meta_summary) {
      summaryParts.push(result.meta_summary);
    } else if (result.results && result.results.length > 0) {
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
      console.log('RecallOS: Polling for async search result...');
      
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
      return null;
    }
    
    return summaryParts.join('\n\n');
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
  if (!chatGPTInput) return;
  
  const combinedMessage = `[RecallOS Memory Context]\n${summary}\n\n[Your Question]\n${originalMessage}`;
  
  if (chatGPTInput.tagName === 'TEXTAREA') {
    (chatGPTInput as HTMLTextAreaElement).value = combinedMessage;
    const inputEvent = new Event('input', { bubbles: true });
    chatGPTInput.dispatchEvent(inputEvent);
  } else if (chatGPTInput.contentEditable === 'true') {
    chatGPTInput.textContent = combinedMessage;
    const inputEvent = new Event('input', { bubbles: true });
    chatGPTInput.dispatchEvent(inputEvent);
  }
}

async function autoInjectMemories(userText: string): Promise<void> {
  if (isAutoInjecting || !userText || userText.length < 3) return;
  
  if (userText.includes('[RecallOS Memory Context]')) return;
  
  isAutoInjecting = true;
  
  try {
    if (recallOSIcon) {
      recallOSIcon.style.color = '#f59e0b';
      recallOSIcon.style.animation = 'pulse 1s infinite';
    }
    
    const memorySummary = await getMemorySummary(userText);
    
    if (memorySummary) {
      const currentText = getCurrentInputText();
      if (currentText === userText) {
        injectMemorySummary(memorySummary, userText);
        console.log('RecallOS: Memories injected successfully');
        
        if (recallOSIcon) {
          recallOSIcon.style.color = '#10a37f';
          recallOSIcon.style.animation = 'none';
        }
      } else {
        console.log('RecallOS: User continued typing, skipping injection');
        if (recallOSIcon) {
          recallOSIcon.style.color = '#8e8ea0';
          recallOSIcon.style.animation = 'none';
        }
      }
    } else {
      console.log('RecallOS: No memories found');
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
  if (!chatGPTInput) return '';
  
  if (chatGPTInput.tagName === 'TEXTAREA') {
    return (chatGPTInput as HTMLTextAreaElement).value?.trim() || '';
  } else if (chatGPTInput.contentEditable === 'true') {
    return chatGPTInput.textContent?.trim() || '';
  }
  
  return '';
}

function handleTyping(): void {
  if (!chatGPTInput) return;
  
  const currentText = getCurrentInputText();
  
  if (currentText.includes('[RecallOS Memory Context]')) return;
  
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }
  
  typingTimeout = setTimeout(async () => {
    if (currentText && currentText.length >= 3 && currentText !== lastTypedText) {
      console.log('RecallOS: Auto-injecting memories for:', currentText);
      lastTypedText = currentText;
      await autoInjectMemories(currentText);
    }
  }, 1500); 
}

function createRecallOSIcon(): HTMLElement {
  const icon = document.createElement('div');
  icon.id = 'recallos-extension-icon';
  icon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http:
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
      <path d="M19 15L19.5 17.5L22 18L19.5 18.5L19 21L18.5 18.5L16 18L18.5 17.5L19 15Z" fill="currentColor"/>
      <path d="M5 15L5.5 17.5L8 18L5.5 18.5L5 21L4.5 18.5L2 18L4.5 17.5L5 15Z" fill="currentColor"/>
    </svg>
  `;
  
  icon.style.cssText = `
    position: absolute !important;
    right: 80px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 24px !important;
    height: 24px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: #8e8ea0 !important;
    cursor: pointer !important;
    border-radius: 6px !important;
    transition: all 0.2s ease !important;
    z-index: 99999 !important;
    background: rgba(0, 0, 0, 0.1) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    padding: 2px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  `;
  
  icon.addEventListener('mouseenter', () => {
    icon.style.color = '#10a37f';
    icon.style.backgroundColor = 'rgba(16, 163, 127, 0.1)';
    icon.style.transform = 'translateY(-50%) scale(1.1)';
  });
  
  icon.addEventListener('mouseleave', () => {
    icon.style.color = '#8e8ea0';
    icon.style.backgroundColor = 'transparent';
    icon.style.transform = 'translateY(-50%) scale(1)';
  });
  
  icon.addEventListener('click', async () => {
    await showRecallOSStatus();
  });
  
  return icon;
}

async function checkApiHealth(): Promise<boolean> {
  try {
    // Extension needs full URL since it's not running on the same domain
    const healthEndpoint = 'http://localhost:3000/api/search';
    
    const response = await fetch(healthEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet: 'health-check',
        query: 'test',
        limit: 1,
        contextOnly: false
      }),
    });
    
    return response.status < 500;
  } catch (error) {
    console.error('RecallOS: Health check failed:', error);
    return false;
  }
}

async function getWalletAddressFromStorage(): Promise<string | null> {
  try {
    const result = await chrome.storage.sync.get(['wallet_address']);
    if (result.wallet_address) {
      return result.wallet_address;
    }
    
    const localWallet = localStorage.getItem('wallet_address');
    if (localWallet) {
      await chrome.storage.sync.set({ wallet_address: localWallet });
      return localWallet;
    }
    
    return null;
  } catch (error) {
    console.error('RecallOS: Error getting wallet address:', error);
    return null;
  }
}

async function showRecallOSStatus(): Promise<void> {
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #343541;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    max-width: 300px;
    border: 1px solid #565869;
  `;
  
  tooltip.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; animation: pulse 1s infinite;"></div>
      <strong>RecallOS Extension</strong>
    </div>
    <div style="font-size: 12px; color: #c5c5d2;">
      Checking status...
    </div>
  `;
  
  document.body.appendChild(tooltip);
  
  try {
    const [walletAddress, apiHealthy] = await Promise.all([
      getWalletAddressFromStorage(),
      checkApiHealth()
    ]);
    
    const walletStatus = walletAddress ? 'Connected' : 'Not Connected';
    const apiStatus = apiHealthy ? 'Connected' : 'Not Connected';
    const overallStatus = walletAddress && apiHealthy ? 'Connected' : 'Not Connected';
    const statusColor = overallStatus === 'Connected' ? '#10a37f' : '#ef4444';
    
    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></div>
        <strong>RecallOS Extension</strong>
      </div>
      <div style="font-size: 12px; color: #c5c5d2;">
        <div>Wallet: ${walletStatus}</div>
        <div>API: ${apiStatus}</div>
        ${walletAddress ? `Address: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}
      </div>
      <div style="font-size: 11px; color: #8e8ea0; margin-top: 8px;">
        Memories are automatically injected as you type (1.5s delay). Click to check status.
      </div>
    `;
  } catch (error) {
    console.error('RecallOS: Error checking status:', error);
    tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></div>
        <strong>RecallOS Extension</strong>
      </div>
      <div style="font-size: 12px; color: #c5c5d2;">
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

function findChatGPTElements(): void {
  const inputSelectors = [
    'div[contenteditable="true"]',
    'textarea[placeholder*="Ask anything"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="Send a message"]',
    'textarea[placeholder*="Type a message"]',
    'textarea[role="textbox"]',
    'textarea',
    'input[type="text"]'
  ];
  
  for (const selector of inputSelectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.offsetParent !== null) {
      chatGPTInput = element as any;
      break;
    }
  }

  const buttonSelectors = [
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
  
  for (const selector of buttonSelectors) {
    const element = document.querySelector(selector) as HTMLButtonElement;
    if (element && element.offsetParent !== null) {
      chatGPTSendButton = element;
      break;
    }
  }
}

function setupChatGPTIntegration(): void {
  if (!isChatGPT) return;
  
  if (originalSendHandler) {
    console.log('RecallOS: Integration already set up, skipping');
    return;
  }
  
  findChatGPTElements();
  
  if (chatGPTInput && !recallOSIcon) {
    console.log('RecallOS: Attempting to add icon to input area');
    
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
      const container = chatGPTInput.closest(selector);
      if (container) {
        inputContainer = container;
        console.log(`RecallOS: Found container with selector: ${selector}`);
        break;
      }
    }
    
    if (!inputContainer) {
      inputContainer = chatGPTInput.parentElement;
      console.log('RecallOS: Using parent element as container');
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
      
      recallOSIcon = createRecallOSIcon();
      inputContainer.appendChild(recallOSIcon);
      console.log('RecallOS: Icon added to ChatGPT input container');
      
      const ensureIconVisible = () => {
        if (!recallOSIcon || !document.body.contains(recallOSIcon)) {
          console.log('RecallOS: Icon missing, attempting to recreate');
          
          findChatGPTElements();
          
          if (chatGPTInput) {
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
              const container = chatGPTInput.closest(selector);
              if (container) {
                newContainer = container;
                break;
              }
            }
            
            if (!newContainer) {
              newContainer = chatGPTInput.parentElement;
            }
            
            if (newContainer && document.body.contains(newContainer)) {
              const existingIcon = document.getElementById('recallos-extension-icon');
              if (existingIcon) {
                existingIcon.remove();
              }
              
              recallOSIcon = createRecallOSIcon();
              newContainer.appendChild(recallOSIcon);
              console.log('RecallOS: Icon recreated and added');
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
              console.log('RecallOS: Icon was removed by ChatGPT, scheduling recreation');
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
    } else {
      console.log('RecallOS: Could not find any suitable container for icon');
    }
  } else if (!chatGPTInput) {
    console.log('RecallOS: No input element found, cannot add icon');
  } else if (recallOSIcon) {
    console.log('RecallOS: Icon already exists, skipping');
  }
  
  if (chatGPTInput && !originalSendHandler) {
    console.log('RecallOS: Setting up ChatGPT auto-injection');
    console.log('RecallOS: Input element:', chatGPTInput);
    console.log('RecallOS: Input tag:', chatGPTInput.tagName);
    console.log('RecallOS: Input contentEditable:', chatGPTInput.contentEditable);
    
    const inputHandler = (e) => {
      console.log('RecallOS: Input event triggered on', e.target);
      handleTyping();
    };
    
    const keyupHandler = (e) => {
      console.log('RecallOS: Keyup event triggered on', e.target);
      handleTyping();
    };
    
    const pasteHandler = (e) => {
      console.log('RecallOS: Paste event triggered on', e.target);
      setTimeout(handleTyping, 100);
    };
    
    chatGPTInput.addEventListener('input', inputHandler, true);
    chatGPTInput.addEventListener('keyup', keyupHandler, true);
    chatGPTInput.addEventListener('paste', pasteHandler, true);
    
    if (chatGPTInput.contentEditable === 'true') {
      document.addEventListener('input', (e) => {
        if (e.target === chatGPTInput) {
          console.log('RecallOS: Document input event triggered on contenteditable');
          handleTyping();
        }
      }, true);
      
      const contentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            console.log('RecallOS: Contenteditable content changed');
            handleTyping();
          }
        });
      });
      
      contentObserver.observe(chatGPTInput, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      console.log('RecallOS: MutationObserver added for contenteditable');
    }
    
    console.log('RecallOS: Event listeners added successfully');
    
    originalSendHandler = () => {}; 
  } else if (!chatGPTInput) {
    console.log('RecallOS: No input element found for auto-injection setup');
  } else if (originalSendHandler) {
    console.log('RecallOS: Auto-injection already set up');
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

function waitForChatGPTReady(): Promise<void> {
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
  console.log('RecallOS: Attempting immediate setup');
  setupChatGPTIntegration();
  
  if (!recallOSIcon) {
    setTimeout(() => {
      console.log('RecallOS: Retry setup after 3 seconds');
      setupChatGPTIntegration();
    }, 3000);
    
    setTimeout(() => {
      console.log('RecallOS: Final retry setup after 6 seconds');
      setupChatGPTIntegration();
    }, 6000);
  }
}

function initChatGPTIntegration(): void {
  isChatGPT = detectChatGPT();
  
  if (isChatGPT) {
    console.log('RecallOS: ChatGPT detected');
    addRecallOSStyles();
    
    trySetupImmediately();
    
    waitForChatGPTReady().then(() => {
      console.log('RecallOS: ChatGPT is ready, setting up integration');
      setupChatGPTIntegration();
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
            console.log('RecallOS: New chat elements detected, scheduling setup');
            setupTimeout = setTimeout(() => {
              setupChatGPTIntegration();
              setupTimeout = null;
            }, 1000);
          }
        }
      });
    });
    
    waitForChatGPTReady().then(() => {
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
        console.log(`RecallOS: Retrying setup (attempt ${retryCount}/${maxRetries})...`);
        setupChatGPTIntegration();
        setTimeout(retrySetup, 3000);
      } else if (retryCount >= maxRetries) {
        console.log('RecallOS: Max retry attempts reached, stopping retries');
      }
    };
    
    waitForChatGPTReady().then(() => {
      setTimeout(retrySetup, 2000);
    });
    
    const continuousIconMonitor = () => {
      if (!recallOSIcon && isChatGPT) {
        console.log('RecallOS: Continuous monitor - icon missing, attempting setup');
        setupChatGPTIntegration();
      }
    };
    
    setInterval(continuousIconMonitor, 5000);
  }
}

function debugChatGPTElements(): void {
  console.log('RecallOS: Debug - ChatGPT elements found:');
  console.log('- Input element:', chatGPTInput);
  console.log('- Send button:', chatGPTSendButton);
  console.log('- Icon element:', recallOSIcon);
  console.log('- Is ChatGPT detected:', isChatGPT);
  
  if (chatGPTInput) {
    console.log('- Input container:', chatGPTInput.parentElement);
    console.log('- Input position:', window.getComputedStyle(chatGPTInput).position);
    console.log('- Input visibility:', chatGPTInput.offsetParent !== null);
  }
  
  if (recallOSIcon) {
    console.log('- Icon position:', window.getComputedStyle(recallOSIcon).position);
    console.log('- Icon visibility:', recallOSIcon.offsetParent !== null);
    console.log('- Icon display:', window.getComputedStyle(recallOSIcon).display);
  }
}

(window as any).debugRecallOS = debugChatGPTElements;

(window as any).triggerRecallOS = async () => {
  console.log('RecallOS: Manual trigger activated');
  const currentText = getCurrentInputText();
  console.log('RecallOS: Current text:', currentText);
  if (currentText && currentText.length >= 3) {
    await autoInjectMemories(currentText);
  } else {
    console.log('RecallOS: No text to process');
  }
};

(window as any).setupRecallOSListeners = () => {
  console.log('RecallOS: Manually setting up event listeners');
  findChatGPTElements();
  if (chatGPTInput) {
    console.log('RecallOS: Found input element, adding listeners');
    
    const inputHandler = (e) => {
      console.log('RecallOS: Manual input event triggered on', e.target);
      handleTyping();
    };
    
    chatGPTInput.addEventListener('input', inputHandler, true);
    chatGPTInput.addEventListener('keyup', inputHandler, true);
    chatGPTInput.addEventListener('paste', inputHandler, true);
    
    console.log('RecallOS: Manual event listeners added');
  } else {
    console.log('RecallOS: No input element found for manual setup');
  }
};

(window as any).testMemoryInjection = async () => {
  console.log('RecallOS: Testing memory injection with current input text');
  const currentText = getCurrentInputText();
  console.log('RecallOS: Current input text:', currentText);
  if (currentText && currentText.length >= 3) {
    await autoInjectMemories(currentText);
  } else {
    console.log('RecallOS: No text in input field to test with');
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
  const apiHealthy = await checkApiHealth();
  const apiEndpoint = await getApiEndpointForMemory();
  
  return {
    walletAddress,
    apiEndpoint,
    apiHealthy,
    isChatGPT,
    chatGPTInput: !!chatGPTInput,
    recallOSIcon: !!recallOSIcon
  };
};

initChatGPTIntegration();

document.addEventListener('input', (e) => {
  const target = e.target as HTMLElement;
  if (target && (
    target.contentEditable === 'true' || 
    target.tagName === 'TEXTAREA' ||
    target.closest('[data-testid*="textbox"]') ||
    target.closest('div[contenteditable="true"]')
  )) {
    console.log('RecallOS: Typing detected in ChatGPT input');
    if (!chatGPTInput || !document.body.contains(chatGPTInput)) {
      chatGPTInput = target as any;
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
    target.closest('div[contenteditable="true"]')
  )) {
    if (!chatGPTInput || !document.body.contains(chatGPTInput)) {
      chatGPTInput = target as any;
    }
    handleTyping();
  }
}, true);
