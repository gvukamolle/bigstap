import { NextResponse, type NextRequest } from 'next/server'

import { verifyBootstrapTicket } from './lib/bootstrapTicket'

const BOOTSTRAP_COOKIE = 'payload-bootstrap'
const CREATE_FIRST_USER_PATH = '/admin/create-first-user'
const FIRST_REGISTER_PATH = '/api/users/first-register'

const isProductionRuntime = () =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build'

const notFound = () => new NextResponse(null, { status: 404 })

// Проверяем HMAC-тикет из cookie (а не сам мастер-токен). verifyBootstrapTicket работает на edge
// через Web Crypto и отвергает истёкшие/подделанные/чужой подписью тикеты.
const hasValidBootstrapTicket = async (request: NextRequest, token: string): Promise<boolean> => {
  const cookieValue = request.cookies.get(BOOTSTRAP_COOKIE)?.value
  if (typeof cookieValue !== 'string') return false

  return verifyBootstrapTicket(token, cookieValue, Date.now())
}

const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/$/, '') : path)

export async function proxy(request: NextRequest) {
  if (!isProductionRuntime()) {
    return NextResponse.next()
  }

  const bootstrapToken = process.env.PAYLOAD_BOOTSTRAP_TOKEN

  if (!bootstrapToken) {
    return notFound()
  }

  const pathname = normalizePath(request.nextUrl.pathname)

  if (pathname === CREATE_FIRST_USER_PATH || pathname === FIRST_REGISTER_PATH) {
    if (await hasValidBootstrapTicket(request, bootstrapToken)) {
      return NextResponse.next()
    }

    return notFound()
  }

  return notFound()
}

export const config = {
  matcher: ['/admin/create-first-user/:path*', '/api/users/first-register/:path*']
}
