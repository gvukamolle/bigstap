// tests/domain/receipt.test.ts
import { describe, expect, it } from 'vitest'

import { checkReceipt, parseReceipt } from '../../src/domain/receipt'

const sberText = `
Чек по операции
Сумма 4 600 ₽
Дата операции 27.06.2026 14:32:10 (МСК)
Получатель Степан Г.
Счёт получателя +7 (985) ••• •• 35
СБП
Идентификатор операции B1234567890123456789012345678901
`

const tinkoffText = `
Квитанция · Перевод по СБП
Сумма перевода: 4 600,00 ₽
Комиссия: 0,00 ₽
Дата и время 27.06.2026 14:35
Получатель: Степан Григорьевич Г
Телефон получателя +7 985 ***-**-35
Номер операции 1234567890
`

describe('receipt parser', () => {
  it('extracts amount candidates, date and operation id from a Sber-style receipt', () => {
    const parsed = parseReceipt(sberText)
    expect(parsed.amounts).toContain(4600)
    expect(parsed.dateISO).toBe('2026-06-27')
    expect(parsed.operationId).toBe('B1234567890123456789012345678901')
    expect(parsed.recipientRaw).toContain('Степан')
  })

  it('handles comma decimals and masked phone (Tinkoff-style)', () => {
    const parsed = parseReceipt(tinkoffText)
    expect(parsed.amounts).toContain(4600)
    expect(parsed.operationId).toBe('1234567890')
  })

  it('returns empty result for blank text (scan without text layer)', () => {
    const parsed = parseReceipt('')
    expect(parsed.amounts).toEqual([])
    expect(parsed.dateISO).toBeNull()
  })
})

describe('receipt check', () => {
  const now = new Date('2026-06-27T15:00:00Z')

  it('passes when amount, freshness and recipient match', () => {
    const parsed = parseReceipt(sberText)
    const check = checkReceipt(parsed, {
      expectedAmount: 4600,
      expectedRecipientName: 'Степан',
      expectedPhoneTail: '35',
      now
    })
    expect(check.amountMatches).toBe(true)
    expect(check.dateFresh).toBe(true)
    expect(check.recipientMatches).toBe('yes')
  })

  it('flags a wrong amount', () => {
    const parsed = parseReceipt(sberText)
    const check = checkReceipt(parsed, { expectedAmount: 9999, now })
    expect(check.amountMatches).toBe(false)
  })

  it('flags a stale receipt older than 24h', () => {
    const parsed = parseReceipt(sberText)
    const check = checkReceipt(parsed, {
      expectedAmount: 4600,
      now: new Date('2026-06-29T15:00:00Z')
    })
    expect(check.dateFresh).toBe(false)
  })

  it('reports recipient as unknown when nothing parsed', () => {
    const check = checkReceipt(parseReceipt(''), { expectedAmount: 4600, now })
    expect(check.recipientMatches).toBe('unknown')
    expect(check.amountMatches).toBe(false)
  })
})
