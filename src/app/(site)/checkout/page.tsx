import type { Metadata } from 'next'

import { CheckoutClient } from '@/components/CheckoutClient'
import { getCatalogProducts } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Оформление',
  description: 'Прототип оформления заказа Grushko Stepan: контакты, СДЭК и оплата.',
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const products = await getCatalogProducts()

  return (
    <div className="page">
      <section className="shopIntro">
        <h1 className="display">Оформление</h1>
        <p>Прототип оформления: контакты, пункт выдачи СДЭК и заглушка оплаты Юкасса.</p>
      </section>
      <CheckoutClient products={products} />
    </div>
  )
}
