// tests/app/receipt-file.test.ts
import { describe, expect, it } from 'vitest'

import { MAX_RECEIPT_BYTES, validateReceiptPdf } from '../../src/lib/receiptFile'

const pdfHeader = Buffer.from('%PDF-1.7\n%âãÏ\n')

describe('receipt file validation', () => {
  it('accepts a buffer that starts with the PDF signature', () => {
    expect(validateReceiptPdf(pdfHeader)).toEqual({ ok: true })
  })

  it('rejects a non-PDF buffer regardless of declared type', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    expect(validateReceiptPdf(png)).toEqual({ ok: false, error: 'not_pdf' })
  })

  it('rejects an oversized buffer', () => {
    const big = Buffer.concat([pdfHeader, Buffer.alloc(MAX_RECEIPT_BYTES)])
    expect(validateReceiptPdf(big)).toEqual({ ok: false, error: 'too_large' })
  })

  it('rejects an empty buffer', () => {
    expect(validateReceiptPdf(Buffer.alloc(0))).toEqual({ ok: false, error: 'not_pdf' })
  })
})
