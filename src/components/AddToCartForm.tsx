'use client'

import { useState } from 'react'

import { products } from '@/data/products'
import { addCartItem, type CartError } from '@/domain/cart'
import { isSelectableSize, type Product } from '@/domain/products'
import { dispatchCartUpdated, readCartStorage, writeCartStorage } from '@/lib/cartStorage'

const cartErrorMessages: Record<CartError, string> = {
  PRODUCT_UNAVAILABLE: 'Эту вещь сейчас нельзя добавить в корзину.',
  SIZE_REQUIRED: 'Выберите размер.',
  SIZE_UNAVAILABLE: 'Этот размер сейчас недоступен.',
  SIZE_NOT_ALLOWED: 'Для этой вещи размер выбирать не нужно.',
  OUT_OF_STOCK: 'В корзине уже максимальное доступное количество.'
}

function hasFiniteStock(stock: number): boolean {
  return Number.isFinite(stock) && stock > 0
}

function getDefaultSize(product: Product): string | null {
  if (product.type === 'one_size') return null

  return product.sizes.find((size) => hasFiniteStock(size.stock))?.label ?? null
}

function productCanBeAdded(product: Product): boolean {
  return product.published && product.saleStatus !== 'sold_out' && product.saleStatus !== 'hidden'
}

export function AddToCartForm({ product }: { product: Product }) {
  const [size, setSize] = useState<string | null>(() => getDefaultSize(product))
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedSize = product.type === 'sized' ? size : null
  const hasSelectableSize =
    product.type === 'one_size' || product.sizes.some((item) => hasFiniteStock(item.stock))
  const canSubmit =
    productCanBeAdded(product) &&
    (product.type === 'one_size'
      ? isSelectableSize(product, null)
      : isSelectableSize(product, selectedSize))

  function handleAddToCart() {
    setNote(null)

    if (!canSubmit) {
      setError(
        hasSelectableSize
          ? 'Эту вещь сейчас нельзя добавить в корзину.'
          : 'Нет доступных размеров для добавления.'
      )
      return
    }

    const result = addCartItem(readCartStorage(products), product, selectedSize)

    if (!result.ok) {
      setError(cartErrorMessages[result.error])
      return
    }

    if (!writeCartStorage(result.cart)) {
      setError('Не удалось сохранить корзину. Проверьте настройки браузера.')
      return
    }

    dispatchCartUpdated()
    setError(null)
    setNote('Добавлено. Корзина сохранена на этом устройстве.')
  }

  return (
    <div className="addToCart">
      {product.type === 'sized' ? (
        <label>
          <span>Размер</span>
          <select
            disabled={!hasSelectableSize}
            onChange={(event) => setSize(event.target.value || null)}
            value={size ?? ''}
          >
            {!hasSelectableSize ? <option value="">Нет доступных размеров</option> : null}
            {product.sizes.map((item) => {
              const available = hasFiniteStock(item.stock)

              return (
                <option disabled={!available} key={item.label} value={item.label}>
                  {available ? item.label : `${item.label} - нет`}
                </option>
              )
            })}
          </select>
        </label>
      ) : (
        <div className="oneSize">
          <span>Размер</span>
          <strong>Без размера</strong>
        </div>
      )}

      <button className="button" disabled={!canSubmit} onClick={handleAddToCart} type="button">
        {canSubmit ? 'Добавить в корзину' : 'Недоступно'}
      </button>

      {note ? (
        <p aria-live="polite" className="formNote" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p className="formError" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
