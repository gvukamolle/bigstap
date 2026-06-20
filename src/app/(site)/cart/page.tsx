import type { Metadata } from 'next'

import { CartClient } from '@/components/CartClient'
import { getCatalogProducts } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'Корзина',
  description: 'Состав заказа Grushko Stepan: проверьте товары и количество перед оформлением.',
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const products = await getCatalogProducts()

  return (
    <div className="page">
      <section className="shopIntro">
        <h1 className="display">Корзина</h1>
        <p>Проверьте состав заказа, количество и предзаказы перед оформлением.</p>
      </section>

      <CartClient products={products} />
    </div>
  )
}
