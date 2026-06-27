# Ручной чекаут (СБП + PDF-чек + Make→Telegram) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить автоплатёж ЮKassa на ручной приём оплаты по СБП: покупатель платит по статичному QR, прикладывает PDF-чек, а заказ + чек уходят в Make (webhook), который пересылает их в Telegram владельцу.

**Architecture:** Один multipart `POST /api/checkout` (поля + PDF). Сервер пересчитывает сумму, парсит текстовый слой чека (L1-проверка, без OCR), создаёт `Order` в Payload (источник правды) и best-effort отправляет в Make. Чистая логика — в `domain/`, IO (PDF-текст, Make) — в `lib/`, схема — в `payload/`.

**Tech Stack:** Next.js 16 (App Router, route handlers), React 19, Payload CMS 3.84, TypeScript 6 (strict, ESM), Vitest 4, `unpdf` (извлечение текста PDF, чистый JS).

**Спецификация:** [docs/superpowers/specs/2026-06-27-manual-sbp-checkout-design.md](../specs/2026-06-27-manual-sbp-checkout-design.md)

**Команды проверки:** `npm run typecheck` · `npm test` · `npm run lint` · `npm run build`

---

## Структура файлов

**Создать:**
- `src/domain/delivery.ts` — регион доставки и тариф (чистая логика).
- `src/domain/receipt.ts` — парсер и проверка чека (чистая логика).
- `src/lib/receiptFile.ts` — валидация PDF-файла (сигнатура + размер).
- `src/lib/receiptText.ts` — извлечение текста из PDF (`unpdf`, IO).
- `src/lib/make.ts` — отправка заказа в Make webhook (IO).
- `src/components/PaymentModal.tsx` — модалка оплаты (QR + инструкция + загрузка PDF).
- тесты: `tests/domain/delivery.test.ts`, `tests/domain/receipt.test.ts`,
  `tests/app/receipt-file.test.ts`, `tests/app/make-config.test.ts`.

**Изменить:**
- `src/domain/checkout.ts` — форма без email/city, с `telegram` + `deliveryRegion` + `cdekPickupRaw`.
- `tests/domain/checkout.test.ts` — под новую форму.
- `src/lib/integrationCredentials.ts` — `resolveMakeConfig`.
- `src/lib/integrationSettings.ts` — `getMakeConfig`.
- `src/payload/collections/Orders.ts` — поля заказа под ручной флоу.
- `src/payload/globals/IntegrationSettings.ts` — убрать ЮKassa, добавить Make + СБП.
- `src/app/api/checkout/route.ts` — переписать на multipart + Make.
- `src/components/CheckoutClient.tsx` — поля формы + вызов модалки + multipart-сабмит.
- `src/data/legal.ts` — обработчики ПДн (флаг владельцу).
- `package.json` — зависимость `unpdf`.

**Удалить:**
- `src/lib/yookassa.ts`, `src/app/api/yookassa/route.ts`, `src/app/api/yookassa/webhook/route.ts`,
  `tests/app/yookassa.test.ts`, ЮKassa-логику в `src/app/(site)/checkout/return/page.tsx`.

---

## Task 1: Доставка — регион и тариф (чистый домен, TDD)

**Files:**
- Create: `src/domain/delivery.ts`
- Test: `tests/domain/delivery.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// tests/domain/delivery.test.ts
import { describe, expect, it } from 'vitest'

import {
  DELIVERY_COSTS,
  getDeliveryCost,
  isDeliveryRegion,
  type DeliveryRegion
} from '../../src/domain/delivery'

describe('delivery domain', () => {
  it('exposes fixed tariffs for Moscow and Russia', () => {
    expect(DELIVERY_COSTS).toEqual({ moscow: 400, russia: 600 })
  })

  it('returns the tariff for a region', () => {
    expect(getDeliveryCost('moscow')).toBe(400)
    expect(getDeliveryCost('russia')).toBe(600)
  })

  it('recognises valid regions and rejects others', () => {
    expect(isDeliveryRegion('moscow')).toBe(true)
    expect(isDeliveryRegion('russia')).toBe(true)
    expect(isDeliveryRegion('spb')).toBe(false)
    expect(isDeliveryRegion(null)).toBe(false)
  })

  it('narrows unknown input through the guard', () => {
    const raw: unknown = 'russia'
    if (isDeliveryRegion(raw)) {
      const region: DeliveryRegion = raw
      expect(getDeliveryCost(region)).toBe(600)
    }
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- delivery`
Expected: FAIL — `Cannot find module '../../src/domain/delivery'`.

- [ ] **Step 3: Реализовать модуль**

```ts
// src/domain/delivery.ts

export type DeliveryRegion = 'moscow' | 'russia'

// Фиксированные тарифы доставки СДЭК (целые рубли). Захардкожены в домене — выносить в админку
// будем, только если тарифы начнут меняться (YAGNI).
export const DELIVERY_COSTS: Record<DeliveryRegion, number> = {
  moscow: 400,
  russia: 600
}

export const DELIVERY_REGION_LABELS: Record<DeliveryRegion, string> = {
  moscow: 'Москва',
  russia: 'Россия'
}

export function isDeliveryRegion(value: unknown): value is DeliveryRegion {
  return value === 'moscow' || value === 'russia'
}

export function getDeliveryCost(region: DeliveryRegion): number {
  return DELIVERY_COSTS[region]
}
```

- [ ] **Step 4: Запустить — зелёный**

Run: `npm test -- delivery`
Expected: PASS (4 теста).

- [ ] **Step 5: Коммит**

```bash
git add src/domain/delivery.ts tests/domain/delivery.test.ts
git commit -m "feat: тарифы доставки по регионам (Москва/Россия)"
```

---

## Task 2: Парсер и проверка чека L1 (чистый домен, TDD)

**Files:**
- Create: `src/domain/receipt.ts`
- Test: `tests/domain/receipt.test.ts`

Назначение: из текста чека достать сумму(ы), дату, получателя, ID операции и сравнить с ожидаемым.
Не блокирует заказ — только формирует флаги. Парсинг проверяет содержимое, не подлинность.

- [ ] **Step 1: Написать падающий тест**

