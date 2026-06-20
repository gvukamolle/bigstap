import Link from 'next/link'

import { formatRubles } from '@/domain/formatting'
import { getDisplayPrice, type Product } from '@/domain/products'

import { StatusPill } from './StatusPill'

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="productCard">
      <div
        className={`productImage tone-${product.imageTone}`}
        role="img"
        aria-label={product.image.alt}
        style={{ backgroundImage: `url(${product.image.src})` }}
      />
      <div className="productMeta">
        <div>
          <h3>
            <Link href={`/shop/${product.slug}`} className="productCardLink">
              {product.title}
            </Link>
          </h3>
        </div>
        <div className="productBottom">
          <span>{formatRubles(getDisplayPrice(product))}</span>
          <StatusPill status={product.saleStatus} />
        </div>
      </div>
    </article>
  )
}
