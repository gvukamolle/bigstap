'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { products } from '@/data/products'
import {
  calculateCartTotals,
  formatRubles,
  removeCartItem,
  sanitizeCart,
  type CartItem,
  updateCartItemQuantity
} from '@/domain/cart'
import type { ProductSaleStatus } from '@/domain/products'
import {
  cartUpdatedEvent,
  dispatchCartUpdated,
  readCartStorage,
  writeCartStorage
} from '@/lib/cartStorage'

const saleStatusLabels: Record<ProductSaleStatus, string> = {
  in_stock: 'В наличии',
  preorder: 'Предзаказ',
  sold_out: 'Нет в наличии',
  hidden: 'Недоступно'
}

export function CartClient() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const totals = useMemo(() => calculateCartTotals(cart), [cart])

  useEffect(() => {
    function refreshCart() {
      const sanitizedCart = readCartStorage(products)

      setCart(sanitizedCart)
      writeCartStorage(sanitizedCart)
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
    const sanitizedCart = sanitizeCart(nextCart, products)

    setCart(sanitizedCart)
    setStorageError(null)

    if (!writeCartStorage(sanitizedCart)) {
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

  function changeQuantity(id: string, nextQuantity: number) {
    persistCart(updateCartItemQuantity(cart, id, nextQuantity))
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
              <h2>
                <Link href={`/shop/${item.productSlug}`}>{item.title}</Link>
              </h2>
              <div>
                <span>{item.size ?? 'Без размера'}</span>
                <span>{saleStatusLabels[item.saleStatus]}</span>
              </div>
            </div>

            <label className="cartQuantity">
              <span>Кол-во</span>
              <span className="quantityControl">
                <button
                  aria-label={`Уменьшить количество: ${item.title}`}
                  onClick={() => changeQuantity(item.id, item.quantity - 1)}
                  type="button"
                >
                  -
                </button>
                <input
                  inputMode="numeric"
                  min="1"
                  onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                  type="number"
                  value={item.quantity}
                />
                <button
                  aria-label={`Увеличить количество: ${item.title}`}
                  onClick={() => changeQuantity(item.id, item.quantity + 1)}
                  type="button"
                >
                  +
                </button>
              </span>
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

        <ul className="summaryNotes">
          <li>Оформление без личного кабинета.</li>
          <li>Корзина сохраняется на этом устройстве.</li>
          <li>Пункт СДЭК и доставка выбираются до оплаты.</li>
        </ul>

        <div className="summaryRow">
          <span>Товары</span>
          <strong>{formatRubles(totals.itemsTotal)}</strong>
        </div>
        <div className="summaryRow">
          <span>Доставка</span>
          <strong>При оформлении</strong>
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
