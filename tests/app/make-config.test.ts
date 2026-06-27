// tests/app/make-config.test.ts
import { describe, expect, it } from 'vitest'

import { resolveMakeConfig } from '../../src/lib/integrationCredentials'

describe('resolveMakeConfig', () => {
  it('prefers CMS webhook url over env', () => {
    const config = resolveMakeConfig(
      { make: { webhookUrl: 'https://hook.make.com/cms', webhookSecret: 's1' } },
      { MAKE_WEBHOOK_URL: 'https://hook.make.com/env' }
    )
    expect(config).toEqual({ webhookUrl: 'https://hook.make.com/cms', webhookSecret: 's1' })
  })

  it('falls back to env when CMS url is empty', () => {
    const config = resolveMakeConfig(
      { make: { webhookUrl: '  ', webhookSecret: null } },
      { MAKE_WEBHOOK_URL: 'https://hook.make.com/env', MAKE_WEBHOOK_SECRET: 's2' }
    )
    expect(config).toEqual({ webhookUrl: 'https://hook.make.com/env', webhookSecret: 's2' })
  })

  it('returns null when no webhook url anywhere', () => {
    expect(resolveMakeConfig(null, {})).toBeNull()
  })

  it('keeps webhookSecret null when not set', () => {
    const config = resolveMakeConfig(null, { MAKE_WEBHOOK_URL: 'https://hook.make.com/env' })
    expect(config).toEqual({ webhookUrl: 'https://hook.make.com/env', webhookSecret: null })
  })
})
