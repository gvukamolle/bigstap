// Клиент ЮKassa (Checkout API v3). Креды приходят из getYookassaCredentials()
// (глобал «Интеграции» в админке с фоллбэком на YOOKASSA_SHOP_ID + YOOKASSA_SECRET_KEY).
// Секреты — только server-side (никогда не NEXT_PUBLIC_*). Сумму ЮKassa требует строкой "0.00".
// Вебхук ЮKassa не подписан: защита — IP-фильтр + обязательная перепроверка через getYookassaPayment.
// Самозанятый: с 29.12.2025 ЮKassa не формирует чеки НПД — receipt не отправляем, чек НПД отдельно.

import type { YookassaCredentials } from './integrationCredentials'

const YOOKASSA_API = 'https://api.yookassa.ru/v3'

export function formatYookassaAmount(rubles: number): string {
  return rubles.toFixed(2)
}

// ---- IP allowlist вебхука (IPv4) ----
const ipToInt = (ip: string): number | null => {
  const parts = ip.split('.')
  if (parts.length !== 4) return null

  let result = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    result = result * 256 + n
  }

  return result >>> 0
}

const YOOKASSA_CIDRS: ReadonlyArray<readonly [string, number]> = [
  ['185.71.76.0', 27],
  ['185.71.77.0', 27],
  ['77.75.153.0', 25],
  ['77.75.154.128', 25],
  ['77.75.156.11', 32],
  ['77.75.156.35', 32]
]

const inCidr = (ipInt: number, base: string, bits: number): boolean => {
  const baseInt = ipToInt(base)
  if (baseInt === null) return false

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (ipInt & mask) === (baseInt & mask)
}

// IPv4-проверка диапазонов ЮKassa. IPv6 (2a02:5180::/32) в каркасе не покрыт — для него
// единственная защита это GET-перепроверка платежа (она обязательна в любом случае).
export function isYookassaWebhookIp(ip: string): boolean {
  const ipInt = ipToInt(ip.trim())
  if (ipInt === null) return false

  return YOOKASSA_CIDRS.some(([base, bits]) => inCidr(ipInt, base, bits))
}

// ---- HTTP-клиент ----
const authHeader = (creds: YookassaCredentials): string =>
  `Basic ${Buffer.from(`${creds.shopId}:${creds.secretKey}`).toString('base64')}`

export type YookassaPaymentStatus = 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'

export type YookassaPayment = {
  id: string
  status: YookassaPaymentStatus
  paid: boolean
  amount?: { value: string; currency: string }
  confirmationUrl?: string
  metadata?: Record<string, unknown>
}

type CreatePaymentInput = {
  amountRubles: number
  orderNumber: string
  description: string
  returnUrl: string
  idempotenceKey: string
  metadata?: Record<string, string>
}

function mapPayment(raw: Record<string, unknown>): YookassaPayment {
  const confirmation = raw.confirmation as Record<string, unknown> | undefined

  return {
    id: String(raw.id),
    status: raw.status as YookassaPaymentStatus,
    paid: raw.paid === true,
    amount: raw.amount as YookassaPayment['amount'],
    confirmationUrl:
      typeof confirmation?.confirmation_url === 'string' ? confirmation.confirmation_url : undefined,
    metadata: (raw.metadata as Record<string, unknown>) ?? undefined
  }
}

export async function createYookassaPayment(
  creds: YookassaCredentials,
  input: CreatePaymentInput
): Promise<YookassaPayment> {
  const response = await fetch(`${YOOKASSA_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(creds),
      'Idempotence-Key': input.idempotenceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: { value: formatYookassaAmount(input.amountRubles), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: input.returnUrl },
      description: input.description,
      metadata: { orderNumber: input.orderNumber, ...input.metadata }
    })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`ЮKassa: создание платежа не удалось (${response.status}): ${text}`)
  }

  return mapPayment((await response.json()) as Record<string, unknown>)
}

export async function getYookassaPayment(
  creds: YookassaCredentials,
  paymentId: string
): Promise<YookassaPayment> {
  const response = await fetch(`${YOOKASSA_API}/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: { Authorization: authHeader(creds) }
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`ЮKassa: получение платежа не удалось (${response.status}): ${text}`)
  }

  return mapPayment((await response.json()) as Record<string, unknown>)
}
