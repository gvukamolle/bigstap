// src/domain/receipt.ts

export type ReceiptParseResult = {
  amounts: number[] // все найденные рублёвые суммы (кандидаты)
  amount: number | null // самый вероятный платёж (максимум из кандидатов)
  dateISO: string | null // дата операции YYYY-MM-DD
  recipientRaw: string | null // сырая строка про получателя
  operationId: string | null // ID/номер операции СБП
}

export type RecipientMatch = 'yes' | 'no' | 'unknown'

export type ReceiptCheckExpectation = {
  expectedAmount: number
  expectedRecipientName?: string | null
  expectedPhoneTail?: string | null
  now: Date
}

export type ReceiptCheck = {
  parsedAmount: number | null
  amountMatches: boolean
  parsedDate: string | null
  dateFresh: boolean
  recipientMatches: RecipientMatch
  operationId: string | null
}

const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000

// Нормализуем «1 200,50» / «1 200.50» / «1 200» → 1200 (целые рубли; копейки отбрасываем).
function normaliseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.')
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value)) return null
  return Math.round(value)
}

export function parseReceipt(text: string): ReceiptParseResult {
  if (!text || !text.trim()) {
    return { amounts: [], amount: null, dateISO: null, recipientRaw: null, operationId: null }
  }

  // Суммы: число (с пробелами-разделителями и копейками) перед знаком рубля.
  const amountRe = /(\d[\d\s ]*(?:[.,]\d{1,2})?)\s*(?:₽|руб|RUB|р\.)/gi
  const amounts: number[] = []
  for (const match of text.matchAll(amountRe)) {
    const value = normaliseAmount(match[1])
    if (value !== null && value > 0) amounts.push(value)
  }

  // Дата dd.mm.yyyy → ISO.
  const dateMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  const dateISO = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null

  // Получатель: строка после «Получатель …» до перевода строки.
  const recipientMatch = text.match(/Получатель[:\s]+([^\n]+)/i)
  const recipientRaw = recipientMatch ? recipientMatch[1].trim() : null

  // ID/номер операции: после «операции …» — буквенно-цифровой токен ≥ 6 символов.
  const opMatch = text.match(/операци[ияй][:\s]+([A-Za-zА-Яа-я0-9]{6,})/i)
  const operationId = opMatch ? opMatch[1] : null

  return {
    amounts,
    amount: amounts.length > 0 ? Math.max(...amounts) : null,
    dateISO,
    recipientRaw,
    operationId
  }
}

export function checkReceipt(
  parsed: ReceiptParseResult,
  expectation: ReceiptCheckExpectation
): ReceiptCheck {
  const amountMatches = parsed.amounts.includes(expectation.expectedAmount)

  let dateFresh = false
  if (parsed.dateISO) {
    const parsedTime = new Date(`${parsed.dateISO}T00:00:00Z`).getTime()
    const diff = expectation.now.getTime() - parsedTime
    dateFresh = diff >= -FRESH_WINDOW_MS && diff <= FRESH_WINDOW_MS
  }

  let recipientMatches: RecipientMatch = 'unknown'
  if (parsed.recipientRaw) {
    const haystack = parsed.recipientRaw.toLowerCase()
    const nameOk =
      Boolean(expectation.expectedRecipientName) &&
      haystack.includes(expectation.expectedRecipientName.toLowerCase())
    const tailOk =
      Boolean(expectation.expectedPhoneTail) &&
      parsed.recipientRaw.replace(/\D/g, '').endsWith(expectation.expectedPhoneTail)
    recipientMatches = nameOk || tailOk ? 'yes' : 'no'
  }

  return {
    parsedAmount: parsed.amount,
    amountMatches,
    parsedDate: parsed.dateISO,
    dateFresh,
    recipientMatches,
    operationId: parsed.operationId
  }
}
