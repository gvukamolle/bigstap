const PRODUCTION_SITE_URL = 'https://bigstep.ru'
const LOCAL_SITE_URL = 'http://localhost:3000'

type SiteUrlEnv = {
  NEXT_PUBLIC_SITE_URL?: string
  NODE_ENV?: string
}

export function getSiteUrl(env: SiteUrlEnv = process.env) {
  const configuredUrl = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')

  if (configuredUrl) {
    return configuredUrl
  }

  return env.NODE_ENV === 'production' ? PRODUCTION_SITE_URL : LOCAL_SITE_URL
}

export function getCanonicalUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${getSiteUrl()}${normalizedPath}`
}

export function getAbsoluteAssetUrl(src: string) {
  if (src.startsWith('http')) {
    return src
  }

  return `${getSiteUrl()}${src.startsWith('/') ? src : `/${src}`}`
}
