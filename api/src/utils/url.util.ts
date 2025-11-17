export function extractDomain(url?: string | null): string | undefined {
  if (!url) {
    return undefined
  }

  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    const match = url.match(/https?:\/\/([^/]+)/)
    if (match) {
      return match[1].replace(/^www\./, '')
    }
    return url
  }
}
