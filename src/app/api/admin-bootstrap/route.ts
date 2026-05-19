import { NextResponse, type NextRequest } from 'next/server'

const BOOTSTRAP_COOKIE = 'payload-bootstrap'
const BOOTSTRAP_MAX_AGE_SECONDS = 30 * 60

const isProductionRuntime = () =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build'

const notFound = () => new NextResponse(null, { status: 404 })

const setBootstrapCookie = (response: NextResponse, token: string) => {
  response.cookies.set(BOOTSTRAP_COOKIE, token, {
    httpOnly: true,
    maxAge: BOOTSTRAP_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'strict',
    secure: true
  })
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

  const formData = await request.formData()
  const submittedToken = formData.get('token')

  if (submittedToken !== bootstrapToken) {
    return notFound()
  }

  const response = NextResponse.redirect(new URL('/admin/create-first-user', request.url), 303)
  setBootstrapCookie(response, bootstrapToken)

  return response
}
