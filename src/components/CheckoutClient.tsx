'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { products } from '@/data/products'
import { calculateCartTotals, formatRubles, sanitizeCart, type CartItem } from '@/domain/cart'
import {
  type CdekPickupPoint,
  type CustomerDetails,
  type CheckoutValidationField,
  type ValidationResult,
  validateCheckoutDraft
} from '@/domain/checkout'

const storageKey = 'bigstep-cart'
const cartUpdatedEvent = 'bigstep-cart-updated'

const prototypePickup: CdekPickupPoint = {
  code: 'MSK123',
  name: 'СДЭК Тверская',
  address: 'Москва, Тверская 1',
  city: 'Москва',
  price: 650
}

function readStoredCart(): readonly unknown[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
  } catch {
    return []
  }
}

function readCart(): CartItem[] {
  return sanitizeCart(readStoredCart(), products)
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

function getValidationMessages(validation: ValidationResult | null): string[] {
  if (!validation) return []
  if (validation.errors.length > 0) return validation.errors.map((error) => error.message)

  return validation.messages
}

function getErrorsByField(
  validation: ValidationResult | null
): Partial<Record<CheckoutValidationField, string[]>> {
  const errorsByField: Partial<Record<CheckoutValidationField, string[]>> = {}

  for (const error of validation?.errors ?? []) {
    errorsByField[error.field] = [...(errorsByField[error.field] ?? []), error.message]
  }

  return errorsByField
}

function getFieldErrorId(field: CheckoutValidationField): string {
  return `checkout-${field}-error`
}

export function CheckoutClient() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)
  const [customer, setCustomer] = useState<CustomerDetails>({
    fullName: '',
    phone: '',
    email: '',
    city: 'Москва'
  })
  const [cdekPickup, setCdekPickup] = useState<CdekPickupPoint | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [paymentPlaceholderVisible, setPaymentPlaceholderVisible] = useState(false)

  const totals = useMemo(() => calculateCartTotals(cart, cdekPickup?.price ?? 0), [cart, cdekPickup])
  const validationMessages = getValidationMessages(validation)
  const errorsByField = useMemo(() => getErrorsByField(validation), [validation])
  const fullNameError = errorsByField.fullName?.[0] ?? null
  const phoneError = errorsByField.phone?.[0] ?? null
  const emailError = errorsByField.email?.[0] ?? null
  const cityError = errorsByField.city?.[0] ?? null
  const pickupError = errorsByField.cdekPickup?.[0] ?? null

  useEffect(() => {
    function refreshCart() {
      const sanitizedCart = readCart()

      setCart(sanitizedCart)
      writeCart(sanitizedCart)
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

  function updateCustomer(field: keyof CustomerDetails, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }))
    setValidation(null)
    setPaymentPlaceholderVisible(false)
  }

  function selectPrototypePickup() {
    setCdekPickup(prototypePickup)
    setValidation(null)
    setPaymentPlaceholderVisible(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPaymentPlaceholderVisible(false)

    const result = validateCheckoutDraft({
      customer,
      cdekPickup
    })

    setValidation(result)

    if (!result.valid) return

    setPaymentPlaceholderVisible(true)
  }

  if (!isReady) {
    return (
      <section className="checkoutLayout" aria-live="polite">
        <p className="formNote">Загружаем checkout.</p>
      </section>
    )
  }

  if (cart.length === 0) {
    return (
      <section className="checkoutLayout">
        <div className="checkoutPanel">
          <h2>Корзина пустая</h2>
          <p>Добавьте товары перед оформлением заказа.</p>
          <Link className="button" href="/shop">
            Вернуться в магазин
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="checkoutLayout">
      <form
        aria-describedby={validationMessages.length > 0 ? 'checkout-errors' : undefined}
        className="checkoutPanel"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="checkoutPanelHeader">
          <span className="eyebrow">01</span>
          <h2>Контакты</h2>
        </div>

        <label className="checkoutField">
          <span>Имя и фамилия</span>
          <input
            aria-describedby={fullNameError ? getFieldErrorId('fullName') : undefined}
            aria-invalid={fullNameError ? true : undefined}
            autoComplete="name"
            name="fullName"
            onChange={(event) => updateCustomer('fullName', event.target.value)}
            value={customer.fullName}
          />
          {fullNameError ? (
            <span className="fieldError" id={getFieldErrorId('fullName')}>
              {fullNameError}
            </span>
          ) : null}
        </label>

        <label className="checkoutField">
          <span>Телефон</span>
          <input
            aria-describedby={phoneError ? getFieldErrorId('phone') : undefined}
            aria-invalid={phoneError ? true : undefined}
            autoComplete="tel"
            inputMode="tel"
            name="phone"
            onChange={(event) => updateCustomer('phone', event.target.value)}
            type="tel"
            value={customer.phone}
          />
          {phoneError ? (
            <span className="fieldError" id={getFieldErrorId('phone')}>
              {phoneError}
            </span>
          ) : null}
        </label>

        <label className="checkoutField">
          <span>Email</span>
          <input
            aria-describedby={emailError ? getFieldErrorId('email') : undefined}
            aria-invalid={emailError ? true : undefined}
            autoComplete="email"
            name="email"
            onChange={(event) => updateCustomer('email', event.target.value)}
            type="email"
            value={customer.email}
          />
          {emailError ? (
            <span className="fieldError" id={getFieldErrorId('email')}>
              {emailError}
            </span>
          ) : null}
        </label>

        <label className="checkoutField">
          <span>Город</span>
          <input
            aria-describedby={cityError ? getFieldErrorId('city') : undefined}
            aria-invalid={cityError ? true : undefined}
            autoComplete="address-level2"
            name="city"
            onChange={(event) => updateCustomer('city', event.target.value)}
            value={customer.city}
          />
          {cityError ? (
            <span className="fieldError" id={getFieldErrorId('city')}>
              {cityError}
            </span>
          ) : null}
        </label>

        <div className="checkoutPanelHeader">
          <span className="eyebrow">02</span>
          <h2>СДЭК</h2>
        </div>

        <div className="pickupBox">
          <div>
            <strong>{prototypePickup.name}</strong>
            <span>{prototypePickup.address}</span>
            <span>{formatRubles(prototypePickup.price)}</span>
          </div>
          <button
            aria-describedby={pickupError ? getFieldErrorId('cdekPickup') : undefined}
            aria-invalid={pickupError ? true : undefined}
            aria-pressed={cdekPickup?.code === prototypePickup.code}
            className="buttonSecondary"
            onClick={selectPrototypePickup}
            type="button"
          >
            Выбрать пункт
          </button>
        </div>

        {pickupError ? (
          <p className="fieldError" id={getFieldErrorId('cdekPickup')}>
            {pickupError}
          </p>
        ) : null}

        {cdekPickup ? (
          <p className="formNote" role="status">
            Выбран пункт {cdekPickup.code}: {cdekPickup.name}, {cdekPickup.address}
          </p>
        ) : null}

        {validationMessages.length > 0 ? (
          <ul aria-live="assertive" className="errorList" id="checkout-errors" role="alert">
            {validationMessages.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        ) : null}

        {paymentPlaceholderVisible ? (
          <p className="paymentPlaceholder" role="status">
            Прототип YooKassa: здесь будет создан платеж. Реальный заказ и оплата пока не создаются.
          </p>
        ) : null}

        <button className="button" type="submit">
          Продолжить к оплате
        </button>
      </form>

      <aside className="cartSummary" aria-label="Состав заказа">
        <h2>Заказ</h2>

        <div className="checkoutItems">
          {cart.map((item) => (
            <div className="checkoutItem" key={item.id}>
              <span>
                {item.title} / {item.size ?? 'One size'} x {item.quantity}
              </span>
              <strong>{formatRubles(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>

        {totals.hasPreorder ? (
          <p className="preorderNote" role="status">
            В заказе есть предзаказ. Доставка может начаться после готовности всей партии.
          </p>
        ) : null}

        <div className="summaryRow">
          <span>Товары</span>
          <strong>{formatRubles(totals.itemsTotal)}</strong>
        </div>
        <div className="summaryRow">
          <span>СДЭК</span>
          <strong>{cdekPickup ? formatRubles(totals.deliveryTotal) : 'Выберите пункт'}</strong>
        </div>
        <div className="summaryRow summaryRowTotal">
          <span>Итого</span>
          <strong>{formatRubles(totals.orderTotal)}</strong>
        </div>
      </aside>
    </section>
  )
}
