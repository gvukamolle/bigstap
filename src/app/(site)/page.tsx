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
        <h1 className="visuallyHidden">ТЕСТ 01 — Grushko Stepan. Try Explore Create Try again.</h1>
        <Link href="/shop" className="heroLink" aria-label="ТЕСТ 01 — смотреть магазин">
          <picture>
            <source media="(max-width: 560px)" srcSet="/images/bigstep/hero-look-mobile.jpg" />
            <img
              className="heroImage"
              src="/images/bigstep/hero-look-desktop.jpg"
              alt="ТЕСТ 01 — Try Explore Create Try again. Grushko Stepan."
              width={2000}
              height={952}
            />
          </picture>
        </Link>
      </section>

      <section className="section">
        <div className="sectionHeader">
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
