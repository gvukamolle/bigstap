export type ProductSaleStatus = 'in_stock' | 'preorder' | 'sold_out' | 'hidden'

export type ProductBase = {
  slug: string
  title: string
  category: string
  price: number
  salePrice?: number
  saleStatus: ProductSaleStatus
  shortDescription: string
  description: string
  imageTone: 'black' | 'stone' | 'charcoal' | 'cream'
  preorderNote?: string
  published: boolean
}

export type SizedProduct = ProductBase & {
  type: 'sized'
  sizes: Array<{
    label: string
    stock: number
  }>
}

export type OneSizeProduct = ProductBase & {
  type: 'one_size'
  stock: number
}

export type Product = SizedProduct | OneSizeProduct

export function getDisplayPrice(product: Product): number {
  return product.salePrice ?? product.price
}

export function isSelectableSize(product: Product, size: string | null): boolean {
  if (product.type === 'one_size') return size === null

  return product.sizes.some((item) => item.label === size && item.stock > 0)
}
