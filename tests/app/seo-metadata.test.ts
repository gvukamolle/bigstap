import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadRobotsRoute() {
  vi.resetModules()
  return (await import('../../src/app/robots')).default
}

async function loadSitemapRoute() {
  vi.resetModules()
  return (await import('../../src/app/sitemap')).default
}

describe('SEO metadata routes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not emit localhost URLs for production robots metadata without an explicit site URL', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

    const robots = await loadRobotsRoute()
    const result = robots()

    expect(result.host).toBe('https://bigstep.ru')
    expect(result.sitemap).toBe('https://bigstep.ru/sitemap.xml')
  })

  it('does not emit localhost URLs for production sitemap metadata without an explicit site URL', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

    const sitemap = await loadSitemapRoute()
    const result = await sitemap()

    expect(result[0]?.url).toBe('https://bigstep.ru/')
    expect(result.every((entry) => !entry.url.includes('localhost'))).toBe(true)
  })

  it('normalizes explicit site URLs by trimming a trailing slash', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com/')

    const robots = await loadRobotsRoute()
    const result = robots()

    expect(result.host).toBe('https://example.com')
    expect(result.sitemap).toBe('https://example.com/sitemap.xml')
  })
})
