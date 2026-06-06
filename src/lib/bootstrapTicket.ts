// HMAC-подписанный короткоживущий тикет для гейта создания первого админа Payload.
// Работает и в node-рантайме (route.ts), и в edge-рантайме (proxy.ts) через Web Crypto,
// поэтому сам мастер-токен (PAYLOAD_BOOTSTRAP_TOKEN) в cookie НЕ кладётся — только подписанный
// тикет с коротким сроком жизни. Токен используется лишь как HMAC-ключ и не покидает сервер.

const TICKET_PURPOSE = 'bootstrap-create-first-user'
const DEFAULT_TTL_MS = 30 * 60 * 1000

const encoder = new TextEncoder()

const toBase64Url = (bytes: ArrayBuffer): string => {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const sign = async (secret: string, message: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return toBase64Url(signature)
}

// Constant-time сравнение подписей (на штатном пути они одинаковой длины).
const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function issueBootstrapTicket(
  secret: string,
  now: number,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<string> {
  const exp = now + ttlMs
  const signature = await sign(secret, `${TICKET_PURPOSE}.${exp}`)
  return `${exp}.${signature}`
}

export async function verifyBootstrapTicket(
  secret: string,
  ticket: string,
  now: number
): Promise<boolean> {
  const separator = ticket.indexOf('.')
  if (separator <= 0) return false

  const expPart = ticket.slice(0, separator)
  const signature = ticket.slice(separator + 1)
  if (!signature) return false

  const exp = Number(expPart)
  if (!Number.isSafeInteger(exp) || exp < now) return false

  const expected = await sign(secret, `${TICKET_PURPOSE}.${exp}`)
  return constantTimeEqual(signature, expected)
}

export const BOOTSTRAP_TICKET_TTL_MS = DEFAULT_TTL_MS
