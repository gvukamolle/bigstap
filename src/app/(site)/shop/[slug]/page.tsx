import { notFound } from 'next/navigation'

import { AddToCartForm } from '@/components/AddToCartForm'
import { StatusPill } from '@/components/StatusPill'
import { getProductBySlug, getPublishedProducts } from '@/data/products'
import { productAssurances } from '@/data/retail'
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
        <div className="productDetailMedia" aria-label="Фотографии товара">
          {(product.gallery ?? [{ ...product.image, label: 'Фото' }]).map((image) => (
            <figure className="productDetailFrame" key={image.src}>
              <div
                className={`productDetailImage tone-${product.imageTone}`}
                role="img"
                aria-label={image.alt}
                style={{ backgroundImage: `url(${image.src})` }}
              />
              <figcaption>{image.label}</figcaption>
            </figure>
          ))}
        </div>

        <div className="productDetailInfo">
          <span className="eyebrow">Дроп / {product.category}</span>
          <h1>{product.dropName}</h1>
          <div className="productDetailMeta">
            <strong>{formatRubles(getDisplayPrice(product))}</strong>
            <StatusPill status={product.saleStatus} />
          </div>
          <p>{product.description}</p>
          {product.preorderNote ? <p className="preorderNote">{product.preorderNote}</p> : null}
          <ul className="productAssurances">
            {productAssurances.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <AddToCartForm product={product} />
        </div>
      </section>
    </div>
  )
}
