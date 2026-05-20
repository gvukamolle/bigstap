import type { Metadata } from 'next'

import { CartClient } from '@/components/CartClient'

export const metadata: Metadata = {
  title: 'Корзина',
  description: 'Состав заказа BIGSTEP: проверьте товары и количество перед оформлением.',
  robots: { index: false, follow: false }
}

export default function CartPage() {
  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Корзина</span>
        <h1 className="display">Корзина</h1>
        <p>Проверьте состав заказа, количество и предзаказы перед оформлением.</p>
      </section>

      <CartClient />
    </div>
  )
}