```ts
// tests/domain/receipt.test.ts
import { describe, expect, it } from 'vitest'

import { checkReceipt, parseReceipt } from '../../src/domain/receipt'

const sberText = `
Чек по операции
Сумма 4 600 ₽
Дата операции 27.06.2026 14:32:10 (МСК)
Получатель Степан Г.
Счёт получателя +7 (985) ••• •• 35
СБП
Идентификатор операции B1234567890123456789012345678901
`

const tinkoffText = `
Квитанция · Перевод по СБП
Сумма перевода: 4 600,00 ₽
Комиссия: 0,00 ₽
Дата и время 27.06.2026 14:35
Получатель: Степан Григорьевич Г
Телефон получателя +7 985 ***-**-35
Номер операции 1234567890
`

describe('receipt parser', () => {
  it('extracts amount candidates, date and operation id from a Sber-style receipt', () => {
    const parsed = parseReceipt(sberText)
    expect(parsed.amounts).toContain(4600)
    expect(parsed.dateISO).toBe('2026-06-27')
    expect(parsed.operationId).toBe('B1234567890123456789012345678901')
    expect(parsed.recipientRaw).toContain('Степан')
  })

  it('handles comma decimals and masked phone (Tinkoff-style)', () => {
    const parsed = parseReceipt(tinkoffText)
    expect(parsed.amounts).toContain(4600)
    expect(parsed.operationId).toBe('1234567890')
  })

  it('returns empty result for blank text (scan without text layer)', () => {
    const parsed = parseReceipt('')
    expect(parsed.amounts).toEqual([])
    expect(parsed.dateISO).toBeNull()
  })
})

describe('receipt check', () => {
  const now = new Date('2026-06-27T15:00:00Z')

  it('passes when amount, freshness and recipient match', () => {
    const parsed = parseReceipt(sberText)
    const check = checkReceipt(parsed, {
      expectedAmount: 4600,
      expectedRecipientName: 'Степан',
      expectedPhoneTail: '35',
      now
    })
    expect(check.amountMatches).toBe(true)
    expect(check.dateFresh).toBe(true)
    expect(check.recipientMatches).toBe('yes')
  })

  it('flags a wrong amount', () => {
    const parsed = parseReceipt(sberText)
    const check = checkReceipt(parsed, { expectedAmount: 9999, now })
    expect(check.amountMatches).toBe(false)
  })

  it('flags a stale receipt older than 24h', () => {
    const parsed = parseReceipt(sberText)
    const check = checkReceipt(parsed, {
      expectedAmount: 4600,
      now: new Date('2026-06-29T15:00:00Z')
    })
    expect(check.dateFresh).toBe(false)
  })

  it('reports recipient as unknown when nothing parsed', () => {
    const check = checkReceipt(parseReceipt(''), { expectedAmount: 4600, now })
    expect(check.recipientMatches).toBe('unknown')
    expect(check.amountMatches).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- receipt`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать модуль**

```ts
// src/domain/receipt.ts

export type ReceiptParseResult = {
  amounts: number[] // все найденные рублёвые суммы (кандидаты)
  amount: number | null // самый вероятный платёж (максимум из кандидатов)
  dateISO: string | null // дата операции YYYY-MM-DD
  recipientRaw: string | null // сырая строка про получателя
  operationId: string | null // ID/номер операции СБП
}

export type RecipientMatch = 'yes' | 'no' | 'unknown'

export type ReceiptCheckExpectation = {
  expectedAmount: number
  expectedRecipientName?: string | null
  expectedPhoneTail?: string | null
  now: Date
}

export type ReceiptCheck = {
  parsedAmount: number | null
  amountMatches: boolean
  parsedDate: string | null
  dateFresh: boolean
  recipientMatches: RecipientMatch
  operationId: string | null
}

const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000

// Нормализуем «1 200,50» / «1 200.50» / «1 200» → 1200 (целые рубли; копейки отбрасываем).
function normaliseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.')
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value)) return null
  return Math.round(value)
}

export function parseReceipt(text: string): ReceiptParseResult {
  if (!text || !text.trim()) {
    return { amounts: [], amount: null, dateISO: null, recipientRaw: null, operationId: null }
  }

  // Суммы: число (с пробелами-разделителями и копейками) перед знаком рубля.
  const amountRe = /(\d[\d\s ]*(?:[.,]\d{1,2})?)\s*(?:₽|руб|RUB|р\.)/gi
  const amounts: number[] = []
  for (const match of text.matchAll(amountRe)) {
    const value = normaliseAmount(match[1])
    if (value !== null && value > 0) amounts.push(value)
  }

  // Дата dd.mm.yyyy → ISO.
  const dateMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  const dateISO = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null

  // Получатель: строка после «Получатель …» до перевода строки.
  const recipientMatch = text.match(/Получатель[:\s]+([^\n]+)/i)
  const recipientRaw = recipientMatch ? recipientMatch[1].trim() : null

  // ID/номер операции: после «операции …» — буквенно-цифровой токен ≥ 6 символов.
  const opMatch = text.match(/операци[ияй][:\s]+([A-Za-zА-Яа-я0-9]{6,})/i)
  const operationId = opMatch ? opMatch[1] : null

  return {
    amounts,
    amount: amounts.length > 0 ? Math.max(...amounts) : null,
    dateISO,
    recipientRaw,
    operationId
  }
}

export function checkReceipt(
  parsed: ReceiptParseResult,
  expectation: ReceiptCheckExpectation
): ReceiptCheck {
  const amountMatches = parsed.amounts.includes(expectation.expectedAmount)

  let dateFresh = false
  if (parsed.dateISO) {
    const parsedTime = new Date(`${parsed.dateISO}T00:00:00Z`).getTime()
    const diff = expectation.now.getTime() - parsedTime
    dateFresh = diff >= -FRESH_WINDOW_MS && diff <= FRESH_WINDOW_MS
  }

  let recipientMatches: RecipientMatch = 'unknown'
  if (parsed.recipientRaw) {
    const haystack = parsed.recipientRaw.toLowerCase()
    const nameOk =
      !!expectation.expectedRecipientName &&
      haystack.includes(expectation.expectedRecipientName.toLowerCase())
    const tailOk =
      !!expectation.expectedPhoneTail &&
      parsed.recipientRaw.replace(/\D/g, '').endsWith(expectation.expectedPhoneTail)
    recipientMatches = nameOk || tailOk ? 'yes' : 'no'
  }

  return {
    parsedAmount: parsed.amount,
    amountMatches,
    parsedDate: parsed.dateISO,
    dateFresh,
    recipientMatches,
    operationId: parsed.operationId
  }
}
```

> Примечание про `dateFresh`: дата чека идёт без часового пояса и только до дня, поэтому окно
> свежести считаем симметрично ±24ч от `now` (грубо, для анти-replay этого достаточно).

- [ ] **Step 4: Запустить — зелёный**

Run: `npm test -- receipt`
Expected: PASS (7 тестов).

