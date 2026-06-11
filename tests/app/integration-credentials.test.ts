import { describe, expect, it } from 'vitest'

import {
  resolveCdekCredentials,
  resolveYookassaCredentials
} from '../../src/lib/integrationCredentials'

const emptyEnv = {}

describe('resolveYookassaCredentials', () => {
  it('берёт креды из админки, когда заполнены оба поля', () => {
    const creds = resolveYookassaCredentials(
      { yookassa: { shopId: ' 123456 ', secretKey: 'live_abc' } },
      { YOOKASSA_SHOP_ID: 'env-id', YOOKASSA_SECRET_KEY: 'env-key' }
    )

    expect(creds).toEqual({ shopId: '123456', secretKey: 'live_abc' })
  })

  it('падает обратно на env, если в админке заполнена только половина пары', () => {
    const creds = resolveYookassaCredentials(
      { yookassa: { shopId: '123456', secretKey: '' } },
      { YOOKASSA_SHOP_ID: 'env-id', YOOKASSA_SECRET_KEY: 'env-key' }
    )

    expect(creds).toEqual({ shopId: 'env-id', secretKey: 'env-key' })
  })

  it('возвращает null без кредов в админке и env', () => {
    expect(resolveYookassaCredentials(null, emptyEnv)).toBeNull()
    expect(resolveYookassaCredentials({ yookassa: { shopId: '  ' } }, emptyEnv)).toBeNull()
  })
})

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
