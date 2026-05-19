'use client'

import { type FormEvent, useState } from 'react'

import { addCartItem, type CartError, type CartItem } from '@/domain/cart'
import { isSelectableSize, type Product, type ProductSaleStatus } from '@/domain/products'

const storageKey = 'bigstep-cart'
const cartUpdatedEvent = 'bigstep-cart-updated'

const cartErrorMessages: Record<CartError, string> = {
  PRODUCT_UNAVAILABLE: 'Эту вещь сейчас нельзя добавить в корзину.',
  SIZE_REQUIRED: 'Выберите размер.',
  SIZE_UNAVAILABLE: 'Этот размер сейчас недоступен.',
  SIZE_NOT_ALLOWED: 'Для этой вещи размер выбирать не нужно.',
  OUT_OF_STOCK: 'В корзине уже максимальное доступное количество.'
}

const saleStatuses: readonly ProductSaleStatus[] = ['in_stock', 'preorder', 'sold_out', 'hidden']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isProductSaleStatus(value: unknown): value is ProductSaleStatus {
  return typeof value === 'string' && saleStatuses.includes(value as ProductSaleStatus)
}

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    typeof value.productSlug === 'string' &&
    typeof value.title === 'string' &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price) &&
    value.price >= 0 &&
    typeof value.quantity === 'number' &&
    Number.isSafeInteger(value.quantity) &&
    value.quantity > 0 &&
    (typeof value.size === 'string' || value.size === null) &&
    isProductSaleStatus(value.saleStatus)
  )
}

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isCartItem)
  } catch {
    return []
  }
}

function writeCart(cart: CartItem[]): boolean {
  if (typeof window === 'undefined') return false

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cart))
    return true
  } catch {
    return false
  }
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNote(null)

    if (!canSubmit) {
      setError(
        hasSelectableSize
          ? 'Эту вещь сейчас нельзя добавить в корзину.'
          : 'Нет доступных размеров для добавления.'
      )
      return
    }

    const result = addCartItem(readCart(), product, selectedSize)

    if (!result.ok) {
      setError(cartErrorMessages[result.error])
      return
    }

    if (!writeCart(result.cart)) {
      setError('Не удалось сохранить корзину. Проверьте настройки браузера.')
      return
    }

    window.dispatchEvent(new Event(cartUpdatedEvent))
    setError(null)
    setNote('Добавлено. Корзина сохранена на этом устройстве.')
  }

  return (
    <form className="addToCart" onSubmit={handleSubmit}>
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

      <button className="button" disabled={!canSubmit} type="submit">
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
    </form>
  )
}
