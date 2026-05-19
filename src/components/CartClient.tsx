'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import {
  calculateCartTotals,
  formatRubles,
  removeCartItem,
  type CartItem,
  updateCartItemQuantity
} from '@/domain/cart'
import type { ProductSaleStatus } from '@/domain/products'

const storageKey = 'bigstep-cart'
const cartUpdatedEvent = 'bigstep-cart-updated'

const saleStatuses: readonly ProductSaleStatus[] = ['in_stock', 'preorder', 'sold_out', 'hidden']

const saleStatusLabels: Record<ProductSaleStatus, string> = {
  in_stock: 'В наличии',
  preorder: 'Предзаказ',
  sold_out: 'Нет в наличии',
  hidden: 'Недоступно'
}

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

function dispatchCartUpdated() {
  window.dispatchEvent(new Event(cartUpdatedEvent))
}

export function CartClient() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const totals = useMemo(() => calculateCartTotals(cart), [cart])

  useEffect(() => {
    function refreshCart() {
      setCart(readCart())
      setIsReady(true)
    }

    refreshCart()
    window.addEventListener(cartUpdatedEvent, refreshCart)
    window.addEventListener('storage', refreshCart)

    return () => {
      window.removeEventListener(cartUpdatedEvent, refreshCart)
      window.removeEventListener('storage', refreshCart)
    }
  }, [])

  function persistCart(nextCart: CartItem[]) {
    setCart(nextCart)
    setStorageError(null)

    if (!writeCart(nextCart)) {
      setStorageError('Не удалось сохранить корзину. Проверьте настройки браузера.')
      return
    }

    dispatchCartUpdated()
  }

  function handleQuantityChange(id: string, value: string) {
    if (value.trim() === '') return

    const quantity = Number(value)
    persistCart(updateCartItemQuantity(cart, id, quantity))
  }

  if (!isReady) {
    return (
      <section className="cartLayout" aria-live="polite">
        <p className="formNote">Загружаем корзину.</p>
      </section>
    )
  }

  if (cart.length === 0) {
    return (
      <section className="cartLayout">
        <div className="checkoutPanel">
          <h2>Корзина пустая</h2>
          <p>Выберите вещь из витрины, чтобы продолжить оформление.</p>
          <Link className="button" href="/shop">
            В магазин
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="cartLayout">
      <div className="cartLines" aria-label="Товары в корзине">
        {cart.map((item) => (
          <article className="cartLine" key={item.id}>
            <div className="cartLineMeta">
              <h2>{item.title}</h2>
              <div>
                <span>{item.size ?? 'One size'}</span>
                <span>{saleStatusLabels[item.saleStatus]}</span>
              </div>
            </div>

            <label className="cartQuantity">
              <span>Кол-во</span>
              <input
                inputMode="numeric"
                min="1"
                onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                type="number"
                value={item.quantity}
              />
            </label>

            <strong className="cartLineTotal">{formatRubles(item.price * item.quantity)}</strong>

            <button
              className="buttonSecondary"
              onClick={() => persistCart(removeCartItem(cart, item.id))}
              type="button"
            >
              Удалить
            </button>
          </article>
        ))}
      </div>

      <aside className="cartSummary" aria-label="Итого">
        <h2>Итого</h2>

        {totals.hasPreorder ? (
          <p className="preorderNote" role="status">
            В корзине есть предзаказ. Сроки отправки могут отличаться от товаров в наличии.
          </p>
        ) : null}

        <div className="summaryRow">
          <span>Товары</span>
          <strong>{formatRubles(totals.itemsTotal)}</strong>
        </div>
        <div className="summaryRow">
          <span>Доставка</span>
          <strong>На checkout</strong>
        </div>
        <div className="summaryRow summaryRowTotal">
          <span>К оплате</span>
          <strong>{formatRubles(totals.orderTotal)}</strong>
        </div>

        {storageError ? (
          <p className="formError" role="alert">
            {storageError}
          </p>
        ) : null}

        <Link className="button" href="/checkout">
          Перейти к оформлению
        </Link>
      </aside>
    </section>
  )
}
