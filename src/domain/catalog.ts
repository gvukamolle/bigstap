import type { Product } from './products'

export type CatalogSort = 'featured' | 'price-asc' | 'price-desc' | 'title-asc' | 'drop-asc'

export type CatalogFilters = {
  search?: string
  dropName?: string
  category?: string
  sort?: CatalogSort
}

export type CatalogFacets = {
  drops: string[]
  categories: string[]
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('ru-RU')
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'ru-RU', { sensitivity: 'base' })
}

function searchableText(product: Product): string {
  return normalize(
    [
      product.title,
      product.dropName,
      product.category,
      product.shortDescription,
      product.description,
      product.saleStatus
    ].join(' ')
  )
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim()).map((value) => value.trim()))).sort(
    compareText
  )
}

export function getCatalogFacets(products: readonly Product[]): CatalogFacets {
  return {
    drops: uniqueSorted(products.map((product) => product.dropName)),
    categories: uniqueSorted(products.map((product) => product.category))
  }
}

export function filterAndSortProducts(
  products: readonly Product[],
  filters: CatalogFilters = {}
): Product[] {
  const search = normalize(filters.search)
  const dropName = normalize(filters.dropName)
  const category = normalize(filters.category)
  const sort = filters.sort ?? 'featured'

  const filtered = products.filter((product) => {
    if (dropName && normalize(product.dropName) !== dropName) return false
    if (category && normalize(product.category) !== category) return false
    if (search && !searchableText(product).includes(search)) return false

    return true
  })

  return [...filtered].sort((left, right) => {
    if (sort === 'price-asc') return left.price - right.price || compareText(left.title, right.title)
    if (sort === 'price-desc') return right.price - left.price || compareText(left.title, right.title)
    if (sort === 'title-asc') return compareText(left.title, right.title)
    if (sort === 'drop-asc') {
      return compareText(left.dropName, right.dropName) || compareText(left.title, right.title)
    }

    return 0
  })
}
