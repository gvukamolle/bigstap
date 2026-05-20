import { ProductCard } from '@/components/ProductCard'
import { getPublishedProducts } from '@/data/products'

export default function ShopPage() {
  const products = getPublishedProducts()

  return (
    <div className="page">
      <section className="shopIntro">
        <span className="eyebrow">Магазин</span>
        <h1 className="display">Дропы</h1>
        <p>
          Сейчас на витрине два отдельных дропа: ТЕСТ 00 и ТЕСТ 01. В каждом дропе — одна
          футболка с видом спереди и со спины.
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
