import { NextResponse, type NextRequest } from 'next/server'

const BOOTSTRAP_COOKIE = 'payload-bootstrap'
const BOOTSTRAP_MAX_AGE_SECONDS = 30 * 60
const CREATE_FIRST_USER_PATH = '/admin/create-first-user'
const FIRST_REGISTER_PATH = '/api/users/first-register'

const isProductionRuntime = () =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build'

const notFound = () => new NextResponse(null, { status: 404 })

const hasBootstrapCookie = (request: NextRequest, token: string) =>
  request.cookies.get(BOOTSTRAP_COOKIE)?.value === token

const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/$/, '') : path)

const setBootstrapCookie = (response: NextResponse, token: string) => {
  response.cookies.set(BOOTSTRAP_COOKIE, token, {
    httpOnly: true,
    maxAge: BOOTSTRAP_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'strict',
    secure: true
  })
}

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
    const tokenFromUrl = nextUrl.searchParams.get('bootstrapToken')

    if (tokenFromUrl === bootstrapToken) {
      const redirectUrl = nextUrl.clone()
      redirectUrl.searchParams.delete('bootstrapToken')

      const response = NextResponse.redirect(redirectUrl)
      setBootstrapCookie(response, bootstrapToken)

      return response
    }

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
