import { NextResponse, type NextRequest } from 'next/server'

import { getCdekDeliveryPoints, isCdekConfigured } from '@/lib/cdek'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Серверный прокси списка ПВЗ CDEK: токен и client_secret не покидают сервер.
// Без кредов отвечает configured:false — фронт показывает прототипные пункты выдачи.
export async function GET(request: NextRequest) {
  if (!isCdekConfigured()) {
    return NextResponse.json({ ok: false, configured: false, points: [] })
  }

  const city = request.nextUrl.searchParams.get('city')?.trim()
  if (!city || city.length < 2) {
    return NextResponse.json(
      { ok: false, configured: true, error: 'Укажите город', points: [] },
      { status: 400 }
    )
  }

  try {
    const points = await getCdekDeliveryPoints(city)
    return NextResponse.json({ ok: true, configured: true, points })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: error instanceof Error ? error.message : 'Ошибка CDEK',
        points: []
      },
      { status: 502 }
    )
  }
}
