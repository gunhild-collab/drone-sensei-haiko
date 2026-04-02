// Per-domain rate limiter: max 1 request per 3 seconds (spec §4.3)
const lastRequest = new Map<string, number>()
const MIN_GAP_MS = 3_000

export async function rateLimit(url: string): Promise<void> {
  let domain: string
  try {
    domain = new URL(url).hostname
  } catch {
    return // not a valid URL, skip
  }

  const now = Date.now()
  const last = lastRequest.get(domain) ?? 0
  const wait = MIN_GAP_MS - (now - last)

  if (wait > 0) {
    await new Promise<void>(r => setTimeout(r, wait))
  }

  lastRequest.set(domain, Date.now())
}
