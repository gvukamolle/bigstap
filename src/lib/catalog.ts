import { cache } from 'react'

import { getPublishedProducts, products as fixtureProducts } from '@/data/products'
import { isValidProductSlug } from '@/domain/products'
import type { Product, ProductSaleStatus, ProductSize } from '@/domain/products'

const productSaleStatuses: readonly ProductSaleStatus[] = [
  'in_stock',
  'preorder',
  'sold_out',
  'hidden'
]

const productImageTones: readonly Product['imageTone'][] = ['black', 'stone', 'charcoal', 'cream']
const productTypes: readonly Product['type'][] = ['sized', 'one_size']

type PayloadProductDoc = Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberField(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function enumField<T extends string>(value: unknown, allowedValues: readonly T[]): T | null {
  return typeof value === 'string' && allowedValues.includes(value as T) ? (value as T) : null
}

function fixtureBySlug(slug: string): Product | undefined {
  return fixtureProducts.find((product) => product.slug === slug)
}

type GalleryImage = { src: string; alt: string; label: string }

// Фото товара берём из поля `images` (upload hasMany). При depth:1 каждый элемент —
// populated media-документ с `url`. Первое фото считается главным (каталог),
// весь список — галереей на странице товара. alt больше не хранится в Media —
// подставляем название товара.
function galleryFromDoc(value: unknown, title: string): GalleryImage[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index): GalleryImage | null => {
      if (!isRecord(item)) return null

      const src = stringField(item.url)
      if (!src) return null

      return { src, alt: stringField(item.alt) ?? title, label: `Фото ${index + 1}` }
    })
    .filter((image): image is GalleryImage => image !== null)
}

function uploadImageFromDoc(value: unknown, fallbackAlt: string): { src: string; alt: string } | null {
  if (!isRecord(value)) return null

  const src = stringField(value.url)
  if (!src) return null

  return { src, alt: stringField(value.alt) ?? fallbackAlt }
}

function sizesFromDoc(value: unknown): ProductSize[] {
  if (!Array.isArray(value)) return []

  return value
    .map((size): ProductSize | null => {
      if (!isRecord(size)) return null

      const label = stringField(size.label)
      const stock = numberField(size.stock)
      if (!label || stock === null) return null

      return { label, stock }
    })
    .filter((size): size is ProductSize => size !== null)
}

function mapPayloadProduct(doc: PayloadProductDoc): Product | null {
  const slug = stringField(doc.slug)
  const title = stringField(doc.title)
  if (!slug || !title || !isValidProductSlug(slug)) return null

  const fallback = fixtureBySlug(slug)
  const saleStatus =
    enumField(doc.saleStatus, productSaleStatuses) ?? fallback?.saleStatus ?? 'hidden'
  const published = doc.published === true

  if (!published || saleStatus === 'hidden') return null

  const cmsGallery = galleryFromDoc(doc.images, title)
  const firstImage = cmsGallery[0]
  const image = firstImage ? { src: firstImage.src, alt: firstImage.alt } : fallback?.image
  const price = numberField(doc.price) ?? fallback?.price

  if (!image || price === undefined) return null

  const dropName = stringField(doc.dropName) ?? fallback?.dropName ?? title
  const category = stringField(doc.category) ?? fallback?.category ?? 'Товар'
  const shortDescription =
    stringField(doc.shortDescription) ?? fallback?.shortDescription ?? `${title} от Grushko Stepan.`
  const description = stringField(doc.description) ?? fallback?.description ?? shortDescription
  const type = enumField(doc.productType, productTypes) ?? fallback?.type ?? 'sized'
  const imageTone = enumField(doc.imageTone, productImageTones) ?? fallback?.imageTone ?? 'cream'
  const sizeChart = uploadImageFromDoc(doc.sizeChart, `${title} — размерная сетка`) ?? fallback?.sizeChart

  const base = {
    slug,
    title,
    dropName,
    category,
    price,
    salePrice: numberField(doc.salePrice) ?? fallback?.salePrice,
    saleStatus,
    shortDescription,
    description,
    image,
    gallery: cmsGallery.length > 0 ? cmsGallery : (fallback?.gallery ?? [{ ...image, label: 'Фото' }]),
    sizeChart,
    imageTone,
    preorderNote: stringField(doc.preorderNote) ?? fallback?.preorderNote,
    published
  }

  if (type === 'one_size') {
    const stock = numberField(doc.stock) ?? (fallback?.type === 'one_size' ? fallback.stock : 0)

    return {
      ...base,
      type: 'one_size',
      stock
    }
  }

  const cmsSizes = sizesFromDoc(doc.sizes)
  const sizes =
    cmsSizes.length > 0
      ? cmsSizes
      : fallback?.type === 'sized'
        ? fallback.sizes.map((size) => ({ ...size }))
        : []

  if (sizes.length === 0) return null

  return {
    ...base,
    type: 'sized',
    sizes
  }
}

export const getCatalogProducts = cache(async (): Promise<Product[]> => {
  try {
    const [{ default: config }, { getPayload }] = await Promise.all([
      import('../../payload.config'),
      import('payload')
    ])
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'products',
      depth: 1,
      limit: 100,
      sort: 'title',
      where: {
        and: [{ published: { equals: true } }, { saleStatus: { not_equals: 'hidden' } }]
      }
    })

    const cmsProducts = result.docs
      .map((doc) => mapPayloadProduct(doc as unknown as PayloadProductDoc))
      .filter((product): product is Product => product !== null)

    return cmsProducts.length > 0 ? cmsProducts : getPublishedProducts()
  } catch {
    return getPublishedProducts()
  }
})

export async function getCatalogProductBySlug(slug: string): Promise<Product | undefined> {
  return (await getCatalogProducts()).find((product) => product.slug === slug)
}
