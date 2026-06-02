const firstHeaderValue = (value: string | null): string | null => {
  const first = value?.split(',')[0]?.trim()

  return first || null
}

export function getPublicRequestOrigin(requestUrl: string, headers: Headers): string {
  const url = new URL(requestUrl)
  const host = firstHeaderValue(headers.get('x-forwarded-host')) ?? firstHeaderValue(headers.get('host'))

  if (!host) return url.origin

  const proto = firstHeaderValue(headers.get('x-forwarded-proto')) ?? url.protocol.replace(/:$/, '')

  return `${proto}://${host}`
}
