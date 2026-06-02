import { describe, expect, it } from 'vitest'

import { filterAndSortProducts, getCatalogFacets } from '../../src/domain/catalog'
import { products } from '../../src/data/products'
import type { Product } from '../../src/domain/products'

describe('catalog domain', () => {
  it('keeps test apparel on the shared S M L size grid', () => {
    const sizedProducts = products.filter((product) => product.type === 'sized')

    expect(sizedProducts).not.toHaveLength(0)
    for (const product of sizedProducts) {
      expect(product.sizes.map((size) => size.label)).toEqual(['S', 'M', 'L'])
    }
  })

  it('filters products by drop and searchable product copy', () => {
    const result = filterAndSortProducts(products, {
      dropName: 'ТЕСТ 01',
      search: 'камуфляж'
    })

    expect(result.map((product) => product.slug)).toEqual(['test-01'])
  })

  it('sorts products by price and drop name without mutating input', () => {
    const catalog: Product[] = [
      { ...products[0]!, slug: 'b', dropName: 'DROP B', price: 9000 },
      { ...products[1]!, slug: 'a', dropName: 'DROP A', price: 5000 }
    ]

    expect(filterAndSortProducts(catalog, { sort: 'price-asc' }).map((product) => product.slug)).toEqual([
      'a',
      'b'
    ])
    expect(filterAndSortProducts(catalog, { sort: 'drop-asc' }).map((product) => product.slug)).toEqual([
      'a',
      'b'
    ])
    expect(catalog.map((product) => product.slug)).toEqual(['b', 'a'])
  })

  it('exposes unique drop and category facets', () => {
    expect(getCatalogFacets(products)).toEqual({
      categories: ['Футболка'],
      drops: ['ТЕСТ 00', 'ТЕСТ 01']
    })
  })
})
