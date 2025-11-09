export function getCookieDomain(): string {
  return process.env.COOKIE_DOMAIN || '.recallos.xyz'
}

export function getSessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || 'recallos_session'
}

export function isCookieSecure(): boolean {
  if (typeof process.env.COOKIE_SECURE !== 'undefined') {
    return process.env.COOKIE_SECURE === 'true'
  }
  return true
}

export function getAllowedOrigins(): Set<string> {
  const originsEnv = process.env.CORS_ALLOWED_ORIGINS || ''
  const extensionIds = (process.env.EXTENSION_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const origins = new Set<string>()
  originsEnv
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(o => origins.add(o))

  extensionIds.forEach(id => {
    const origin = id.startsWith('chrome-extension://') ? id : `chrome-extension://${id}`
    origins.add(origin)
  })

  return origins
}

export function getRedisConnection() {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL } as const
  }
  const host = process.env.REDIS_HOST || '127.0.0.1'
  const port = Number(process.env.REDIS_PORT || 6379)
  const username = process.env.REDIS_USERNAME
  const password = process.env.REDIS_PASSWORD
  return {
    host,
    port,
    username,
    password,
  } as const
}

export function getQueueLimiter() {
  const max = Number(process.env.QUEUE_RATE_MAX || 10)
  const duration = Number(process.env.QUEUE_RATE_DURATION_MS || 1000)
  return { max, duration } as const
}

export function getQueueConcurrency() {
  return Number(process.env.QUEUE_CONCURRENCY || 1)
}
