import { describe, expect, it } from 'vitest'

import { normalizeAdminRouteParams } from '../../src/payload/adminRouteParams'

describe('Payload admin route params', () => {
  it('preserves the empty optional catch-all for the admin dashboard route', () => {
    expect(normalizeAdminRouteParams({})).toEqual({})
  })

  it('keeps nested admin route segments intact', () => {
    expect(normalizeAdminRouteParams({ segments: ['collections', 'users'] })).toEqual({
      segments: ['collections', 'users']
    })
  })
})
