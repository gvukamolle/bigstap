import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  // HSTS is only meaningful over HTTPS; browsers ignore it on http://localhost.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
]

// В dev React/Next используют eval() для HMR и отладки; в production eval не применяется.
// Поэтому 'unsafe-eval' добавляем только вне прода — иначе CSP шумит ошибками в разработке,
// а боевой CSP остаётся строгим.
const cspScriptSrc =
  process.env.NODE_ENV === 'production'
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  // Self-contained build for Docker: emits .next/standalone with a minimal node_modules + server.js.
  output: 'standalone',
  turbopack: {
    root: rootDir
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      }
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      },
      {
        // /bootstrap-admin принимает мастер-токен в поле password — добавляем CSP.
        // script/style оставляем 'unsafe-inline' ради совместимости с инлайн-скриптами Next,
        // но form-action/base-uri/frame-ancestors/object-src закрывают угон формы и инъекции.
        source: '/bootstrap-admin',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              cspScriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "object-src 'none'"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

export default withPayload(nextConfig)
