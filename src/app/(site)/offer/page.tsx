import type { Metadata } from 'next'

import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Публичная оферта',
  description: 'Условия публичной оферты интернет-магазина Grushko Stepan.',
  alternates: { canonical: getCanonicalUrl('/offer') },
  openGraph: { url: getCanonicalUrl('/offer') }
}

export default function OfferPage() {
  return (
    <div className="page">
      <article className="article">
        <h1 className="display">Публичная оферта</h1>
        <p>
          Здесь будет размещён полный текст публичной оферты интернет-магазина Grushko Stepan.
          Раздел находится в подготовке — актуальная редакция появится перед запуском продаж.
        </p>
        <p>
          По вопросам оформления и условий заказа свяжитесь с нами удобным способом.
        </p>
      </article>
    </div>
  )
}
