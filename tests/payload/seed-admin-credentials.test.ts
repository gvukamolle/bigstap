import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSeedAdminCredentials } from '../../src/payload/seedAdminCredentials'

describe('seed admin credentials', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads username, password, and a local fallback email from env', () => {
    vi.stubEnv('PAYLOAD_SEED_ADMIN_USERNAME', ' bigstep0707_credits ')
    vi.stubEnv('PAYLOAD_SEED_ADMIN_PASSWORD', 'secret-password')
    vi.stubEnv('PAYLOAD_SEED_ADMIN_EMAIL', '')

    expect(getSeedAdminCredentials()).toEqual({
      email: 'bigstep0707_credits@bigstep.local',
      password: 'secret-password',
      username: 'bigstep0707_credits'
    })
  })

  it('requires username and password env values', () => {
    vi.stubEnv('PAYLOAD_SEED_ADMIN_USERNAME', '')
    vi.stubEnv('PAYLOAD_SEED_ADMIN_PASSWORD', '')

    expect(() => getSeedAdminCredentials()).toThrow(
      'Set PAYLOAD_SEED_ADMIN_USERNAME and PAYLOAD_SEED_ADMIN_PASSWORD.'
    )
  })
})
