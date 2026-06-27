// Чистая логика выбора кредов интеграций: значения из админки (глобал «Интеграции»)
// имеют приоритет над переменными окружения, иначе берётся env, иначе null.

export type IntegrationSettingsData = {
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
