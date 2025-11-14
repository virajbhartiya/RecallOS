import { getUserId, requireAuthToken, clearAuthToken } from '@/lib/userId'
import { storage, runtime, tabs } from '@/lib/browser'
import {
  DEFAULT_API_ENDPOINT,
  DEFAULT_API_BASE,
  STORAGE_KEYS,
  MESSAGE_TYPES,
} from '@/lib/constants'

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
}

type EmailDraftPayload = {
  subject?: string
  thread_text: string
  provider?: string
  existing_draft?: string
  participants?: string[]
  metadata?: Record<string, unknown>
  url?: string
  title?: string
}

async function getApiEndpoint(): Promise<string> {
  try {
    const result = await storage.sync.get([STORAGE_KEYS.API_ENDPOINT])
    return result[STORAGE_KEYS.API_ENDPOINT] || DEFAULT_API_ENDPOINT
  } catch (_error) {
    return DEFAULT_API_ENDPOINT
  }
}

async function getApiBaseUrl(): Promise<string> {
  try {
    const endpoint = await getApiEndpoint()
    const url = new URL(endpoint)
    return `${url.protocol}//${url.host}`
  } catch (_error) {
    return DEFAULT_API_BASE
  }
}

async function checkApiHealth(): Promise<boolean> {
  try {
    const apiBase = await getApiBaseUrl()
    const healthUrl = `${apiBase}/health`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'include',
      })
      clearTimeout(timeout)
      return response.ok || response.status < 500
    } catch (_error) {
      clearTimeout(timeout)
      try {
        const searchUrl = `${apiBase}/api/search`
        const searchResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'health-check', limit: 1 }),
          signal: controller.signal,
          credentials: 'include',
        })
        return searchResponse.status < 500
      } catch {
        return false
      }
    }
  } catch (_error) {
    return false
  }
}

async function isExtensionEnabled(): Promise<boolean> {
  try {
    const result = await storage.sync.get([STORAGE_KEYS.EXTENSION_ENABLED])
    return result[STORAGE_KEYS.EXTENSION_ENABLED] !== false
  } catch (_error) {
    return true
  }
}

async function setExtensionEnabled(enabled: boolean): Promise<void> {
  try {
    await storage.sync.set({ [STORAGE_KEYS.EXTENSION_ENABLED]: enabled })
  } catch (_error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to save extension state')
  }
}

async function getBlockedWebsites(): Promise<string[]> {
  try {
    const result = await storage.sync.get([STORAGE_KEYS.BLOCKED_WEBSITES])
    return result[STORAGE_KEYS.BLOCKED_WEBSITES] || []
  } catch (_error) {
    return []
  }
}

async function setBlockedWebsites(websites: string[]): Promise<void> {
  try {
    await storage.sync.set({ [STORAGE_KEYS.BLOCKED_WEBSITES]: websites })
  } catch (_error) {}
}

async function isMemoryInjectionEnabled(): Promise<boolean> {
  try {
    const result = await storage.sync.get([STORAGE_KEYS.MEMORY_INJECTION_ENABLED])
    return result[STORAGE_KEYS.MEMORY_INJECTION_ENABLED] !== false
  } catch (_error) {
    return true
  }
}

async function setMemoryInjectionEnabled(enabled: boolean): Promise<void> {
  try {
    await storage.sync.set({ [STORAGE_KEYS.MEMORY_INJECTION_ENABLED]: enabled })
  } catch (_error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to save memory injection state')
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch (_error) {
    return ''
  }
}

async function isWebsiteBlocked(url: string): Promise<boolean> {
  try {
    const blockedWebsites = await getBlockedWebsites()
    if (blockedWebsites.length === 0) {
      return false
    }

    const domain = extractDomain(url)
    if (!domain) {
      return false
    }

    return blockedWebsites.some(blocked => {
      const blockedDomain = extractDomain(blocked)
      if (!blockedDomain) {
        return url.includes(blocked) || blocked.includes(url)
      }
      return (
        domain === blockedDomain ||
        domain.endsWith('.' + blockedDomain) ||
        blockedDomain.endsWith('.' + domain)
      )
    })
  } catch (_error) {
    return false
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      controller.signal.aborted ? reject(new DOMException('Aborted', 'AbortError')) : undefined
    ),
  ]).finally(() => clearTimeout(timeout)) as Promise<T>
}