- [ ] **Step 5: Коммит**

```bash
git add src/domain/receipt.ts tests/domain/receipt.test.ts
git commit -m "feat: L1-парсер и проверка PDF-чека (сумма/дата/получатель/ID)"
```

---

## Task 3: Валидация PDF-файла (lib, TDD)

**Files:**
- Create: `src/lib/receiptFile.ts`
- Test: `tests/app/receipt-file.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// tests/app/receipt-file.test.ts
import { describe, expect, it } from 'vitest'

import { MAX_RECEIPT_BYTES, validateReceiptPdf } from '../../src/lib/receiptFile'

const pdfHeader = Buffer.from('%PDF-1.7\n%âãÏ\n')

describe('receipt file validation', () => {
  it('accepts a buffer that starts with the PDF signature', () => {
    expect(validateReceiptPdf(pdfHeader)).toEqual({ ok: true })
  })

  it('rejects a non-PDF buffer regardless of declared type', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    expect(validateReceiptPdf(png)).toEqual({ ok: false, error: 'not_pdf' })
  })

  it('rejects an oversized buffer', () => {
    const big = Buffer.concat([pdfHeader, Buffer.alloc(MAX_RECEIPT_BYTES)])
    expect(validateReceiptPdf(big)).toEqual({ ok: false, error: 'too_large' })
  })

  it('rejects an empty buffer', () => {
    expect(validateReceiptPdf(Buffer.alloc(0))).toEqual({ ok: false, error: 'not_pdf' })
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- receipt-file`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать модуль**

```ts
// src/lib/receiptFile.ts

// PDF-чек принимаем по магической сигнатуре, а не по Content-Type (его легко подделать).
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024 // 10 МБ

const PDF_SIGNATURE = Buffer.from('%PDF-')

export type ReceiptFileError = 'not_pdf' | 'too_large'

export function validateReceiptPdf(buffer: Buffer): { ok: true } | { ok: false; error: ReceiptFileError } {
  if (buffer.length > MAX_RECEIPT_BYTES) return { ok: false, error: 'too_large' }
  if (buffer.length < PDF_SIGNATURE.length) return { ok: false, error: 'not_pdf' }
  if (!buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    return { ok: false, error: 'not_pdf' }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Запустить — зелёный**

Run: `npm test -- receipt-file`
Expected: PASS (4 теста).

- [ ] **Step 5: Коммит**

```bash
git add src/lib/receiptFile.ts tests/app/receipt-file.test.ts
git commit -m "feat: валидация PDF-чека по сигнатуре и размеру"
```

---

## Task 4: Конфиг Make — резолвер кредов (lib, TDD)

**Files:**
- Modify: `src/lib/integrationCredentials.ts`
- Test: `tests/app/make-config.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
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
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- make-config`
Expected: FAIL — `resolveMakeConfig` не экспортируется.

- [ ] **Step 3: Реализовать (дополнить файл)**

Добавить в `src/lib/integrationCredentials.ts` тип в `IntegrationSettingsData` и функцию.
В тип `IntegrationSettingsData` (после блока `cdek`) добавить:

```ts
  make?: {
    webhookUrl?: string | null
    webhookSecret?: string | null
  } | null
```

В конец файла добавить:

```ts
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
```

- [ ] **Step 4: Запустить — зелёный**

Run: `npm test -- make-config`
Expected: PASS (4 теста).

- [ ] **Step 5: Добавить кэш-ридер в `src/lib/integrationSettings.ts`**

Дополнить импорт из `./integrationCredentials` типом `MakeConfig` и функцией `resolveMakeConfig`,
затем добавить в конец файла:

```ts
export async function getMakeConfig(): Promise<MakeConfig | null> {
  return resolveMakeConfig(await readIntegrationSettings())
}
```

- [ ] **Step 6: Проверить типы и коммит**

Run: `npm run typecheck`
Expected: без ошибок.

```bash
git add src/lib/integrationCredentials.ts src/lib/integrationSettings.ts tests/app/make-config.test.ts
git commit -m "feat: резолвер и кэш-ридер конфига Make webhook"
```

---

## Task 5: Извлечение текста PDF и отправка в Make (lib IO)

**Files:**
- Create: `src/lib/receiptText.ts`, `src/lib/make.ts`
- Modify: `package.json` (добавить `unpdf`)

IO-границы — без юнит-тестов (проверяются в интеграции на Task 8). Держим узкими и без логики.

- [ ] **Step 1: Установить зависимость**

Run: `npm install unpdf --legacy-peer-deps`
Expected: `unpdf` появляется в `dependencies` package.json.

- [ ] **Step 2: Извлечение текста**

```ts
// src/lib/receiptText.ts
import { extractText, getDocumentProxy } from 'unpdf'

// Достаём текстовый слой PDF. Если слоя нет (скан/картинка) или файл битый — возвращаем ''
// (вызывающий трактует это как «не распознано», заказ не блокируется).
export async function extractReceiptText(pdf: Buffer): Promise<string> {
  try {
    const doc = await getDocumentProxy(new Uint8Array(pdf))
    const { text } = await extractText(doc, { mergePages: true })
    return typeof text === 'string' ? text : Array.isArray(text) ? text.join('\n') : ''
  } catch {
    return ''
  }
}
```

- [ ] **Step 3: Отправка в Make**

```ts
// src/lib/make.ts
import type { MakeConfig } from './integrationCredentials'

const TIMEOUT_MS = 10_000

async function postOnce(config: MakeConfig, form: FormData): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const headers: Record<string, string> = {}
    if (config.webhookSecret) headers['X-Bigstep-Secret'] = config.webhookSecret
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers,
      body: form,
      signal: controller.signal
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

