import { describe, expect, it } from 'vitest'

import { Users } from '../../src/payload/collections/Users'

describe('Payload users auth config', () => {
  it('allows the local admin to log in with a username', () => {
    expect(Users.auth).toMatchObject({
      loginWithUsername: {
        allowEmailLogin: true,
        requireEmail: false,
        requireUsername: true
      }
    })
    expect(Users.admin?.useAsTitle).toBe('username')
  })
})