async function requestEmailDraft(payload: EmailDraftPayload) {
  const apiBase = await getApiBaseUrl()
  const endpoint = `${apiBase}/api/content/email/draft`

  let authToken: string
  try {
    authToken = await requireAuthToken()
  } catch (_error) {
    throw new Error('Authentication required. Please log in through the Cognia web client.')
  }

  // Create AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 370000) // 6.17 minutes (slightly longer than server timeout)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(
        `Draft request failed (${response.status}): ${errorText || response.statusText}`
      )
    }

    const result = await response.json()
    if (!result?.success || !result.data) {
      throw new Error('Draft service returned an unexpected response.')
    }

    return result.data as { subject: string; body: string; summary?: string }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - email draft took too long to generate')
    }
    throw error
  }
}

async function sendToBackend(data: ContextData): Promise<void> {
  try {
    const enabled = await isExtensionEnabled()
    if (!enabled) {
      return
    }

    const blocked = await isWebsiteBlocked(data.url)
    if (blocked) {
      return
    }

    const apiEndpoint = await getApiEndpoint()

    const privacyInfo = (data as any).privacy_extension_info
    const hasPrivacyConflicts = privacyInfo?.detected || false

    const content = data.meaningful_content || data.content_snippet || data.full_content || ''
    const isValidContent =
      content &&
      content.length > 50 &&
      !content.includes('Content extraction failed') &&
      !content.includes('No content available')

    if (!isValidContent) {
      return
    }

    let userId: string
    try {
      userId = await getUserId()
    } catch (_error) {
      return
    }

    const payload = {
      content: content,
      url: data.url,
      title: data.title,
      userId: userId,
      metadata: {
        source: data.source,
        timestamp: data.timestamp,
        content_type: data.content_type || 'web_page',
        content_summary: data.content_summary,
        privacy_extension_conflicts: hasPrivacyConflicts,
        privacy_extension_type: privacyInfo?.type || 'none',
        compatibility_mode: privacyInfo?.compatibility_mode || false,
      },
    }

    let authToken: string
    try {
      authToken = await requireAuthToken()
    } catch (_error) {
      return
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    }

    const controller = new AbortController()
    const fetchPromise = fetch(apiEndpoint, {
      method: 'POST',
      headers,
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({ ...payload, userId: userId }),
      signal: controller.signal,
    })

    const response = await withTimeout(fetchPromise, 4000).catch(_e => null)

    if (response && !response.ok) {
      if (response.status === 401) {
        await storage.local.remove(STORAGE_KEYS.AUTH_TOKEN)
        clearAuthToken()
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (_error) {}
}

runtime.onInstalled.addListener(() => {})

function isValidContentScriptUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

if (tabs.onActivated) {
  tabs.onActivated.addListener(async activeInfo => {
    try {
      const tab = await tabs.query({ active: true, currentWindow: true })
      if (tab.length > 0 && isValidContentScriptUrl(tab[0].url)) {
        tabs.sendMessage(activeInfo.tabId, {
          type: MESSAGE_TYPES.CAPTURE_CONTEXT_NOW,
        })
      }
    } catch (_error) {}
  })
}

if (tabs.onUpdated) {
  tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && isValidContentScriptUrl(tab.url)) {
      try {
        tabs.sendMessage(tabId, { type: MESSAGE_TYPES.CAPTURE_CONTEXT_NOW })
      } catch (_error) {}
    }
  })
}

async function setApiEndpoint(endpoint: string): Promise<void> {
  try {
    await storage.sync.set({ apiEndpoint: endpoint })
  } catch (_error) {
    console.error('Cognia: Error setting API endpoint:', error)
  }
}

