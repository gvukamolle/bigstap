import config from '@payload-config'
import { getPayload } from 'payload'

import { NextResponse, type NextRequest } from 'next/server'

import { calculateCartTotals, sanitizeCart } from '@/domain/cart'
import {
  validateCheckoutDraft,
  type CdekPickupPoint,
  type CheckoutConsent,
  type CustomerDetails
} from '@/domain/checkout'
import { getCatalogProducts } from '@/lib/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Заказ создаётся только в dev: это тестовый pipeline до подключения ЮKassa/СДЭК.
// В проде эндпоинт отключён, чтобы не было открытого создания заказов без оплаты.
const isProductionRuntime = () =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build'

type IncomingItem = { productSlug: string; size: string | null; quantity: number }

const json = (data: unknown, status = 200) => NextResponse.json(data, { status })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseCustomer(value: unknown): CustomerDetails | null {
  if (!isRecord(value)) return null
  const { fullName, phone, email, city } = value
  if (
    typeof fullName !== 'string' ||
    typeof phone !== 'string' ||
    typeof email !== 'string' ||
    typeof city !== 'string'
  ) {
    return null
  }

  return { fullName, phone, email, city }
}

function parsePickup(value: unknown): CdekPickupPoint | null {
  if (!isRecord(value)) return null
  const { code, name, address, city, price } = value
  if (
    typeof code !== 'string' ||
    typeof name !== 'string' ||
    typeof address !== 'string' ||
    typeof city !== 'string' ||
    typeof price !== 'number' ||
    !Number.isSafeInteger(price) ||
    price < 0
  ) {
    return null
  }

  return { code, name, address, city, price }
}

function parseItems(value: unknown): IncomingItem[] {
  if (!Array.isArray(value)) return []

  const items: IncomingItem[] = []
  for (const entry of value) {
    if (!isRecord(entry)) continue
    const { productSlug, size, quantity } = entry
    if (typeof productSlug !== 'string') continue
    if (!(typeof size === 'string' || size === null)) continue
    if (typeof quantity !== 'number') continue
    items.push({ productSlug, size, quantity })
  }

  return items
}

function parseConsent(value: unknown): CheckoutConsent {
  if (!isRecord(value)) return { offerAccepted: false, privacyAccepted: false }

  return {
    offerAccepted: value.offerAccepted === true,
    privacyAccepted: value.privacyAccepted === true
  }
}

export async function POST(request: NextRequest) {
  if (isProductionRuntime()) {
    return json({ ok: false, error: 'Создание заказа доступно только в режиме разработки.' }, 404)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'Некорректный JSON в запросе.' }, 400)
  }

  if (!isRecord(body)) return json({ ok: false, error: 'Пустой запрос.' }, 400)

  const customer = parseCustomer(body.customer)
  const cdekPickup = parsePickup(body.cdekPickup)
  const consent = parseConsent(body.consent)
  const incomingItems = parseItems(body.items)

  if (!customer) return json({ ok: false, error: 'Некорректные контактные данные.' }, 400)
  if (incomingItems.length === 0) return json({ ok: false, error: 'Корзина пуста.' }, 400)

  const validation = validateCheckoutDraft({ customer, cdekPickup, consent })
  if (!validation.valid || !cdekPickup) {
    return json({ ok: false, error: 'Проверьте форму оформления.', fields: validation.errors }, 422)
  }

  // Цена и наличие — со стороны сервера: корзина пересобирается из канонического каталога.
  const products = await getCatalogProducts()
  const cart = sanitizeCart(
    incomingItems.map((item) => ({
      productSlug: item.productSlug,
      quantity: item.quantity,
      size: item.size
    })),
    products
  )

  if (cart.length === 0) {
    return json({ ok: false, error: 'Товары недоступны или закончились.' }, 409)
  }

  const totals = calculateCartTotals(cart, cdekPickup.price)

  const payload = await getPayload({ config })

  // Связь позиции с товаром Payload (обязательное поле relationship): ищем id по slug.
  const slugs = [...new Set(cart.map((item) => item.productSlug))]
  const foundProducts = await payload.find({
    collection: 'products',
    where: { slug: { in: slugs } },
    limit: 100,
    depth: 0
  })

  const idBySlug = new Map<string, number>()
  for (const doc of foundProducts.docs) {
    if (typeof doc.slug === 'string') idBySlug.set(doc.slug, doc.id)
  }

  const missing = slugs.filter((slug) => !idBySlug.has(slug))
  if (missing.length > 0) {
    return json(
      {
        ok: false,
        error: `Нет товара в каталоге Payload: ${missing.join(', ')}. Добавьте его в админке.`
      },
      409
    )
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

  const orderNumber = `GS-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`

  try {
    const order = await payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: {
        orderNumber,
        status: 'pending_payment',
        customerName: customer.fullName.trim(),
        customerPhone: customer.phone.trim(),
        customerEmail: customer.email.trim(),
        customerCity: customer.city.trim(),
        privacyConsentAt: new Date().toISOString(),
        offerAcceptedAt: new Date().toISOString(),
        deliveryMethod: 'cdek_pickup',
        cdekPickupCode: cdekPickup.code,
        cdekPickupName: cdekPickup.name,
        cdekPickupCity: cdekPickup.city,
        cdekPickupAddress: cdekPickup.address,
        deliveryTotal: cdekPickup.price,
        amount: totals.orderTotal,
        currency: 'RUB',
        items
      }
    })

    return json({ ok: true, orderNumber: order.orderNumber, id: order.id })
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'Не удалось создать заказ.' },
      500
    )
  }
}