// Шлём заказ + PDF в Make одним multipart-запросом. Форматирование текста и доставку в Telegram
// делает сценарий Make. Best-effort: один ретрай, наружу — только { ok }.
export async function sendOrderToMake(
  config: MakeConfig,
  input: { payloadJson: string; pdf: Buffer; filename: string }
): Promise<{ ok: boolean }> {
  const buildForm = () => {
    const form = new FormData()
    form.set('payload', input.payloadJson)
    form.set('receipt', new Blob([input.pdf], { type: 'application/pdf' }), input.filename)
    return form
  }

  if (await postOnce(config, buildForm())) return { ok: true }
  return { ok: await postOnce(config, buildForm()) }
}
```

- [ ] **Step 4: Проверить типы, линт, сборку**

Run: `npm run typecheck && npm run lint`
Expected: без ошибок.

- [ ] **Step 5: Коммит**

```bash
git add package.json package-lock.json src/lib/receiptText.ts src/lib/make.ts
git commit -m "feat: извлечение текста PDF (unpdf) и отправка заказа в Make"
```

---

## Task 6: Сквозной cutover — домен формы, схема, роут, удаление ЮKassa

> Это атомарный переход: типы `domain/checkout.ts` меняются, поэтому роут, схема и UI правятся
> вместе. Коммитим один раз, когда `typecheck`+`test`+`build` зелёные. UI вынесен в Task 7,
> но между Task 6 и Task 7 сборка будет временно красной — выполняйте их подряд, коммит в конце Task 7.

**Files:**
- Modify: `src/domain/checkout.ts`, `tests/domain/checkout.test.ts`
- Modify: `src/payload/collections/Orders.ts`
- Modify: `src/payload/globals/IntegrationSettings.ts`
- Modify: `src/app/api/checkout/route.ts`
- Delete: `src/lib/yookassa.ts`, `src/app/api/yookassa/route.ts`, `src/app/api/yookassa/webhook/route.ts`, `tests/app/yookassa.test.ts`
- Modify: `src/app/(site)/checkout/return/page.tsx`

- [ ] **Step 1: Переписать `src/domain/checkout.ts`**

```ts
import { isDeliveryRegion, type DeliveryRegion } from './delivery'

export type CustomerDetails = {
  fullName: string
  phone: string
  telegram: string
}

export type CheckoutConsent = {
  offerAccepted: boolean
  privacyAccepted: boolean
}

export type CheckoutDraft = {
  customer: CustomerDetails
  deliveryRegion: DeliveryRegion | null
  cdekPickupRaw: string
  consent: CheckoutConsent
}

export type CheckoutValidationField =
  | 'fullName'
  | 'phone'
  | 'telegram'
  | 'deliveryRegion'
  | 'cdekPickupRaw'
  | 'privacyConsent'
  | 'offerConsent'

export type CheckoutValidationError = {
  field: CheckoutValidationField
  code: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  errors: CheckoutValidationError[]
  messages: string[]
}

function isValidPhone(phone: string): boolean {
  const trimmedPhone = phone.trim()
  const digits = trimmedPhone.replace(/\D/g, '')
  const plusCount = (trimmedPhone.match(/\+/g) ?? []).length

  return (
    digits.length >= 10 &&
    /^[+\d\s()-]+$/.test(trimmedPhone) &&
    plusCount <= 1 &&
    (plusCount === 0 || trimmedPhone.startsWith('+'))
  )
}

// Telegram: @username (5–32 символа, буквы/цифры/_) или ссылка t.me/username.
function isValidTelegram(value: string): boolean {
  const trimmed = value.trim().replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '@')
  const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  return /^[A-Za-z0-9_]{5,32}$/.test(handle)
}

export function validateCheckoutDraft(draft: CheckoutDraft): ValidationResult {
  const errors: CheckoutValidationError[] = []

  if (draft.customer.fullName.trim().length < 2) {
    errors.push({ field: 'fullName', code: 'required_full_name', message: 'Укажите имя и фамилию' })
  }
  if (!isValidPhone(draft.customer.phone)) {
    errors.push({ field: 'phone', code: 'invalid_phone', message: 'Укажите телефон' })
  }
  if (!isValidTelegram(draft.customer.telegram)) {
    errors.push({
      field: 'telegram',
      code: 'invalid_telegram',
      message: 'Укажите Telegram в формате @username'
    })
  }
  if (!isDeliveryRegion(draft.deliveryRegion)) {
    errors.push({
      field: 'deliveryRegion',
      code: 'required_delivery_region',
      message: 'Выберите регион доставки'
    })
  }
  if (draft.cdekPickupRaw.trim().length < 5) {
    errors.push({
      field: 'cdekPickupRaw',
      code: 'required_cdek_pickup',
      message: 'Укажите пункт выдачи СДЭК'
    })
  }
  if (!draft.consent?.privacyAccepted) {
    errors.push({
      field: 'privacyConsent',
      code: 'required_privacy_consent',
      message: 'Подтвердите согласие на обработку персональных данных'
    })
  }
  if (!draft.consent?.offerAccepted) {
    errors.push({
      field: 'offerConsent',
      code: 'required_offer_consent',
      message: 'Подтвердите согласие с условиями оферты'
    })
  }

  return { valid: errors.length === 0, errors, messages: errors.map((e) => e.message) }
}
```

- [ ] **Step 2: Переписать `tests/domain/checkout.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import type { CheckoutDraft, CustomerDetails } from '../../src/domain/checkout'
import { validateCheckoutDraft } from '../../src/domain/checkout'

const validCustomer: CustomerDetails = {
  fullName: 'Иван Иванов',
  phone: '+79990000000',
  telegram: '@ivanov'
}

const baseDraft: CheckoutDraft = {
  customer: validCustomer,
  deliveryRegion: 'moscow',
  cdekPickupRaw: 'Москва, бул. Адмирала Ушакова, 18Б',
  consent: { offerAccepted: true, privacyAccepted: true }
}

