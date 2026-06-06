import { describe, expect, it } from 'vitest'

import { getPublicRequestOrigin } from '../../src/lib/requestOrigin'

describe('request origin helpers', () => {
  it('prefers forwarded host and proto over the local request origin', () => {
    const headers = new Headers({
      host: 'localhost:3001',
      'x-forwarded-host': 'all-waves-jump.loca.lt',
      'x-forwarded-proto': 'https'
    })

    expect(getPublicRequestOrigin('https://localhost:3001/api/admin-bootstrap', headers)).toBe(
      'https://all-waves-jump.loca.lt'
    )
  })

  it('falls back to the request origin when proxy headers are absent', () => {
    expect(getPublicRequestOrigin('http://127.0.0.1:3001/api/admin-bootstrap', new Headers())).toBe(
      'http://127.0.0.1:3001'
    )
  })

  it('rejects a forged forwarded host when a site URL is configured', () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bigstep.ru'
    try {
      const headers = new Headers({ 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' })
      expect(getPublicRequestOrigin('https://bigstep.ru/api/admin-bootstrap', headers)).toBe(
        'https://bigstep.ru'
      )
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
      else process.env.NEXT_PUBLIC_SITE_URL = prev
    }
  })

  it('accepts a forwarded host matching the configured site URL', () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bigstep.ru'
    try {
      const headers = new Headers({ 'x-forwarded-host': 'bigstep.ru', 'x-forwarded-proto': 'https' })
      expect(getPublicRequestOrigin('https://localhost:3000/api/admin-bootstrap', headers)).toBe(
        'https://bigstep.ru'
      )
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
      else process.env.NEXT_PUBLIC_SITE_URL = prev
    }
  })
})
