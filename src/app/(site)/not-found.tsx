import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Страница не найдена',
  robots: { index: false, follow: false }
}

export default function NotFound() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">404</span>
        <h1 className="display">Страница не найдена</h1>
        <p>Такой страницы нет — возможно, она переехала или ссылка устарела.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <Link className="button" href="/">
            На главную
          </Link>
          <Link className="buttonSecondary" href="/shop">
            В магазин
          </Link>
        </div>
      </section>
    </div>
  )
}
