const firstHeaderValue = (value: string | null): string | null => {
  const first = value?.split(',')[0]?.trim()

  return first || null
}

export function getPublicRequestOrigin(requestUrl: string, headers: Headers): string {
  const url = new URL(requestUrl)
  const host = firstHeaderValue(headers.get('x-forwarded-host')) ?? firstHeaderValue(headers.get('host'))

  if (!host) return url.origin

  const proto = firstHeaderValue(headers.get('x-forwarded-proto')) ?? url.protocol.replace(/:$/, '')
  const candidate = `${proto}://${host}`

  // Если домен сконфигурирован (NEXT_PUBLIC_SITE_URL), принимаем forwarded-host только если его хост
  // совпадает с настроенным — иначе подделкой X-Forwarded-Host нельзя увести редирект bootstrap на
  // чужой/фишинговый домен. Без конфигурации поведение прежнее (доверие reverse-proxy).
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (configured) {
    try {
      return new URL(candidate).host === new URL(configured).host ? candidate : configured
    } catch {
      return configured
    }
  }

  return candidate
}
