import { NextResponse, type NextRequest } from 'next/server'

const BOOTSTRAP_COOKIE = 'payload-bootstrap'
const CREATE_FIRST_USER_PATH = '/admin/create-first-user'
const FIRST_REGISTER_PATH = '/api/users/first-register'

const isProductionRuntime = () =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build'

const notFound = () => new NextResponse(null, { status: 404 })

// Constant-time equality. Avoids node:crypto so this works on the edge runtime where proxy runs.
const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

const hasBootstrapCookie = (request: NextRequest, token: string) => {
  const cookieValue = request.cookies.get(BOOTSTRAP_COOKIE)?.value
  if (typeof cookieValue !== 'string') return false

  return constantTimeEqual(cookieValue, token)
}

const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/$/, '') : path)

export function proxy(request: NextRequest) {
  if (!isProductionRuntime()) {
    return NextResponse.next()
  }

  const bootstrapToken = process.env.PAYLOAD_BOOTSTRAP_TOKEN

  if (!bootstrapToken) {
    return notFound()
  }

  const { nextUrl } = request

  const pathname = normalizePath(nextUrl.pathname)

  if (pathname === CREATE_FIRST_USER_PATH) {
    if (hasBootstrapCookie(request, bootstrapToken)) {
      return NextResponse.next()
    }

    return notFound()
  }

  if (pathname === FIRST_REGISTER_PATH && hasBootstrapCookie(request, bootstrapToken)) {
    return NextResponse.next()
  }

  return notFound()
}

export const config = {
  matcher: ['/admin/create-first-user/:path*', '/api/users/first-register/:path*']
}
