import config from '@payload-config'
import { getPayload } from 'payload'

import {
  resolveCdekCredentials,
  resolveYookassaCredentials,
  type CdekCredentials,
  type IntegrationSettingsData,
  type YookassaCredentials
} from './integrationCredentials'

// Глобал читается на каждый запрос чекаута/вебхука — кэшируем ненадолго, чтобы вставленные
// в админке ключи применялись без перезапуска, но без похода в БД на каждый запрос.
const CACHE_TTL_MS = 30_000

let cache: { data: IntegrationSettingsData | null; expiresAt: number } | null = null

async function readIntegrationSettings(): Promise<IntegrationSettingsData | null> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.data

  let data: IntegrationSettingsData | null = null
  try {
    const payload = await getPayload({ config })
    data = (await payload.findGlobal({
      slug: 'integration-settings',
      depth: 0
    })) as IntegrationSettingsData
  } catch {
    // БД недоступна или глобал ещё не создан — работаем по переменным окружения.
    data = null
  }

  cache = { data, expiresAt: now + CACHE_TTL_MS }
  return data
}

export async function getYookassaCredentials(): Promise<YookassaCredentials | null> {
  return resolveYookassaCredentials(await readIntegrationSettings())
}

export async function getCdekCredentials(): Promise<CdekCredentials | null> {
  return resolveCdekCredentials(await readIntegrationSettings())
}
