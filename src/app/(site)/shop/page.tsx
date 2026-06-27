import type { Metadata } from 'next'

import { ProductCatalog } from '@/components/ProductCatalog'
import { getCatalogProducts } from '@/lib/catalog'
import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  title: 'Магазин',
  description: 'Магазин Grushko Stepan: товары, дропы, размеры и наличие.',
  alternates: { canonical: getCanonicalUrl('/shop') },
  openGraph: { url: getCanonicalUrl('/shop') }
}

export const dynamic = 'force-dynamic'

export default async function ShopPage() {
  const products = await getCatalogProducts()

  return (
    <div className="page">
      <section className="shopIntro">
        <h1 className="display">Товары</h1>
      </section>

      <ProductCatalog products={products} />
    </div>
  )
}
