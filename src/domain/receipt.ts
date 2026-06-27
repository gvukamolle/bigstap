// Парсер банковского PDF-чека (L1). ВАЖНО: unpdf отдаёт текст одной строкой через пробелы
// (без переводов строк), поэтому ни один регекс не должен полагаться на \n. Суммы ищем по
// ключевому слову («Сумма»/«Итого»), а не только по знаку валюты — символ ₽ у некоторых
// шрифтов извлекается как мусор. Форматы банков различаются — регексы рассчитаны на типовые
// (Сбер/Т-Банк/Альфа) и при необходимости донастраиваются по реальным образцам.

export type ReceiptParseResult = {
  amounts: number[] // все найденные рублёвые суммы (кандидаты)
  amount: number | null // самый вероятный платёж (максимум из кандидатов)
  dateISO: string | null // дата операции YYYY-MM-DD
  recipientRaw: string | null // имя получателя
  recipientAccount: string | null // счёт/телефон получателя (для сверки последних цифр)
  operationId: string | null // идентификатор/номер операции
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

// Денежный токен: «8 300», «8 300,00», «8300.50» (пробелы — обычный/nbsp/узкий nbsp).
const AMOUNT = '\\d[\\d \\u00a0\\u202f]*(?:[.,]\\d{1,2})?'

// Нормализуем «1 200,50» / «1 200.50» / «1 200» → 1200 (целые рубли; копейки округляем).
function normaliseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[\s  ]/g, '').replace(',', '.')
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value)) return null
  return Math.round(value)
}

const emptyResult: ReceiptParseResult = {
  amounts: [],
  amount: null,
  dateISO: null,
  recipientRaw: null,
  recipientAccount: null,
  operationId: null
}

export function parseReceipt(text: string): ReceiptParseResult {
  if (!text || !text.trim()) return { ...emptyResult }

  const amounts = new Set<number>()
  // 1) Сумма по ключевому слову — не полагаемся на знак валюты.
  const keywordRe = new RegExp(
    '(?:сумма(?:\\s+(?:перевода|операции|платежа))?|итого|к\\s*оплате)[:\\s]*(' + AMOUNT + ')',
    'gi'
  )
  for (const m of text.matchAll(keywordRe)) {
    const value = normaliseAmount(m[1])
    if (value !== null && value > 0) amounts.add(value)
  }
  // 2) Число перед знаком валюты — если символ извлёкся корректно.
  const currencyRe = new RegExp('(' + AMOUNT + ')\\s*(?:₽|руб|RUB|р\\.)', 'gi')
  for (const m of text.matchAll(currencyRe)) {
    const value = normaliseAmount(m[1])
    if (value !== null && value > 0) amounts.add(value)
  }
  const amountList = [...amounts]

  // Дата dd.mm.yyyy → ISO.
  const dateMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  const dateISO = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null

  // Имя получателя — ограниченный фрагмент после «Получатель», до следующей метки/цифры.
  const recipientMatch = text.match(
    /Получател[ья][:\s]+([^\d\n]{2,40}?)(?=\s*(?:сч[её]т|телефон|идентификатор|номер|банк|дата|комисси|сбп)|[\d+]|$)/i
  )
  const recipientRaw = recipientMatch ? recipientMatch[1].trim() : null

  // Счёт/телефон получателя — до следующей метки (чтобы не захватить цифры ID/даты).
  const accountMatch = text.match(
    /(?:сч[её]т|телефон)\s+получател[ья][:\s]*([^\n]{2,40}?)(?=\s*(?:идентификатор|номер|дата|сумма|банк|комисси)|$)/i
  )
  const recipientAccount = accountMatch ? accountMatch[1].trim() : null

  // ID/номер операции — по конкретной метке, а не по слову «операция» в заголовке.
  const opMatch = text.match(
    /(?:идентификатор\s+операции|номер\s+операции|код\s+операции|идентификатор\s+платежа|номер\s+документа)[:\s№]*([A-Za-z0-9][A-Za-z0-9-]{5,})/i
  )
  const operationId = opMatch ? opMatch[1] : null

  return {
    amounts: amountList,
    amount: amountList.length > 0 ? Math.max(...amountList) : null,
    dateISO,
    recipientRaw,
    recipientAccount,
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
  if (parsed.recipientRaw !== null || parsed.recipientAccount !== null) {
    const expectedName = expectation.expectedRecipientName
    const expectedTail = expectation.expectedPhoneTail
    const nameHaystack = (parsed.recipientRaw ?? '').toLowerCase()
    const nameOk =
      expectedName != null && expectedName !== '' && nameHaystack.includes(expectedName.toLowerCase())
    const accountDigits = (parsed.recipientAccount ?? parsed.recipientRaw ?? '').replace(/\D/g, '')
    const tailOk =
      expectedTail != null &&
      expectedTail !== '' &&
      accountDigits.length > 0 &&
      accountDigits.endsWith(expectedTail)
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
