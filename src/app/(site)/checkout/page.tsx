import type { Metadata } from 'next'

import { CheckoutClient } from '@/components/CheckoutClient'

export const metadata: Metadata = {
  title: 'Оформление',
  description: 'Прототип оформления заказа BIGSTEP: контакты, СДЭК и оплата.',
  robots: { index: false, follow: false }
}

export default function CheckoutPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Оформление</span>
        <h1 className="display">Оформление</h1>
        <p>Прототип оформления: контакты, пункт выдачи СДЭК и заглушка оплаты Юкасса.</p>
      </section>
      <div
        className="checkoutMood"
        role="img"
        aria-label="Упаковка заказа BIGSTEP перед отправкой"
      />

      <CheckoutClient />
    </div>
  )
}
