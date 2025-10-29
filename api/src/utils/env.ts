export function getCookieDomain(): string {
  return process.env.COOKIE_DOMAIN || '.recallos.xyz';
}

export function getSessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || 'recallos_session';
}

export function isCookieSecure(): boolean {
  if (typeof process.env.COOKIE_SECURE !== 'undefined') {
    return process.env.COOKIE_SECURE === 'true';
  }
  return true;
}

export function getAllowedOrigins(): Set<string> {
  const originsEnv = process.env.CORS_ALLOWED_ORIGINS || '';
  const extensionIds = (process.env.EXTENSION_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const origins = new Set<string>();
  originsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((o) => origins.add(o));

  extensionIds.forEach((id) => {
    const origin = id.startsWith('chrome-extension://')
      ? id
      : `chrome-extension://${id}`;
    origins.add(origin);
  });

  return origins;
}

