import { notFound } from 'next/navigation'

import { AddToCartForm } from '@/components/AddToCartForm'
import { ProductGallery } from '@/components/ProductGallery'
import { StatusPill } from '@/components/StatusPill'
import { getProductBySlug, getPublishedProducts } from '@/data/products'
import { formatRubles } from '@/domain/formatting'
import { getDisplayPrice } from '@/domain/products'

export function generateStaticParams() {
  return getPublishedProducts().map((product) => ({ slug: product.slug }))
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  return (
    <div className="page">
      <section className="productDetail">
        <ProductGallery
          images={product.gallery ?? [{ ...product.image, label: 'Фото' }]}
          tone={product.imageTone}
        />

        <div className="productDetailInfo">
          <span className="eyebrow">Дроп / {product.category}</span>
          <h1>{product.dropName}</h1>
          <div className="productDetailMeta">
            <strong>{formatRubles(getDisplayPrice(product))}</strong>
            <StatusPill status={product.saleStatus} />
          </div>
          <p>{product.description}</p>
          {product.preorderNote ? <p className="preorderNote">{product.preorderNote}</p> : null}
          <AddToCartForm product={product} />
        </div>
      </section>
    </div>
  )
}
