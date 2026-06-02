import type { Metadata } from 'next'
import Link from 'next/link'

import { ProductCard } from '@/components/ProductCard'
import { getCatalogProducts } from '@/lib/catalog'
import { getCanonicalUrl } from '@/lib/siteUrl'

export const metadata: Metadata = {
  alternates: { canonical: getCanonicalUrl('/') },
  openGraph: { url: getCanonicalUrl('/') }
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const featuredProducts = (await getCatalogProducts()).slice(0, 4)

  return (
    <div className="page">
      <section className="homeHero">
        <div className="homeCopy">
          <h1 className="display">Свой шмот. Тихая сила.</h1>
          <p>
            Grushko Stepan делает собственный шмот для спокойного городского ритма. Витрина
            собирает вещи из актуальных дропов в один магазин.
          </p>
          <Link className="button" href="/shop">
            Смотреть магазин
          </Link>
        </div>
        <div
          className="homeImage"
          role="img"
          aria-label="Студийная витрина Grushko Stepan с одеждой первого дропа"
        />
      </section>

      <section className="section">
        <div className="sectionHeader">
          <span className="eyebrow">Витрина</span>
          <h2>Товары</h2>
        </div>
        <div className="grid">
          {featuredProducts.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
      </section>
    </div>
  )
}
