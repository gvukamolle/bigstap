import { timingSafeEqual } from 'node:crypto'

import { NextResponse, type NextRequest } from 'next/server'

const BOOTSTRAP_COOKIE = 'payload-bootstrap'
const BOOTSTRAP_MAX_AGE_SECONDS = 30 * 60

const RATE_WINDOW_MS = 15 * 60 * 1000
const RATE_MAX_ATTEMPTS = 5

const isProductionRuntime = () =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build'

const notFound = () => new NextResponse(null, { status: 404 })

const setBootstrapCookie = (response: NextResponse, token: string) => {
  // 303 ensures the browser issues a GET to /admin/create-first-user even though this handler is POST.
  response.cookies.set(BOOTSTRAP_COOKIE, token, {
    httpOnly: true,
    maxAge: BOOTSTRAP_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'strict',
    secure: true
  })
}

// In-memory rate limiter. Sufficient for a single-instance prod node; replace with Redis when scaled out.
const attempts = new Map<string, { count: number; resetAt: number }>()

const getClientKey = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  return request.headers.get('x-real-ip') ?? 'unknown'
}

const isRateLimited = (key: string): boolean => {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }

  entry.count += 1
  if (entry.count > RATE_MAX_ATTEMPTS) return true

  return false
}

const tokensMatch = (submitted: string, expected: string): boolean => {
  const submittedBuf = Buffer.from(submitted)
  const expectedBuf = Buffer.from(expected)
  if (submittedBuf.length !== expectedBuf.length) return false

  return timingSafeEqual(submittedBuf, expectedBuf)
}

export async function POST(request: NextRequest) {
  if (!isProductionRuntime()) {
    const response = NextResponse.redirect(new URL('/admin/create-first-user', request.url), 303)
    setBootstrapCookie(response, 'local-development')

    return response
  }

  const bootstrapToken = process.env.PAYLOAD_BOOTSTRAP_TOKEN

  if (!bootstrapToken) {
    return notFound()
  }

  if (isRateLimited(getClientKey(request))) {
    return notFound()
  }

  const formData = await request.formData()
  const rawToken = formData.get('token')
  const submittedToken = typeof rawToken === 'string' ? rawToken.trim() : ''

  if (!submittedToken || !tokensMatch(submittedToken, bootstrapToken)) {
    return notFound()
  }

  const response = NextResponse.redirect(new URL('/admin/create-first-user', request.url), 303)
  setBootstrapCookie(response, bootstrapToken)

  return response
}