runtime.onMessage.addListener(
  (
    message: {
      type?: string
      data?: ContextData
      endpoint?: string
      enabled?: boolean
    },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (message?.type === MESSAGE_TYPES.CAPTURE_CONTEXT && message.data) {
      sendToBackend(message.data)
        .then(() => {
          // Store last capture time
          storage.local.set({ last_capture_time: Date.now() })
          sendResponse({ success: true, message: 'Context sent to backend' })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true // Keep message channel open for async response
    }

    if (message?.type === MESSAGE_TYPES.SET_ENDPOINT && message.endpoint) {
      setApiEndpoint(message.endpoint)
        .then(() => {
          sendResponse({ success: true, message: 'API endpoint updated' })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true
    }

    if (message?.type === MESSAGE_TYPES.SYNC_AUTH_TOKEN) {
      ;(async () => {
        try {
          const token = (message as any).token
          if (token) {
            await storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token })
          }
        } catch (_error) {}
      })()
    }

    if (message?.type === MESSAGE_TYPES.GET_ENDPOINT) {
      getApiEndpoint()
        .then(endpoint => {
          sendResponse({ success: true, endpoint })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true
    }

    if (message?.type === MESSAGE_TYPES.GET_EXTENSION_ENABLED) {
      isExtensionEnabled()
        .then(enabled => {
          sendResponse({ success: true, enabled })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true
    }

    if (
      message?.type === MESSAGE_TYPES.SET_EXTENSION_ENABLED &&
      typeof message.enabled === 'boolean'
    ) {
      ;(async () => {
        try {
          await setExtensionEnabled(message.enabled!)
          sendResponse({ success: true, message: 'Extension state updated' })
        } catch (_error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update extension state',
          })
        }
      })()
      return true
    }

    if (message?.type === MESSAGE_TYPES.GET_BLOCKED_WEBSITES) {
      getBlockedWebsites()
        .then(websites => {
          sendResponse({ success: true, websites })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true
    }

    if (
      message?.type === MESSAGE_TYPES.SET_BLOCKED_WEBSITES &&
      Array.isArray((message as any).websites)
    ) {
      setBlockedWebsites((message as any).websites)
        .then(() => {
          sendResponse({ success: true, message: 'Blocked websites updated' })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true
    }

    if (message?.type === MESSAGE_TYPES.ADD_BLOCKED_WEBSITE && (message as any).website) {
      getBlockedWebsites()
        .then(websites => {
          const website = (message as any).website.trim()
          if (website && !websites.includes(website)) {
            websites.push(website)
            return setBlockedWebsites(websites)
          }
          return Promise.resolve()
        })
        .then(() => {
          sendResponse({ success: true, message: 'Website added to blocked list' })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true
    }

    if (message?.type === MESSAGE_TYPES.REMOVE_BLOCKED_WEBSITE && (message as any).website) {
      getBlockedWebsites()
        .then(websites => {
          const website = (message as any).website.trim()
          const filtered = websites.filter(w => w !== website)
          return setBlockedWebsites(filtered)
        })
        .then(() => {
          sendResponse({ success: true, message: 'Website removed from blocked list' })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true
    }

    if (message?.type === MESSAGE_TYPES.CHECK_WEBSITE_BLOCKED && (message as any).url) {
      isWebsiteBlocked((message as any).url)
        .then(blocked => {
          sendResponse({ success: true, blocked })
        })
        .catch(error => {
          sendResponse({ success: false, blocked: false, error: error.message })
        })

      return true
    }

    if (message?.type === MESSAGE_TYPES.CHECK_API_HEALTH) {
      checkApiHealth()
        .then(healthy => {
          sendResponse({ success: true, healthy })
        })
        .catch(error => {
          sendResponse({ success: false, healthy: false, error: error.message })
        })

      return true
    }

    if (message?.type === MESSAGE_TYPES.GET_MEMORY_INJECTION_ENABLED) {
      isMemoryInjectionEnabled()
        .then(enabled => {
          sendResponse({ success: true, enabled })
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message })
        })

      return true
    }

    if (
      message?.type === MESSAGE_TYPES.SET_MEMORY_INJECTION_ENABLED &&
      typeof message.enabled === 'boolean'
    ) {
      ;(async () => {
        try {
          await setMemoryInjectionEnabled(message.enabled!)
          sendResponse({ success: true, message: 'Memory injection state updated' })
        } catch (_error) {
          sendResponse({
            success: false,
            error:
              error instanceof Error ? error.message : 'Failed to update memory injection state',
          })
        }
      })()
      return true
    }

    if (message?.type === MESSAGE_TYPES.DRAFT_EMAIL_REPLY) {
      // Capture sendResponse before async operation - Chrome message channel timeout is ~5 minutes
      // We need to ensure response is sent before channel closes
      const responseCallback = sendResponse
      let responseSent = false
      
      // Helper to ensure response is only sent once
      const safeSendResponse = (response: any) => {
        if (!responseSent) {
          responseSent = true
          try {
            responseCallback(response)
          } catch (err) {
            console.error('[Cognia] Error sending response:', err)
          }
        }
      }
      
      ;(async () => {
        try {
          const payload = (message as any).payload as EmailDraftPayload
          if (!payload || typeof payload.thread_text !== 'string') {
            safeSendResponse({ success: false, error: 'Invalid payload' })
            return
          }
          
          // Start the draft request
          const data = await requestEmailDraft(payload)
          safeSendResponse({ success: true, data })
        } catch (error) {
          safeSendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to draft email reply',
          })
        }
      })()
      
      return true // Indicates we'll send response asynchronously
    }

    if (message?.type === MESSAGE_TYPES.PING) {
      sendResponse({ type: 'PONG', from: 'background' })
    }
  }
)