describe('checkout domain', () => {
  it('requires fullName, telegram, region and pickup', () => {
    const result = validateCheckoutDraft({
      ...baseDraft,
      customer: { ...validCustomer, fullName: '', telegram: 'no' },
      deliveryRegion: null,
      cdekPickupRaw: ''
    })
    expect(result.valid).toBe(false)
    expect(result.messages).toContain('Укажите имя и фамилию')
    expect(result.messages).toContain('Укажите Telegram в формате @username')
    expect(result.messages).toContain('Выберите регион доставки')
    expect(result.messages).toContain('Укажите пункт выдачи СДЭК')
  })

  it('accepts @username and t.me link forms of telegram', () => {
    expect(validateCheckoutDraft({ ...baseDraft, customer: { ...validCustomer, telegram: 'ivanov_99' } }).valid).toBe(true)
    expect(validateCheckoutDraft({ ...baseDraft, customer: { ...validCustomer, telegram: 'https://t.me/ivanov_99' } }).valid).toBe(true)
  })

  it('rejects invalid phone characters', () => {
    const result = validateCheckoutDraft({
      ...baseDraft,
      customer: { ...validCustomer, phone: 'abc<script>' }
    })
    expect(result.errors).toEqual([{ field: 'phone', code: 'invalid_phone', message: 'Укажите телефон' }])
  })

  it('requires privacy and offer consent', () => {
    const result = validateCheckoutDraft({
      ...baseDraft,
      consent: { offerAccepted: false, privacyAccepted: false }
    })
    expect(result.messages).toContain('Подтвердите согласие на обработку персональных данных')
    expect(result.messages).toContain('Подтвердите согласие с условиями оферты')
  })

  it('accepts a complete draft', () => {
    expect(validateCheckoutDraft(baseDraft)).toEqual({ valid: true, errors: [], messages: [] })
  })
})
```

- [ ] **Step 3: Запустить домен-тесты**

Run: `npm test -- checkout delivery receipt`
Expected: PASS.

- [ ] **Step 4: Обновить схему `src/payload/collections/Orders.ts`**

Изменения в массиве `fields`:
1. **Удалить** поля: `customerEmail`, `customerCity`, `deliveryMethod`, `cdekPickupCode`,
   `cdekPickupName`, `cdekPickupCity`, `cdekPickupAddress`, `paymentId`.
2. **Заменить** список `options` у `status`: убрать `pending_payment` и `payment_failed`,
   добавить `payment_review`; сменить `defaultValue` на `'payment_review'`:

```ts
      defaultValue: 'payment_review',
      options: [
        { label: 'Черновик', value: 'draft' },
        { label: 'Проверка оплаты', value: 'payment_review' },
        { label: 'Оплачен', value: 'paid' },
        { label: 'В обработке', value: 'processing' },
        { label: 'Готов к СДЭК', value: 'ready_for_cdek' },
        { label: 'Отправлен', value: 'shipped' },
        { label: 'Завершен', value: 'completed' },
        { label: 'Отменен', value: 'cancelled' },
        { label: 'Возврат', value: 'refunded' }
      ]
```

3. **Добавить** новые поля (после `customerPhone`):

```ts
    {
      name: 'customerTelegram',
      type: 'text',
      label: 'Telegram клиента',
      required: true
    },
    {
      name: 'deliveryRegion',
      type: 'select',
      label: 'Регион доставки',
      required: true,
      options: [
        { label: 'Москва', value: 'moscow' },
        { label: 'Россия', value: 'russia' }
      ]
    },
    {
      name: 'cdekPickupRaw',
      type: 'text',
      label: 'Пункт выдачи СДЭК',
      required: true
    },
    {
      name: 'notificationSent',
      type: 'checkbox',
      label: 'Отправлено в Make/Telegram',
      defaultValue: false
    },
    {
      name: 'receiptCheck',
      type: 'group',
      label: 'Авто-проверка чека',
      admin: { description: 'Результат разбора PDF-чека. Не подтверждает оплату — сверь по факту поступления.' },
      fields: [
        { name: 'parsedAmount', type: 'number', label: 'Сумма из чека' },
        { name: 'amountMatches', type: 'checkbox', label: 'Сумма совпала', defaultValue: false },
        { name: 'parsedDate', type: 'text', label: 'Дата из чека' },
        { name: 'dateFresh', type: 'checkbox', label: 'Чек свежий', defaultValue: false },
        {
          name: 'recipientMatches',
          type: 'select',
          label: 'Получатель',
          defaultValue: 'unknown',
          options: [
            { label: 'Совпал', value: 'yes' },
            { label: 'Не совпал', value: 'no' },
            { label: 'Не распознан', value: 'unknown' }
          ]
        },
        { name: 'operationId', type: 'text', label: 'ID операции СБП' },
        { name: 'rawSummary', type: 'textarea', label: 'Итог проверки' }
      ]
    },
```

- [ ] **Step 5: Обновить глобал `src/payload/globals/IntegrationSettings.ts`**

Удалить группу `yookassa` (целиком объект с `name: 'yookassa'`). Перед группой `cdek` добавить
группы `make` и `sbp`:

```ts
    {
      name: 'make',
      type: 'group',
      label: 'Make (уведомление о заказе)',
      admin: {
        description:
          'Custom webhook сценария Make: получает заказ + PDF-чек и пересылает в Telegram. Бот и чат настраиваются внутри Make.'
      },
      fields: [
        { name: 'webhookUrl', type: 'text', label: 'URL вебхука Make', admin: { placeholder: 'https://hook.eu2.make.com/…' } },
        { name: 'webhookSecret', type: 'text', label: 'Секрет вебхука (опц.)', admin: { description: 'Шлём заголовком X-Bigstep-Secret; проверь его в сценарии Make.' } }
      ]
    },
    {
      name: 'sbp',
      type: 'group',
      label: 'СБП (приём оплаты)',
      fields: [
        { name: 'qrImage', type: 'upload', relationTo: 'media', label: 'QR СБП (картинка)' },
        { name: 'recipientHint', type: 'text', label: 'Подпись получателя в окне оплаты', admin: { placeholder: 'Степан Г., Т-Банк' } },
        { name: 'expectedRecipientName', type: 'text', label: 'Эталон имени получателя (для сверки чека)' },
        { name: 'expectedPhoneTail', type: 'text', label: 'Последние цифры телефона/счёта (для сверки)' }
      ]
    },
```

Также в `admin.description` глобала заменить «Ключи ЮKassa и СДЭК» → «Make, СБП и СДЭК».

- [ ] **Step 6: Переписать `src/app/api/checkout/route.ts`** на multipart + Make

```ts
import config from '@payload-config'
import { getPayload } from 'payload'

import { NextResponse, type NextRequest } from 'next/server'

import { calculateCartTotals, sanitizeCart } from '@/domain/cart'
import { getDeliveryCost, isDeliveryRegion } from '@/domain/delivery'
import { checkReceipt, parseReceipt } from '@/domain/receipt'
import { validateCheckoutDraft, type CheckoutConsent, type CustomerDetails } from '@/domain/checkout'
import { getCatalogProducts } from '@/lib/catalog'
import { getMakeConfig } from '@/lib/integrationSettings'
import { sendOrderToMake } from '@/lib/make'
import { validateReceiptPdf } from '@/lib/receiptFile'
import { extractReceiptText } from '@/lib/receiptText'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type IncomingItem = { productSlug: string; size: string | null; quantity: number }

const json = (data: unknown, status = 200) => NextResponse.json(data, { status })

function parseCustomer(value: unknown): CustomerDetails | null {
  if (typeof value !== 'object' || value === null) return null
  const { fullName, phone, telegram } = value as Record<string, unknown>
  if (typeof fullName !== 'string' || typeof phone !== 'string' || typeof telegram !== 'string') {
    return null
  }
  return { fullName, phone, telegram }
}

