'use client'

import { useId, useMemo, useState } from 'react'

import { filterAndSortProducts, type CatalogSort } from '@/domain/catalog'
import type { Product } from '@/domain/products'

import { CustomSelect } from './CustomSelect'
import { ProductCard } from './ProductCard'

const sortOptions = [
  { value: 'featured', label: 'По умолчанию' },
  { value: 'price-asc', label: 'Сначала дешевле' },
  { value: 'price-desc', label: 'Сначала дороже' },
  { value: 'title-asc', label: 'По названию' }
] as const

const catalogSorts: readonly CatalogSort[] = ['featured', 'price-asc', 'price-desc', 'title-asc']

function toCatalogSort(value: string): CatalogSort {
  return catalogSorts.includes(value as CatalogSort) ? (value as CatalogSort) : 'featured'
}

export function ProductCatalog({ products }: { products: Product[] }) {
  const searchId = useId()
  const sortId = useId()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<CatalogSort>('featured')

  const visibleProducts = useMemo(
    () => filterAndSortProducts(products, { category: '', dropName: '', search, sort }),
    [products, search, sort]
  )
  const hasActiveFilters = Boolean(search.trim() || sort !== 'featured')

  return (
    <section className="catalog" aria-label="Товары">
      <div className="catalogToolbar">
        <label className="catalogField catalogFieldSearch" htmlFor={searchId}>
          <span>Поиск</span>
          <input
            id={searchId}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Название товара"
            type="search"
            value={search}
          />
        </label>

        <label className="catalogField" htmlFor={sortId}>
          <span>Сортировка</span>
          <CustomSelect
            id={sortId}
            onChange={(next) => setSort(toCatalogSort(next))}
            options={sortOptions}
            value={sort}
          />
        </label>

        {hasActiveFilters ? (
          <button
            className="buttonSecondary catalogReset"
            onClick={() => {
              setSearch('')
              setSort('featured')
            }}
            type="button"
          >
            Сбросить
          </button>
        ) : null}
      </div>

      <div className="catalogResultBar" aria-live="polite">
        <span>{visibleProducts.length} товаров</span>
      </div>

      {visibleProducts.length > 0 ? (
        <div className="grid">
          {visibleProducts.map((product) => (
            <ProductCard product={product} key={product.slug} />
          ))}
        </div>
      ) : (
        <p className="catalogEmpty">Ничего не найдено.</p>
      )}
    </section>
  )
}
