'use client'

import { useEffect, useRef, useState } from 'react'

import { formatRubles } from '@/domain/formatting'

export type PaymentLink = { label: string; url: string }

type PaymentModalProps = {
  total: number
  qrImageUrl: string | null
  recipientHint: string | null
  paymentLinks: PaymentLink[]
  submitting: boolean
  onConfirm: (receipt: File) => void
  onClose: () => void
}

const MAX_BYTES = 10 * 1024 * 1024

export function PaymentModal({
  total,
  qrImageUrl,
  recipientHint,
  paymentLinks,
  submitting,
  onConfirm,
  onClose
}: PaymentModalProps) {
  const [receipt, setReceipt] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  // Фолбэк на execCommand: clipboard API недоступен без https/user activation
  // (например, во встроенном браузере Telegram, откуда приходят покупатели).
  function copyViaExecCommand(text: string): boolean {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    textarea.remove()
    return ok
  }

  async function copyAmount() {
    const text = String(total)
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      ok = copyViaExecCommand(text)
    }

    if (!ok) {
      setError('Не удалось скопировать сумму. Введите её вручную.')
      return
    }

    setError(null)
    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

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
        ) : null}
        {recipientHint ? <p className="paymentHint">Получатель: {recipientHint}</p> : null}

        <button
          className="paymentAmountCopy"
          type="button"
          onClick={copyAmount}
          aria-live="polite"
        >
          <span className="paymentAmountLabel">Сумма перевода</span>
          <strong className="paymentAmountValue">{formatRubles(total)}</strong>
          <span className="paymentAmountAction">
            {copied ? 'Скопировано ✓' : 'Нажмите, чтобы скопировать'}
          </span>
        </button>

        {paymentLinks.length > 0 ? (
          <div className="paymentBanks">
            <span className="paymentBanksLabel">Или откройте оплату в приложении банка:</span>
            {paymentLinks.map((bank) => (
              <a
                className="paymentBankButton"
                href={bank.url}
                key={bank.label}
                rel="noopener noreferrer"
                target="_blank"
              >
                {bank.label}
              </a>
            ))}
          </div>
        ) : null}

        <div className="paymentUpload">
          <span className="paymentUploadLabel">После оплаты прикрепите PDF-чек:</span>
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
