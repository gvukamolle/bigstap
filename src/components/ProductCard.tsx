import Link from 'next/link'

import { formatRubles } from '@/domain/formatting'
import { getDisplayPrice, type Product } from '@/domain/products'

import { StatusPill } from './StatusPill'

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="productCard">
      <Link href={`/shop/${product.slug}`} className="productCardImageLink" aria-label={product.title}>
        <div
          className={`productImage tone-${product.imageTone}`}
          role="img"
          aria-label={product.image.alt}
          style={{ backgroundImage: `url(${product.image.src})` }}
        />
      </Link>
      <div className="productMeta">
        <div>
          <h3>
            <Link href={`/shop/${product.slug}`}>{product.title}</Link>
          </h3>
          <p>{product.shortDescription}</p>
        </div>
        <div className="productBottom">
          <span>{formatRubles(getDisplayPrice(product))}</span>
          <StatusPill status={product.saleStatus} />
        </div>
      </div>
    </article>
  )
}
