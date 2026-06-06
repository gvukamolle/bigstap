// Клиент CDEK Integration API 2.0. Активируется при наличии CDEK_CLIENT_ID + CDEK_CLIENT_SECRET.
// Секреты и токен — только server-side. CDEK_API_MODE=test переключает на тестовый контур
// api.edu.cdek.ru (публичные тестовые креды, заказы реально не едут).

const CDEK_API_PROD = 'https://api.cdek.ru/v2'
const CDEK_API_TEST = 'https://api.edu.cdek.ru/v2'

function cdekBase(): string {
  return process.env.CDEK_API_MODE === 'test' ? CDEK_API_TEST : CDEK_API_PROD
}

export function isCdekConfigured(): boolean {
  return Boolean(process.env.CDEK_CLIENT_ID && process.env.CDEK_CLIENT_SECRET)
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

// ---- OAuth (кэш токена в памяти процесса) ----
let tokenCache: { token: string; expiresAt: number } | null = null

async function getCdekToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && tokenCache.expiresAt > now) return tokenCache.token

  const response = await fetch(`${cdekBase()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.CDEK_CLIENT_ID ?? '',
      client_secret: process.env.CDEK_CLIENT_SECRET ?? ''
    })
  })
  if (!response.ok) throw new Error(`CDEK OAuth не удался (${response.status})`)

  const data = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error('CDEK OAuth: пустой токен')

  // Запас 60 секунд до истечения.
  tokenCache = { token: data.access_token, expiresAt: now + ((data.expires_in ?? 3599) - 60) * 1000 }
  return tokenCache.token
}

async function cdekGet(path: string): Promise<unknown> {
  const token = await getCdekToken()
  const response = await fetch(`${cdekBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!response.ok) throw new Error(`CDEK ${path}: ${response.status}`)

  return response.json()
}

export async function resolveCdekCityCode(cityName: string): Promise<number | null> {
  const data = await cdekGet(`/location/cities?size=1&city=${encodeURIComponent(cityName)}`)
  if (!Array.isArray(data) || data.length === 0) return null

  const first = data[0]
  return isRecord(first) && typeof first.code === 'number' ? first.code : null
}

export async function getCdekDeliveryPoints(cityName: string): Promise<CdekPickupPointDto[]> {
  const cityCode = await resolveCdekCityCode(cityName)
  if (cityCode === null) return []

  const data = await cdekGet(`/deliverypoints?type=PVZ&city_code=${cityCode}`)
  if (!Array.isArray(data)) return []

  return data
    .map((point) => normalizeCdekPoint(point))
    .filter((point): point is CdekPickupPointDto => point !== null)
    .slice(0, 30)
}
