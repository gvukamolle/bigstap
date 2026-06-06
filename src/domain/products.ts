export type ProductSaleStatus = 'in_stock' | 'preorder' | 'sold_out' | 'hidden'

export type ProductBase = {
  slug: string
  title: string
  dropName: string
  category: string
  price: number
  salePrice?: number
  saleStatus: ProductSaleStatus
  shortDescription: string
  description: string
  image: {
    src: string
    alt: string
  }
  gallery?: ReadonlyArray<{
    src: string
    alt: string
    label: string
  }>
  imageTone: 'black' | 'stone' | 'charcoal' | 'cream'
  preorderNote?: string
  published: boolean
}

export type ProductSize = {
  label: string
  stock: number
}

export type SizedProduct = ProductBase & {
  type: 'sized'
  sizes: ReadonlyArray<ProductSize>
}

export type OneSizeProduct = ProductBase & {
  type: 'one_size'
  stock: number
}

export type Product = SizedProduct | OneSizeProduct

const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * URL-safe product slug: lowercase latin letters, digits and single hyphens
 * (kebab-case), no leading/trailing hyphen. Guards storefront links from
 * broken values like "?" that would produce `/shop/?`.
 */
export function isValidProductSlug(value: unknown): value is string {
  return typeof value === 'string' && PRODUCT_SLUG_PATTERN.test(value)
}

export function getDisplayPrice(product: Product): number {
  return product.salePrice ?? product.price
}

export function isSelectableSize(product: Product, size: string | null): boolean {
  if (product.type === 'one_size') return size === null && Number.isFinite(product.stock) && product.stock > 0

  return product.sizes.some((item) => item.label === size && Number.isFinite(item.stock) && item.stock > 0)
}
