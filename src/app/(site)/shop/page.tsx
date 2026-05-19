import { ProductCard } from '@/components/ProductCard'
import { getPublishedProducts } from '@/data/products'

export default function ShopPage() {
  const products = getPublishedProducts()

  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Магазин</span>
        <h1 className="display">Дроп 01</h1>
        <p>
          Собственная одежда с размерной сеткой и безразмерные аксессуары. Вещи в наличии и
          предзаказ можно оформить вместе.
        </p>
      </section>

      <div className="grid">
        {products.map((product) => (
          <ProductCard product={product} key={product.slug} />
        ))}
      </div>
    </div>
  )
}
