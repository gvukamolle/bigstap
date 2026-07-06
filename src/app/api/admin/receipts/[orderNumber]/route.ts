import { readFile } from 'node:fs/promises'
import path from 'node:path'

import config from '@payload-config'
import { getPayload } from 'payload'

import { NextResponse, type NextRequest } from 'next/server'

import { isStaff } from '@/payload/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const receiptsDir = path.resolve(process.cwd(), 'media', 'receipts')

// Формат orderNumber задаётся сервером в /api/checkout (GS-…): только [A-Z0-9-].
// Всё остальное отбрасываем до обращения к файловой системе — никаких путей от клиента.
const ORDER_NUMBER_PATTERN = /^[A-Z0-9-]{1,64}$/

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!isStaff(user)) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  let pdf: Buffer
  try {
    pdf = await readFile(path.join(receiptsDir, `${orderNumber}.pdf`))
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Чек не найден. Файлы сохраняются для заказов после обновления от 06.07.2026.' },
      { status: 404 }
    )
  }

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${orderNumber}.pdf"`,
      'Cache-Control': 'private, no-store'
    }
  })
}
