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
})
