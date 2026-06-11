// Клиент CDEK Integration API 2.0. Креды приходят из getCdekCredentials()
// (глобал «Интеграции» в админке с фоллбэком на CDEK_CLIENT_ID + CDEK_CLIENT_SECRET).
// Секреты и токен — только server-side. Режим test переключает на тестовый контур
// api.edu.cdek.ru (публичные тестовые креды, заказы реально не едут).

import type { CdekCredentials } from './integrationCredentials'

const CDEK_API_PROD = 'https://api.cdek.ru/v2'
const CDEK_API_TEST = 'https://api.edu.cdek.ru/v2'

function cdekBase(creds: CdekCredentials): string {
  return creds.apiMode === 'test' ? CDEK_API_TEST : CDEK_API_PROD
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export type CdekPickupPointDto = {
  code: string
  name: string
  address: string
  city: string
}

// Чистая нормализация пункта выдачи CDEK в форму приложения.
export function normalizeCdekPoint(raw: unknown): CdekPickupPointDto | null {
  if (!isRecord(raw)) return null

  const code = typeof raw.code === 'string' ? raw.code : null
  const name = typeof raw.name === 'string' ? raw.name : null
  const location = isRecord(raw.location) ? raw.location : null
  if (!code || !name || !location) return null

  const city = typeof location.city === 'string' ? location.city : ''
  const address =
    typeof location.address_full === 'string' && location.address_full
      ? location.address_full
      : typeof location.address === 'string'
        ? location.address
        : ''
  if (!address) return null

  return { code, name, address, city }
}

// ---- OAuth (кэш токена в памяти процесса; ключ — креды, чтобы смена ключей в админке
// сразу инвалидировала токен) ----
let tokenCache: { key: string; token: string; expiresAt: number } | null = null

async function getCdekToken(creds: CdekCredentials): Promise<string> {
  const now = Date.now()
  const cacheKey = `${creds.apiMode}:${creds.clientId}:${creds.clientSecret}`
  if (tokenCache && tokenCache.key === cacheKey && tokenCache.expiresAt > now) {
    return tokenCache.token
  }

  const response = await fetch(`${cdekBase(creds)}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret
    })
  })
  if (!response.ok) throw new Error(`CDEK OAuth не удался (${response.status})`)

  const data = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error('CDEK OAuth: пустой токен')

  // Запас 60 секунд до истечения.
  tokenCache = {
    key: cacheKey,
    token: data.access_token,
    expiresAt: now + ((data.expires_in ?? 3599) - 60) * 1000
  }
  return tokenCache.token
}

async function cdekGet(creds: CdekCredentials, path: string): Promise<unknown> {
  const token = await getCdekToken(creds)
  const response = await fetch(`${cdekBase(creds)}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) throw new Error(`CDEK ${path}: ${response.status}`)

  return response.json()
}

export async function resolveCdekCityCode(
  creds: CdekCredentials,
  cityName: string
): Promise<number | null> {
  const data = await cdekGet(creds, `/location/cities?size=1&city=${encodeURIComponent(cityName)}`)
  if (!Array.isArray(data) || data.length === 0) return null

  const first = data[0]
  return isRecord(first) && typeof first.code === 'number' ? first.code : null
}

export async function getCdekDeliveryPoints(
  creds: CdekCredentials,
  cityName: string
): Promise<CdekPickupPointDto[]> {
  const cityCode = await resolveCdekCityCode(creds, cityName)
  if (cityCode === null) return []

  const data = await cdekGet(creds, `/deliverypoints?type=PVZ&city_code=${cityCode}`)
  if (!Array.isArray(data)) return []

  return data
    .map((point) => normalizeCdekPoint(point))
    .filter((point): point is CdekPickupPointDto => point !== null)
    .slice(0, 30)
}
