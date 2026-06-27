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
    duplicateOperation = prior !== null && prior.docs.length > 0
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
