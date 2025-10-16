const BASE = process.env.API_BASE_URL || 'http://localhost:3000'
const TOKEN = process.env.API_BEARER_TOKEN

async function request(method: 'GET' | 'POST', path: string, body?: any): Promise<any> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (TOKEN) headers['authorization'] = `Bearer ${TOKEN}`
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
  }
  try { return text ? JSON.parse(text) : null } catch { return text }
}

export const http = {
  get: (path: string, params?: Record<string, any>) => {
    const qp = params ? '?' + new URLSearchParams(Object.entries(params).reduce((acc, [k, v]) => {
      if (v === undefined || v === null) return acc
      acc[k] = String(v)
      return acc
    }, {} as Record<string, string>)).toString() : ''
    return request('GET', `${path}${qp}`)
  },
  post: (path: string, data?: any) => request('POST', path, data)
}

 