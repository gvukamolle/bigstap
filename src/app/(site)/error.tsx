'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function SiteErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Site runtime error', error)
  }, [error])

  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Ошибка</span>
        <h1 className="display">Что-то пошло не так</h1>
        <p>Мы уже знаем о проблеме. Попробуйте обновить страницу или вернуться в магазин.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="button" onClick={() => reset()} type="button">
            Обновить
          </button>
          <Link className="buttonSecondary" href="/shop">
            В магазин
          </Link>
        </div>
      </section>
    </div>
  )
}