function parseItems(value: unknown): IncomingItem[] {
  if (!Array.isArray(value)) return []
  const items: IncomingItem[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const { productSlug, size, quantity } = entry as Record<string, unknown>
    if (typeof productSlug !== 'string') continue
    if (!(typeof size === 'string' || size === null)) continue
    if (typeof quantity !== 'number') continue
    items.push({ productSlug, size, quantity })
  }
  return items
}

function parseConsent(value: unknown): CheckoutConsent {
  if (typeof value !== 'object' || value === null) return { offerAccepted: false, privacyAccepted: false }
  const v = value as Record<string, unknown>
  return { offerAccepted: v.offerAccepted === true, privacyAccepted: v.privacyAccepted === true }
}

export async function POST(request: NextRequest) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ ok: false, error: 'Ожидается multipart/form-data.' }, 400)
  }

  // Поля заказа приходят JSON-строкой в поле "payload", PDF-чек — в поле "receipt".
  let body: unknown
  try {
    body = JSON.parse(String(form.get('payload') ?? ''))
  } catch {
    return json({ ok: false, error: 'Некорректные данные заказа.' }, 400)
  }
  if (typeof body !== 'object' || body === null) return json({ ok: false, error: 'Пустой запрос.' }, 400)
  const data = body as Record<string, unknown>

  const customer = parseCustomer(data.customer)
  const deliveryRegion = data.deliveryRegion
  const cdekPickupRaw = typeof data.cdekPickupRaw === 'string' ? data.cdekPickupRaw : ''
  const consent = parseConsent(data.consent)
  const incomingItems = parseItems(data.items)

  if (!customer) return json({ ok: false, error: 'Некорректные контактные данные.' }, 400)
  if (incomingItems.length === 0) return json({ ok: false, error: 'Корзина пуста.' }, 400)
  if (!isDeliveryRegion(deliveryRegion)) return json({ ok: false, error: 'Выберите регион доставки.' }, 422)

  const validation = validateCheckoutDraft({ customer, deliveryRegion, cdekPickupRaw, consent })
  if (!validation.valid) {
    return json({ ok: false, error: 'Проверьте форму оформления.', fields: validation.errors }, 422)
  }

  // PDF-чек обязателен.
  const receipt = form.get('receipt')
  if (!(receipt instanceof File)) return json({ ok: false, error: 'Приложите PDF-чек об оплате.' }, 422)
  const pdf = Buffer.from(await receipt.arrayBuffer())
  const fileCheck = validateReceiptPdf(pdf)
  if (!fileCheck.ok) {
    const message = fileCheck.error === 'too_large' ? 'Чек больше 10 МБ.' : 'Чек должен быть PDF.'
    return json({ ok: false, error: message }, 422)
  }

  // Сумма — со стороны сервера: корзина пересобирается из каталога, доставка — по тарифу региона.
  const products = await getCatalogProducts()
  const cart = sanitizeCart(
    incomingItems.map((item) => ({ productSlug: item.productSlug, quantity: item.quantity, size: item.size })),
    products
  )
  if (cart.length === 0) return json({ ok: false, error: 'Товары недоступны или закончились.' }, 409)

  const deliveryTotal = getDeliveryCost(deliveryRegion)
  const totals = calculateCartTotals(cart, deliveryTotal)

  const payload = await getPayload({ config })
  const slugs = [...new Set(cart.map((item) => item.productSlug))]
  const foundProducts = await payload.find({ collection: 'products', where: { slug: { in: slugs } }, limit: 100, depth: 0 })
  const idBySlug = new Map<string, number>()
  for (const doc of foundProducts.docs) {
    if (typeof doc.slug === 'string') idBySlug.set(doc.slug, doc.id)
  }
  const missing = slugs.filter((slug) => !idBySlug.has(slug))
  if (missing.length > 0) {
    return json({ ok: false, error: `Нет товара в каталоге: ${missing.join(', ')}.` }, 409)
  }

  const items = cart.map((item) => ({
    product: idBySlug.get(item.productSlug) as number,
    productTitle: item.title,
    productSlug: item.productSlug,
    sizeLabel: item.size ?? undefined,
    quantity: item.quantity,
    unitPrice: item.price,
    lineTotal: item.price * item.quantity,
    saleStatus: item.saleStatus === 'preorder' ? ('preorder' as const) : ('in_stock' as const)
  }))

  // L1-проверка чека (не блокирует заказ).
  const makeConfig = await getMakeConfig()
  const settingsForCheck = await payload.findGlobal({ slug: 'integration-settings', depth: 0 }).catch(() => null)
  const sbp = (settingsForCheck as { sbp?: { expectedRecipientName?: string; expectedPhoneTail?: string } } | null)?.sbp
  const parsed = parseReceipt(await extractReceiptText(pdf))
  const check = checkReceipt(parsed, {
    expectedAmount: totals.orderTotal,
    expectedRecipientName: sbp?.expectedRecipientName ?? null,
    expectedPhoneTail: sbp?.expectedPhoneTail ?? null,
    now: new Date()
  })

  // Анти-replay: тот же чек (по ID операции) не должен пройти дважды.
  let duplicateOperation = false
  if (parsed.operationId) {
    const prior = await payload
      .find({
        collection: 'orders',
        where: { 'receiptCheck.operationId': { equals: parsed.operationId } },
        limit: 1,
        depth: 0,
        overrideAccess: true
      })
      .catch(() => null)
    duplicateOperation = !!prior && prior.docs.length > 0
  }

  const rawSummary = [
    `Сумма: ${check.amountMatches ? '✅ совпадает' : `⚠️ ${parsed.amount ?? '—'} (ждали ${totals.orderTotal})`}`,
    `Дата: ${check.dateFresh ? '✅ свежая' : '⚠️ старая/не распознана'}`,
    `Получатель: ${check.recipientMatches === 'yes' ? '✅' : check.recipientMatches === 'no' ? '⚠️ не совпал' : '⚠️ не распознан'}`,
    check.operationId ? `Операция: ${check.operationId}` : 'Операция: не распознана',
    duplicateOperation ? '⚠️ ПОВТОР: чек уже использован' : null
  ]
    .filter(Boolean)
    .join(' · ')

  const orderNumber = `GS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  let orderId: string | number
  try {
    const order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: {
        orderNumber,
        status: 'payment_review',
        customerName: customer.fullName.trim(),
        customerPhone: customer.phone.trim(),
        customerTelegram: customer.telegram.trim(),
        deliveryRegion,
        cdekPickupRaw: cdekPickupRaw.trim(),
        privacyConsentAt: new Date().toISOString(),
        offerAcceptedAt: new Date().toISOString(),
        deliveryTotal,
        amount: totals.orderTotal,
        currency: 'RUB',
        notificationSent: false,
        receiptCheck: {
          parsedAmount: parsed.amount ?? undefined,
          amountMatches: check.amountMatches,
          parsedDate: parsed.dateISO ?? undefined,
          dateFresh: check.dateFresh,
          recipientMatches: check.recipientMatches,
          operationId: parsed.operationId ?? undefined,
          rawSummary
        },
        items
      }
    })
    orderId = order.id
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Не удалось создать заказ.' }, 500)
  }

  // Best-effort: уведомление в Make. Сбой не теряет заказ — он уже в базе.
  if (makeConfig) {
    const makePayload = {
      orderNumber,
      amount: totals.orderTotal,
      itemsTotal: totals.itemsTotal,
      deliveryRegion,
      deliveryTotal,
      items: items.map((i) => ({ title: i.productTitle, size: i.sizeLabel ?? null, qty: i.quantity, unitPrice: i.unitPrice })),
      customer: { name: customer.fullName.trim(), phone: customer.phone.trim(), telegram: customer.telegram.trim() },
      cdekPickupRaw: cdekPickupRaw.trim(),
      consent: { privacyAt: new Date().toISOString(), offerAt: new Date().toISOString() },
      receiptCheck: { ...check, rawSummary },
      createdAt: new Date().toISOString()
    }
    const sent = await sendOrderToMake(makeConfig, {
      payloadJson: JSON.stringify(makePayload),
      pdf,
      filename: `${orderNumber}.pdf`
    })
    if (sent.ok) {
      await payload.update({ collection: 'orders', id: orderId, overrideAccess: true, data: { notificationSent: true } }).catch(() => null)
    }
  }

  return json({ ok: true, orderNumber })
}
```

