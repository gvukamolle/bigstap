import { NextResponse, type NextRequest } from 'next/server'

const BOOTSTRAP_COOKIE = 'payload-bootstrap'
const CREATE_FIRST_USER_PATH = '/admin/create-first-user'
const FIRST_REGISTER_PATH = '/api/users/first-register'

const isProductionRuntime = () =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build'

const notFound = () => new NextResponse(null, { status: 404 })

const hasBootstrapCookie = (request: NextRequest, token: string) =>
  request.cookies.get(BOOTSTRAP_COOKIE)?.value === token

const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/$/, '') : path)

export function middleware(request: NextRequest) {
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
