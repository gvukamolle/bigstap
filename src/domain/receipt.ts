// Парсер банковского PDF-чека (L1). ВАЖНО: unpdf отдаёт текст ОДНОЙ строкой через пробелы
// (без переводов строк), поэтому ни один регекс не должен полагаться на \n. Регексы откалиброваны
// по реальным чекам Альфа-Банка и Сбера (СБП): суммы — по слову «Сумма/Итого» (знак валюты у
// некоторых шрифтов извлекается мусором), дата — dd.mm.yyyy / «25 июня 2026» / yyyy-mm-dd,
// получатель — «ФИО получателя» либо «Получатель», ID — «Номер/Идентификатор операции [в СБП]».

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

// Денежный токен: «8 300», «33756.00», «8 300,00» (пробелы — обычный/nbsp/узкий nbsp).
const AMOUNT = '\\d[\\d \\u00a0\\u202f]*(?:[.,]\\d{1,2})?'

// Метки-границы, на которых обрезаем захват имени получателя (в любом падеже).
const BOUNDARY =
  '(?:отправител|номер|банк|дата|статус|карт|сч[её]т|наименовани|код|сумма|комисси|телефон|сбп|фио|получател|операци)'

const MONTH_NUM: Record<string, string> = {
  январ: '01',
  феврал: '02',
  март: '03',
  апрел: '04',
  мая: '05',
  май: '05',
  июн: '06',
  июл: '07',
  август: '08',
  сентябр: '09',
  октябр: '10',
  ноябр: '11',
  декабр: '12'
}

// Нормализуем «1 200,50» / «33756.00» / «1 200» → целые рубли (копейки округляем).
function normaliseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  const value = Number.parseFloat(cleaned)
  if (!Number.isFinite(value)) return null
  return Math.round(value)
}

function parseDate(text: string): string | null {
  const dmy = text.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`

  const textual = text.match(
    /(\d{1,2})\s+(январ|феврал|март|апрел|мая|май|июн|июл|август|сентябр|октябр|ноябр|декабр)[а-яё]*\s+(\d{4})/i
  )
  if (textual) {
    const month = MONTH_NUM[textual[2].toLowerCase()]
    if (month) return `${textual[3]}-${month}-${textual[1].padStart(2, '0')}`
  }

  const ymd = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`

  return null
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
  // 2) Число перед знаком валюты (₽/руб/RUB/RUR/р.) — если символ извлёкся корректно.
  // Lookbehind (?<![\d.:,]) не даёт сумме «прилипнуть» к хвосту даты/времени (напр. «27.06.26 480»).
  const currencyRe = new RegExp('(?<![\\d.:,])(' + AMOUNT + ')\\s*(?:₽|руб|RUB|RUR|р\\.)', 'gi')
  for (const m of text.matchAll(currencyRe)) {
    const value = normaliseAmount(m[1])
    if (value !== null && value > 0) amounts.add(value)
  }
  const amountList = [...amounts]

  const dateISO = parseDate(text)

  // Имя получателя: приоритет «ФИО получателя [перевода]», затем «Получатель» (точное, с ь).
  let recipientRaw: string | null = null
  const fio = text.match(
    new RegExp(
      'ФИО\\s+получател[ья](?:\\s+перевода)?[:\\s]+([^\\d\\n]{2,40}?)(?=\\s*' + BOUNDARY + '|[\\d]|$)',
      'i'
    )
  )
  if (fio) recipientRaw = fio[1].trim()
  if (recipientRaw === null) {
    const rec = text.match(
      new RegExp('Получатель[:\\s]+([^\\d\\n]{2,40}?)(?=\\s*' + BOUNDARY + '|[\\d]|$)', 'i')
    )
    if (rec) recipientRaw = rec[1].trim()
  }

  // Счёт/телефон получателя — захватываем телефонно-карточный токен.
  const accountMatch = text.match(
    /(?:телефона?|сч[её]та?|карты?)\s+получател[ья][:\s]*([\d+()•*\s-]{4,40})/i
  )
  const recipientAccount = accountMatch ? accountMatch[1].trim() : null

  // ID/номер операции — по конкретной метке (допускаем «в СБП» между меткой и значением).
  const opMatch = text.match(
    /(?:номер|идентификатор|код|наименование)\s+операции(?:\s+в\s+сбп)?[:\s№]*([A-Za-z0-9][A-Za-z0-9-]{5,})/i
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