- [ ] **Step 7: Удалить ЮKassa**

```bash
git rm src/lib/yookassa.ts src/app/api/yookassa/route.ts src/app/api/yookassa/webhook/route.ts tests/app/yookassa.test.ts
```

Затем найти и снять оставшиеся ссылки:

Run: `grep -rn "yookassa\|Yookassa\|getYookassaCredentials\|createYookassaPayment" src/`
Expected после правок: совпадения только в `data/legal.ts` (текст оферты — отдельный Step) и
`lib/integrationCredentials.ts`/`integrationSettings.ts` (там оставляем `resolveYookassaCredentials`
без вызовов — **или** тоже удалить, если не используется). Если `getYookassaCredentials` больше
нигде не вызывается — удалить функцию из `integrationSettings.ts` и `resolveYookassaCredentials`
из `integrationCredentials.ts` вместе с их типами и тестами (`tests/app/integration-credentials.test.ts`
— обновить, убрав ЮKassa-кейсы).

- [ ] **Step 8: Поправить `src/app/(site)/checkout/return/page.tsx`**

Это страница возврата с оплаты ЮKassa — в ручном флоу редиректа на оплату нет. Открыть файл,
убрать обращения к статусу платежа/ЮKassa; оставить простое сообщение «Заказ принят, проверим
оплату и свяжемся в Telegram» (или удалить страницу и ссылку на неё, если она больше не нужна —
проверить `grep -rn "checkout/return" src/`).

- [ ] **Step 9: Проверить типы и тесты (UI ещё не готов — сборка может ругаться на CheckoutClient)**

Run: `npm test && npm run typecheck`
Expected: тесты зелёные; `typecheck` укажет на `CheckoutClient.tsx` (старые поля) — чиним в Task 7.

> Коммит — в конце Task 7, когда весь cutover собирается.

---

## Task 7: UI — форма чекаута и модалка оплаты

**Files:**
- Create: `src/components/PaymentModal.tsx`
- Modify: `src/components/CheckoutClient.tsx`
- Modify: `src/app/globals.css` (стили модалки)

- [ ] **Step 1: Прочитать текущий `CheckoutClient.tsx`**

Открыть `src/components/CheckoutClient.tsx` целиком — понять структуру шагов, состояние формы,
текущий `handleSubmit` и автосейв драфта (`bigstep-checkout-draft`).

- [ ] **Step 2: Создать модалку оплаты `src/components/PaymentModal.tsx`**

```tsx
'use client'

import { useRef, useState } from 'react'

import { formatRubles } from '@/domain/formatting'

type PaymentModalProps = {
  total: number
  qrImageUrl: string | null
  recipientHint: string | null
  submitting: boolean
  onConfirm: (receipt: File) => void
  onClose: () => void
}

const MAX_BYTES = 10 * 1024 * 1024

export function PaymentModal({
  total,
  qrImageUrl,
  recipientHint,
  submitting,
  onConfirm,
  onClose
}: PaymentModalProps) {
  const [receipt, setReceipt] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(file: File | null) {
    setError(null)
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Чек должен быть в формате PDF.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Файл больше 10 МБ.')
      return
    }
    setReceipt(file)
  }

  return (
    <div className="paymentModalOverlay" role="dialog" aria-modal="true" aria-label="Оплата заказа">
      <div className="paymentModal">
        <button className="paymentModalClose" type="button" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2>К оплате ровно {formatRubles(total)}</h2>

        {qrImageUrl ? (
          <img className="paymentQr" src={qrImageUrl} alt="QR для оплаты по СБП" />
        ) : (
          <p className="formError">QR оплаты не настроен. Напишите нам в Telegram.</p>
        )}
        {recipientHint ? <p className="paymentHint">Получатель: {recipientHint}</p> : null}

        <p className="paymentInstruction">
          Отсканируйте QR в приложении банка. Сумму <strong>введите вручную — ровно {formatRubles(total)}</strong>{' '}
          (статический QR не подставляет сумму). После оплаты прикрепите PDF-чек ниже.
        </p>

        <div className="paymentUpload">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
          />
          {receipt ? <span className="paymentFileName">{receipt.name}</span> : null}
          {error ? <span className="formError">{error}</span> : null}
        </div>

        <button
          className="buttonPrimary"
          type="button"
          disabled={!receipt || submitting}
          onClick={() => receipt && onConfirm(receipt)}
        >
          {submitting ? 'Отправляем…' : 'Завершить'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Перестроить форму в `CheckoutClient.tsx`**

Изменения (опираясь на прочитанную в Step 1 структуру):
1. **Состояние формы**: убрать `email`, `city`; добавить `telegram` (text), `deliveryRegion`
   (`'moscow' | 'russia' | ''`), `cdekPickupRaw` (text). Обновить ключ автосейва-драфта, чтобы
   старый драфт со `city/email` не подставлялся (например `bigstep-checkout-draft-v2`).
2. **Шаг «Контакты»**: поля ФИО, Телефон, Telegram (плейсхолдер `@username`). Удалить email.
3. **Шаг «Доставка»**: вместо загрузки/выбора пунктов СДЭК — радиогруппа из двух вариантов
   (`Москва — 400 ₽`, `Россия — 600 ₽`) и текстовое поле «Пункт СДЭК» с подсказкой-ссылкой
   `https://www.cdek.ru/ru/offices`. Итог `товары + доставка` считать через
   `calculateCartTotals(cart, getDeliveryCost(region))` из `@/domain/cart` и `@/domain/delivery`.
