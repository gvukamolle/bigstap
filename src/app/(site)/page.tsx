import Link from 'next/link'

import { ProductCard } from '@/components/ProductCard'
import { getPublishedProducts } from '@/data/products'

export default function HomePage() {
  const featuredProducts = getPublishedProducts().slice(0, 4)

  return (
    <div className="page">
      <section className="homeHero">
        <div className="homeCopy">
          <h1 className="display">Свой шмот. Тихая сила.</h1>
          <p>
            BIGSTEP делает собственный шмот для спокойного городского ритма. Сейчас в витрине два
            отдельных дропа: ТЕСТ 00 и ТЕСТ 01.
          </p>
          <Link className="button" href="/shop">
            Смотреть магазин
          </Link>
        </div>
        <div
          className="homeImage"
          role="img"
          aria-label="Студийная витрина BIGSTEP с одеждой первого дропа"
        />
      </section>

      <section className="section">
        <div className="sectionHeader">
          <span className="eyebrow">Витрина</span>
          <h2>Дропы</h2>
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
