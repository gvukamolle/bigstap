import config from '@payload-config'
import { getPayload } from 'payload'

import { NextResponse, type NextRequest } from 'next/server'

import { getYookassaCredentials } from '@/lib/integrationSettings'
import { formatYookassaAmount, getYookassaPayment, isYookassaWebhookIp } from '@/lib/yookassa'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// За reverse-proxy реальный IP клиента — первый в X-Forwarded-For (proxy ОБЯЗАН переустанавливать
// этот заголовок, см. docs/deployment.md), иначе IP-фильтр проверяет адрес прокси.
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  return request.headers.get('x-real-ip')?.trim() ?? ''
}

export async function POST(request: NextRequest) {
  // Без кредов (админка или env) вебхук не активен.
  const creds = await getYookassaCredentials()
  if (!creds) return new NextResponse(null, { status: 404 })

  // Уведомления ЮKassa не подписаны — первый барьер это IP-фильтр по официальным диапазонам.
  if (!isYookassaWebhookIp(clientIp(request))) return new NextResponse(null, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const object = isRecord(body) && isRecord(body.object) ? body.object : null
  const paymentId = object && typeof object.id === 'string' ? object.id : null
  // Нет id — отвечаем 200, чтобы ЮKassa не ретраила некорректное уведомление бесконечно.
  if (!paymentId) return new NextResponse(null, { status: 200 })

  // ГЛАВНАЯ защита: не доверяем телу. Берём реальный статус платежа из API ЮKassa.
  let payment
  try {
    payment = await getYookassaPayment(creds, paymentId)
  } catch {
    // Временная ошибка обращения к API — 500, чтобы ЮKassa повторила доставку позже.
    return new NextResponse(null, { status: 500 })
  }

  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'orders',
    where: { paymentId: { equals: paymentId } },
    limit: 1,
    depth: 0
  })
  const order = found.docs[0]
  if (!order) return new NextResponse(null, { status: 200 })

  // Идемпотентность: переходим только из неоплаченного состояния.
  if (payment.status === 'succeeded' && order.status !== 'paid') {
    // Сверка суммы: amount платежа из API должен совпасть с суммой заказа (защита от подмены).
    const expected = formatYookassaAmount(typeof order.amount === 'number' ? order.amount : -1)
    if (payment.amount?.value !== expected || payment.amount?.currency !== 'RUB') {
      // Расхождение суммы — не помечаем оплаченным, отдаём 200 и оставляем заказ на ручную проверку.
      return new NextResponse(null, { status: 200 })
    }

    await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      data: { status: 'paid' }
    })
  } else if (payment.status === 'canceled' && order.status === 'pending_payment') {
    await payload.update({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
      data: { status: 'payment_failed' }
    })
  }

  // ЮKassa игнорирует тело ответа; важно лишь быстро вернуть 2xx.
  return new NextResponse(null, { status: 200 })
}