4. **Кнопка submit шага**: вместо прямой отправки — `validateCheckoutDraft(...)`; если валидно,
   открыть `PaymentModal` (состояние `showPayment`), иначе показать ошибки как сейчас.
5. **QR и подсказка** для модалки: компонент получает их через пропсы. Проще всего — отдать их
   со страницы-сервера (`checkout/page.tsx`) в `CheckoutClient`: прочитать глобал
   `integration-settings`, достать `sbp.qrImage` (populate → url) и `sbp.recipientHint`. Передать
   как `qrImageUrl` и `recipientHint`.
6. **Подтверждение оплаты** (`onConfirm` из модалки): собрать `FormData`:

```ts
async function submitOrder(receipt: File) {
  setSubmitting(true)
  const payload = {
    customer: { fullName, phone, telegram },
    deliveryRegion,
    cdekPickupRaw,
    consent: { offerAccepted, privacyAccepted },
    items: cart.map((item) => ({ productSlug: item.productSlug, size: item.size, quantity: item.quantity }))
  }
  const form = new FormData()
  form.set('payload', JSON.stringify(payload))
  form.set('receipt', receipt, receipt.name)

  const res = await fetch('/api/checkout', { method: 'POST', body: form })
  const data = await res.json()
  setSubmitting(false)

  if (data.ok) {
    clearCart()
    setOrderNumber(data.orderNumber) // экран «Заказ принят, напишем в Telegram»
    setShowPayment(false)
  } else {
    setError(data.error ?? 'Не удалось оформить заказ.')
  }
}
```

7. **Экран успеха**: текст «Заказ {orderNumber} принят. Проверю оплату и напишу тебе в Telegram».
   Убрать любую логику редиректа на `confirmationUrl` (её больше нет).

- [ ] **Step 4: Стили модалки в `src/app/globals.css`**

```css
.paymentModalOverlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
}
.paymentModal {
  position: relative;
  display: grid;
  gap: 16px;
  width: min(440px, 100%);
  max-height: 90vh;
  overflow: auto;
  padding: 28px;
  background: var(--background, #fff);
  border-radius: 8px;
}
.paymentModalClose {
  position: absolute;
  top: 12px;
  right: 16px;
  border: 0;
  background: none;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}
.paymentQr {
  width: 240px;
  height: 240px;
  object-fit: contain;
  justify-self: center;
}
.paymentHint { margin: 0; font-weight: 600; }
.paymentInstruction { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.5; }
.paymentUpload { display: grid; gap: 8px; }
.paymentFileName { font-size: 14px; color: var(--muted); overflow-wrap: anywhere; }
```

- [ ] **Step 5: Прогнать всё**

Run: `npm run typecheck && npm test && npm run lint && npm run build`
Expected: всё зелёное.

- [ ] **Step 6: Визуальная проверка (preview)**

Поднять `preview_start` (bigstep-dev) и проверить: `/checkout` показывает ФИО/телефон/Telegram +
радио региона + поле ПВЗ; «Перейти к оплате» открывает модалку с суммой и (если настроено) QR;
поле принимает только PDF; «Завершить» неактивна без файла. При локальной проверке достаточно
убедиться, что форма валидируется и модалка открывается (полный сабмит требует Make-URL).

- [ ] **Step 7: Коммит (весь cutover Task 6 + Task 7)**

```bash
git add -A
git commit -m "feat: ручной чекаут — СБП-оплата, PDF-чек, уведомление через Make; удаление ЮKassa"
```

---

## Task 8: Легал-флаги и финальная проверка

**Files:**
- Modify: `src/data/legal.ts`

- [ ] **Step 1: Обновить перечень обработчиков ПДн в `src/data/legal.ts`**

Открыть `data/legal.ts`, найти перечисление обработчиков/способов оплаты. Убрать ЮKassa из
обработчиков, добавить **Make.com** и **Telegram** как получателей ПДн (серверы за рубежом →
трансграничная передача), оплату описать как «перевод по СБП». Точную юридическую формулировку
владелец/юрист финализирует — оставить понятный текст-плейсхолдер и пометку `// TODO(owner): финал юриста`.

- [ ] **Step 2: Финальная проверка всего**

Run: `npm run typecheck && npm test && npm run lint && npm run build`
Expected: всё зелёное.

- [ ] **Step 3: Коммит**

```bash
git add src/data/legal.ts
git commit -m "улучшение: обработчики ПДн в легал-текстах под СБП/Make/Telegram"
```

---

## Деплой (после мёрджа — отдельно, не часть кодовых задач)

1. **Миграция схемы Postgres** (Orders: новые/удалённые колонки + enum статусов; IntegrationSettings:
   убрана yookassa-группа, добавлены make/sbp) — через документированный процесс из памяти проекта.
   На промптах drizzle выбирать **create/drop**, не rename.
2. **Env / админка**: задать `MAKE_WEBHOOK_URL` (+ опц. `MAKE_WEBHOOK_SECRET`) в env или в
   «Интеграции». Загрузить QR СБП, заполнить эталон получателя (имя + хвост телефона).
3. **Make-сценарий**: custom webhook → (проверка `X-Bigstep-Secret`) → форматирование → Telegram
   (бот + чат). Маппинг полей — по контракту payload из спецификации.

---

## Self-review заметки (для исполнителя)

- Порядок важен: Tasks 1–5 — аддитивные, сборка зелёная и коммитятся по отдельности. Tasks 6–7 —
  единый cutover, коммит общий в конце Task 7.
- После Task 6 Step 9 `typecheck` будет красным до конца Task 7 — это ожидаемо.
- `currency: 'RUB'` и инвариант `amount = itemsTotal + deliveryTotal` сохранены — хук Orders
  не сломается.
- PDF нигде не сохраняется на диск/в БД — только буфер в памяти → Make.
