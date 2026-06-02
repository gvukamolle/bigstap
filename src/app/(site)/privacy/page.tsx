import type { Metadata } from 'next'

import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description:
    'Политика конфиденциальности и обработки персональных данных интернет-магазина Grushko Stepan.',
  alternates: { canonical: getCanonicalUrl('/privacy') },
  openGraph: { url: getCanonicalUrl('/privacy') }
}

export default function PrivacyPage() {
  return (
    <div className="page">
      <article className="article">
        <h1 className="display">Политика конфиденциальности</h1>
        <p>
          Здесь будет размещён полный текст политики конфиденциальности и обработки персональных
          данных Grushko Stepan. Раздел находится в подготовке — актуальная редакция появится перед
          запуском продаж.
        </p>
        <p>
          Мы обрабатываем персональные данные только для оформления и доставки заказов и не передаём
          их третьим лицам, кроме служб доставки и платёжного провайдера.
        </p>
      </article>
    </div>
  )
}
