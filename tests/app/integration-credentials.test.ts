import { describe, expect, it } from 'vitest'

import { resolveCdekCredentials } from '../../src/lib/integrationCredentials'

const emptyEnv = {}

describe('resolveCdekCredentials', () => {
  it('берёт креды и контур API из админки', () => {
    const creds = resolveCdekCredentials(
      { cdek: { clientId: 'acc', clientSecret: 'pass', apiMode: 'test' } },
      { CDEK_CLIENT_ID: 'env-acc', CDEK_CLIENT_SECRET: 'env-pass' }
    )

    expect(creds).toEqual({ clientId: 'acc', clientSecret: 'pass', apiMode: 'test' })
  })

  it('по умолчанию использует боевой контур', () => {
    const creds = resolveCdekCredentials({ cdek: { clientId: 'acc', clientSecret: 'pass' } }, emptyEnv)
    expect(creds?.apiMode).toBe('prod')
  })

  it('падает обратно на env вместе с CDEK_API_MODE', () => {
    const creds = resolveCdekCredentials(null, {
      CDEK_CLIENT_ID: 'env-acc',
      CDEK_CLIENT_SECRET: 'env-pass',
      CDEK_API_MODE: 'test'
    })

    expect(creds).toEqual({ clientId: 'env-acc', clientSecret: 'env-pass', apiMode: 'test' })
  })

  it('возвращает null без кредов', () => {
    expect(resolveCdekCredentials({ cdek: { apiMode: 'test' } }, emptyEnv)).toBeNull()
  })
})
