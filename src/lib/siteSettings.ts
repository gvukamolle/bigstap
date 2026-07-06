import config from '@payload-config'
import { getPayload } from 'payload'

// Глобал читается на каждый рендер главной — кэшируем ненадолго, чтобы правка ссылки
// в админке применялась без перезапуска, но без похода в БД на каждый запрос.
const CACHE_TTL_MS = 30_000

const FALLBACK_HERO_LINK = '/shop'

let cache: { heroLink: string; expiresAt: number } | null = null

// Внутренний путь («/shop/test-01») или абсолютный http(s)-URL. Всё остальное —
// фолбэк на магазин, чтобы опечатка в админке не сломала клик по хиро.
function sanitizeHeroLink(value: unknown): string {
  if (typeof value !== 'string') return FALLBACK_HERO_LINK
  const link = value.trim()
  if (link.startsWith('/')) return link
  if (/^https?:\/\//.test(link)) return link
  return FALLBACK_HERO_LINK
}

export async function getHeroLink(): Promise<string> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.heroLink

  let heroLink = FALLBACK_HERO_LINK
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    heroLink = sanitizeHeroLink((settings as { heroLink?: unknown }).heroLink)
  } catch {
    // БД недоступна или глобал ещё не создан — ведём в магазин.
  }

  cache = { heroLink, expiresAt: now + CACHE_TTL_MS }
  return heroLink
}
