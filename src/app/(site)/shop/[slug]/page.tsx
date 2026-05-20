import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AddToCartForm } from '@/components/AddToCartForm'
import { ProductGallery } from '@/components/ProductGallery'
import { StatusPill } from '@/components/StatusPill'
import { getProductBySlug, getPublishedProducts } from '@/data/products'
import { formatRubles } from '@/domain/formatting'
import { getDisplayPrice, type Product, type ProductSaleStatus } from '@/domain/products'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'

const availabilityBySaleStatus: Record<ProductSaleStatus, string> = {
  in_stock: 'https://schema.org/InStock',
  preorder: 'https://schema.org/PreOrder',
  sold_out: 'https://schema.org/OutOfStock',
  hidden: 'https://schema.org/Discontinued'
}

export function generateStaticParams() {
  return getPublishedProducts().map((product) => ({ slug: product.slug }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) return {}

  const title = product.title
  const description = product.shortDescription
  const productUrl = `${siteUrl}/shop/${product.slug}`
  const imageUrl = product.image.src.startsWith('http')
    ? product.image.src
    : `${siteUrl}${product.image.src}`

  return {
    title,
    description,
    alternates: { canonical: productUrl },
    openGraph: {
      type: 'website',
      url: productUrl,
      title: `${title} | BIGSTEP.RU`,
      description,
      locale: 'ru_RU',
      siteName: 'BIGSTEP.RU',
      images: [{ url: imageUrl, alt: product.image.alt }]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | BIGSTEP.RU`,
      description,
      images: [imageUrl]
    }
  }
}

function buildProductJsonLd(product: Product) {
  const productUrl = `${siteUrl}/shop/${product.slug}`
  const imageUrl = product.image.src.startsWith('http')
    ? product.image.src
    : `${siteUrl}${product.image.src}`
  const displayPrice = getDisplayPrice(product)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: imageUrl,
    sku: product.slug,
    category: product.category,
    brand: { '@type': 'Brand', name: 'BIGSTEP' },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'RUB',
      price: displayPrice,
      availability: availabilityBySaleStatus[product.saleStatus],
      itemCondition: 'https://schema.org/NewCondition'
    }
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const jsonLd = buildProductJsonLd(product)

  return (
    <div className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
