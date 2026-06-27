// src/lib/receiptFile.ts

// PDF-чек принимаем по магической сигнатуре, а не по Content-Type (его легко подделать).
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024 // 10 МБ

const PDF_SIGNATURE = Buffer.from('%PDF-')

export type ReceiptFileError = 'not_pdf' | 'too_large'

export function validateReceiptPdf(buffer: Buffer): { ok: true } | { ok: false; error: ReceiptFileError } {
  if (buffer.length > MAX_RECEIPT_BYTES) return { ok: false, error: 'too_large' }
  if (buffer.length < PDF_SIGNATURE.length) return { ok: false, error: 'not_pdf' }
  if (!buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    return { ok: false, error: 'not_pdf' }
  }
  return { ok: true }
}
