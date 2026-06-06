import { NextResponse } from 'next/server'

// Лёгкий liveness-эндпоинт для healthcheck Docker и reverse-proxy.
// Намеренно НЕ обращается к БД: проверяет только, что Node-процесс жив и отвечает.
// Запрос к тяжёлой "/" давал бы ложно-зелёный статус (у витрины есть fallback на
// фикстуры при недоступной БД) и каскадные перезапуски при кратком недоступе Postgres.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
