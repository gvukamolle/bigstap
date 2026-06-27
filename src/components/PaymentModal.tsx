'use client'

import { useRef, useState } from 'react'

import { formatRubles } from '@/domain/formatting'

type PaymentModalProps = {
  total: number
  qrImageUrl: string | null
  recipientHint: string | null
  submitting: boolean
  onConfirm: (receipt: File) => void
  onClose: () => void
}

const MAX_BYTES = 10 * 1024 * 1024

export function PaymentModal({
  total,
  qrImageUrl,
  recipientHint,
  submitting,
  onConfirm,
  onClose
}: PaymentModalProps) {
  const [receipt, setReceipt] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(file: File | null) {
    setError(null)
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Чек должен быть в формате PDF.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Файл больше 10 МБ.')
      return
    }
    setReceipt(file)
  }

  return (
    <div className="paymentModalOverlay" role="dialog" aria-modal="true" aria-label="Оплата заказа">
      <div className="paymentModal">
        <button className="paymentModalClose" type="button" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2>К оплате ровно {formatRubles(total)}</h2>

        {qrImageUrl ? (
          <img className="paymentQr" src={qrImageUrl} alt="QR для оплаты по СБП" />
        ) : (
          <p className="formError">QR оплаты не настроен. Напишите нам в Telegram.</p>
        )}
        {recipientHint ? <p className="paymentHint">Получатель: {recipientHint}</p> : null}

        <p className="paymentInstruction">
          Отсканируйте QR в приложении банка. Сумму <strong>введите вручную — ровно {formatRubles(total)}</strong>{' '}
          (статический QR не подставляет сумму). После оплаты прикрепите PDF-чек ниже.
        </p>

        <div className="paymentUpload">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
          />
          {receipt ? <span className="paymentFileName">{receipt.name}</span> : null}
          {error ? <span className="formError">{error}</span> : null}
        </div>

        <button
          className="buttonPrimary"
          type="button"
          disabled={!receipt || submitting}
          onClick={() => receipt && onConfirm(receipt)}
        >
          {submitting ? 'Отправляем…' : 'Завершить'}
        </button>
      </div>
    </div>
  )
}
