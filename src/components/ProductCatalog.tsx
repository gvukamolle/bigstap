'use client'

import { useId, useMemo, useState } from 'react'

import {
  filterAndSortProducts,
  getCatalogFacets,
  type CatalogSort
} from '@/domain/catalog'
import type { Product } from '@/domain/products'

import { CustomSelect } from './CustomSelect'
import { ProductCard } from './ProductCard'

const sortOptions = [
  { value: 'featured', label: 'По умолчанию' },
  { value: 'drop-asc', label: 'По дропу' },
  { value: 'price-asc', label: 'Сначала дешевле' },
  { value: 'price-desc', label: 'Сначала дороже' },
  { value: 'title-asc', label: 'По названию' }
] as const

const catalogSorts: readonly CatalogSort[] = [
  'featured',
  'drop-asc',
  'price-asc',
  'price-desc',
  'title-asc'
]

function toCatalogSort(value: string): CatalogSort {
  return catalogSorts.includes(value as CatalogSort) ? (value as CatalogSort) : 'featured'
}

export function ProductCatalog({ products }: { products: Product[] }) {
  const searchId = useId()
  const dropId = useId()
  const categoryId = useId()
  const sortId = useId()
  const [search, setSearch] = useState('')
  const [dropName, setDropName] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<CatalogSort>('featured')

  const facets = useMemo(() => getCatalogFacets(products), [products])
  const visibleProducts = useMemo(
    () => filterAndSortProducts(products, { category, dropName, search, sort }),
    [category, dropName, products, search, sort]
  )
  const hasActiveFilters = Boolean(search.trim() || dropName || category || sort !== 'featured')

  return (
    <section className="catalog" aria-label="Товары">
      <div className="catalogToolbar">
        <label className="catalogField catalogFieldSearch" htmlFor={searchId}>
          <span>Поиск</span>
          <input
            id={searchId}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Название, дроп, материал"
            type="search"
            value={search}
          />
        </label>

        <label className="catalogField" htmlFor={dropId}>
          <span>Дроп</span>
          <CustomSelect
            id={dropId}
            onChange={setDropName}
            options={[
              { value: '', label: 'Все дропы' },
              ...facets.drops.map((drop) => ({ value: drop, label: drop }))
            ]}
            value={dropName}
          />
        </label>

        <label className="catalogField" htmlFor={categoryId}>
          <span>Тип</span>
          <CustomSelect
            id={categoryId}
            onChange={setCategory}
            options={[
              { value: '', label: 'Все товары' },
              ...facets.categories.map((item) => ({ value: item, label: item }))
            ]}
            value={category}
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
              setDropName('')
              setCategory('')
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
