import Link from 'next/link'

import { formatRubles } from '@/domain/cart'
import { getDisplayPrice, type Product } from '@/domain/products'

import { StatusPill } from './StatusPill'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link className="productCard" href={`/shop/${product.slug}`}>
      <div className={`productImage tone-${product.imageTone}`} aria-hidden="true" />
      <div className="productMeta">
        <div>
          <h3>{product.title}</h3>
          <p>{product.shortDescription}</p>
        </div>
        <div className="productBottom">
          <span>{formatRubles(getDisplayPrice(product))}</span>
          <StatusPill status={product.saleStatus} />
        </div>
      </div>
    </Link>
  )
}
