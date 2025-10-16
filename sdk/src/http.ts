export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface HttpClientOptions {
  baseUrl: string
  headers?: Record<string, string>
  fetch?: FetchLike
  timeoutMs?: number
}

export class HttpError extends Error {
  status: number
  body?: any
  constructor(message: string, status: number, body?: any) {
    super(message)
    this.status = status
    this.body = body
  }
}

export class HttpClient {
  private baseUrl: string
  private headers: Record<string, string>
  private fetchImpl: FetchLike
  private timeoutMs: number

  constructor(opts: HttpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '')
    this.headers = opts.headers || {}
    this.fetchImpl = opts.fetch || (globalThis.fetch as FetchLike)
    if (!this.fetchImpl) throw new Error('fetch is not available; provide a fetch implementation')
    this.timeoutMs = opts.timeoutMs ?? 15000
  }

  withHeaders(headers: Record<string, string>): HttpClient {
    return new HttpClient({ baseUrl: this.baseUrl, headers: { ...this.headers, ...headers }, fetch: this.fetchImpl, timeoutMs: this.timeoutMs })
  }

  async get<T>(path: string, params?: Record<string, any>, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
    const url = this.buildUrl(path, params)
    return this.request<T>(url, { method: 'GET', ...init })
  }

  async post<T>(path: string, body?: any, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
    const url = this.buildUrl(path)
    const headers = { 'Content-Type': 'application/json', ...this.headers, ...(init?.headers as any) }
    return this.request<T>(url, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined, ...init, headers })
  }

  private buildUrl(path: string, params?: Record<string, any>): string {
    const url = new URL(path.replace(/^\//, ''), this.baseUrl + '/')
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null) return
        if (typeof v === 'object') url.searchParams.set(k, JSON.stringify(v))
        else url.searchParams.set(k, String(v))
      })
    }
    return url.toString()
  }

  private async request<T>(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? this.timeoutMs)
    try {
      const res = await this.fetchImpl(url, {
        ...init,
        headers: { ...this.headers, ...(init?.headers as any) },
        signal: init?.signal ?? controller.signal
      })
      const text = await res.text()
      const isJson = (res.headers.get('content-type') || '').includes('application/json')
      const data = text && isJson ? safeJsonParse(text) : (text as any)
      if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status, data)
      return data as T
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new HttpError('Request timed out', 408)
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }
}

function safeJsonParse(text: string): any {
  try { return JSON.parse(text) } catch { return text }
}


