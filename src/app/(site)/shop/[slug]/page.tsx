import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AddToCartForm } from '@/components/AddToCartForm'
import { ProductGallery } from '@/components/ProductGallery'
import { StatusPill } from '@/components/StatusPill'
import { formatRubles } from '@/domain/formatting'
import { getDisplayPrice, type Product, type ProductSaleStatus } from '@/domain/products'
import { getCatalogProductBySlug, getCatalogProducts } from '@/lib/catalog'
import { getAbsoluteAssetUrl, getCanonicalUrl } from '@/lib/siteUrl'

const availabilityBySaleStatus: Record<ProductSaleStatus, string> = {
  in_stock: 'https://schema.org/InStock',
  preorder: 'https://schema.org/PreOrder',
  sold_out: 'https://schema.org/OutOfStock',
  hidden: 'https://schema.org/Discontinued'
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getCatalogProductBySlug(slug)
  if (!product) return {}

  const title = product.title
  const description = product.shortDescription
  const productUrl = getCanonicalUrl(`/shop/${product.slug}`)
  const imageUrl = getAbsoluteAssetUrl(product.image.src)

  return {
    title,
    description,
    alternates: { canonical: productUrl },
    openGraph: {
      type: 'website',
      url: productUrl,
      title: `${title} | Grushko Stepan`,
      description,
      locale: 'ru_RU',
      siteName: 'Grushko Stepan',
      images: [{ url: imageUrl, alt: product.image.alt }]
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Grushko Stepan`,
      description,
      images: [imageUrl]
    }
  }
}

function buildProductJsonLd(product: Product) {
  const productUrl = getCanonicalUrl(`/shop/${product.slug}`)
  const imageUrl = getAbsoluteAssetUrl(product.image.src)
  const displayPrice = getDisplayPrice(product)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: imageUrl,
    sku: product.slug,
    category: product.category,
    brand: { '@type': 'Brand', name: 'Grushko Stepan' },
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
  const catalogProducts = await getCatalogProducts()
  const product = catalogProducts.find((item) => item.slug === slug)

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
          <h1>{product.title}</h1>
          <div className="productDetailMeta">
            <strong>{formatRubles(getDisplayPrice(product))}</strong>
            <StatusPill status={product.saleStatus} />
          </div>
          <p>{product.description}</p>
          {product.preorderNote ? <p className="preorderNote">{product.preorderNote}</p> : null}
          <AddToCartForm catalogProducts={catalogProducts} product={product} />
          {product.sizeChart ? (
            <div className="sizeChart">
              <h2>Размерная сетка</h2>
              {/* Обычный img — таблица размеров целиком, без обрезки. */}
              <img src={product.sizeChart.src} alt={product.sizeChart.alt} loading="lazy" />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
