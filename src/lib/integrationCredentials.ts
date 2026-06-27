// Чистая логика выбора кредов интеграций: значения из админки (глобал «Интеграции»)
// имеют приоритет над переменными окружения. Пара активна только целиком — одиночный
// shopId без ключа из одного источника не смешивается со вторым источником.

export type YookassaCredentials = {
  shopId: string
  secretKey: string
}

export type CdekApiMode = 'prod' | 'test'

export type CdekCredentials = {
  clientId: string
  clientSecret: string
  apiMode: CdekApiMode
}

export type IntegrationSettingsData = {
  yookassa?: {
    shopId?: string | null
    secretKey?: string | null
  } | null
  cdek?: {
    clientId?: string | null
    clientSecret?: string | null
    apiMode?: string | null
  } | null
  make?: {
    webhookUrl?: string | null
    webhookSecret?: string | null
  } | null
}

// process.env без жёсткой привязки к NodeJS.ProcessEnv — удобнее подставлять в тестах.
export type EnvVars = Record<string, string | undefined>

const clean = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function resolveYookassaCredentials(
  settings: IntegrationSettingsData | null,
  env: EnvVars = process.env
): YookassaCredentials | null {
  const cmsShopId = clean(settings?.yookassa?.shopId)
  const cmsSecret = clean(settings?.yookassa?.secretKey)
  if (cmsShopId && cmsSecret) return { shopId: cmsShopId, secretKey: cmsSecret }

  const envShopId = clean(env.YOOKASSA_SHOP_ID)
  const envSecret = clean(env.YOOKASSA_SECRET_KEY)
  if (envShopId && envSecret) return { shopId: envShopId, secretKey: envSecret }

  return null
}

export function resolveCdekCredentials(
  settings: IntegrationSettingsData | null,
  env: EnvVars = process.env
): CdekCredentials | null {
  const cmsClientId = clean(settings?.cdek?.clientId)
  const cmsSecret = clean(settings?.cdek?.clientSecret)
  if (cmsClientId && cmsSecret) {
    return {
      clientId: cmsClientId,
      clientSecret: cmsSecret,
      apiMode: settings?.cdek?.apiMode === 'test' ? 'test' : 'prod'
    }
  }

  const envClientId = clean(env.CDEK_CLIENT_ID)
  const envSecret = clean(env.CDEK_CLIENT_SECRET)
  if (envClientId && envSecret) {
    return {
      clientId: envClientId,
      clientSecret: envSecret,
      apiMode: env.CDEK_API_MODE === 'test' ? 'test' : 'prod'
    }
  }

  return null
}

export type MakeConfig = {
  webhookUrl: string
  webhookSecret: string | null
}

export function resolveMakeConfig(
  settings: IntegrationSettingsData | null,
  env: EnvVars = process.env
): MakeConfig | null {
  const cmsUrl = clean(settings?.make?.webhookUrl)
  if (cmsUrl) {
    return { webhookUrl: cmsUrl, webhookSecret: clean(settings?.make?.webhookSecret) }
  }

  const envUrl = clean(env.MAKE_WEBHOOK_URL)
  if (envUrl) {
    return { webhookUrl: envUrl, webhookSecret: clean(env.MAKE_WEBHOOK_SECRET) }
  }

  return null
}
