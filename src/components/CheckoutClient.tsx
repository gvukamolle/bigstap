'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { calculateCartTotals, formatRubles, type CartItem } from '@/domain/cart'
import {
  type CdekPickupPoint,
  type CheckoutDraft,
  type CustomerDetails,
  type CheckoutValidationField,
  type ValidationResult,
  validateCheckoutDraft
} from '@/domain/checkout'
import type { Product } from '@/domain/products'
import { cartUpdatedEvent, readCartStorage, writeCartStorage } from '@/lib/cartStorage'

const checkoutDraftStorageKey = 'bigstep-checkout-draft'
const checkoutDraftStorageVersion = 1

const defaultCustomer: CustomerDetails = {
  fullName: '',
  phone: '',
  email: '',
  city: 'Москва'
}

const prototypePickups: readonly CdekPickupPoint[] = [
  {
    code: 'MSK123',
    name: 'СДЭК Тверская',
    address: 'Москва, Тверская 1',
    city: 'Москва',
    price: 650
  },
  {
    code: 'SPB021',
    name: 'СДЭК Лиговский',
    address: 'Санкт-Петербург, Лиговский проспект 50',
    city: 'Санкт-Петербург',
    price: 790
  }
]

type StoredCheckoutDraft = {
  version: typeof checkoutDraftStorageVersion
  updatedAt: string
  draft: CheckoutDraft
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCustomerDetails(value: unknown): value is CustomerDetails {
  return (
    isRecord(value) &&
    typeof value.fullName === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.email === 'string' &&
    typeof value.city === 'string'
  )
}

function isCdekPickupPoint(value: unknown): value is CdekPickupPoint {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.name === 'string' &&
    typeof value.address === 'string' &&
    typeof value.city === 'string' &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price) &&
    value.price >= 0
  )
}

function readCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(checkoutDraftStorageKey)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== checkoutDraftStorageVersion) return null
    if (!isRecord(parsed.draft) || !isCustomerDetails(parsed.draft.customer)) return null

    const cdekPickup = parsed.draft.cdekPickup
    if (cdekPickup !== null && !isCdekPickupPoint(cdekPickup)) return null

    return {
      customer: parsed.draft.customer,
      cdekPickup
    }
  } catch {
    return null
  }
}

function writeCheckoutDraft(draft: CheckoutDraft): boolean {
  if (typeof window === 'undefined') return false

  try {
    const payload: StoredCheckoutDraft = {
      version: checkoutDraftStorageVersion,
      updatedAt: new Date().toISOString(),
      draft
    }

    window.localStorage.setItem(checkoutDraftStorageKey, JSON.stringify(payload))
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

export function CheckoutClient({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)
  const [customer, setCustomer] = useState<CustomerDetails>(defaultCustomer)
  const [cdekPickup, setCdekPickup] = useState<CdekPickupPoint | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [paymentPlaceholderVisible, setPaymentPlaceholderVisible] = useState(false)
  const [draftStorageError, setDraftStorageError] = useState<string | null>(null)

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
      const sanitizedCart = readCartStorage(products)

      setCart(sanitizedCart)
      writeCartStorage(sanitizedCart)
      setIsReady(true)
    }

    const storedDraft = readCheckoutDraft()
    if (storedDraft) {
      setCustomer(storedDraft.customer)
      setCdekPickup(storedDraft.cdekPickup)
    }

    refreshCart()
    window.addEventListener(cartUpdatedEvent, refreshCart)
    window.addEventListener('storage', refreshCart)

    return () => {
      window.removeEventListener(cartUpdatedEvent, refreshCart)
      window.removeEventListener('storage', refreshCart)
    }
  }, [])

  useEffect(() => {
    if (!isReady) return

    const saved = writeCheckoutDraft({
      customer,
      cdekPickup
    })

    setDraftStorageError(saved ? null : 'Не удалось сохранить черновик оформления.')
  }, [cdekPickup, customer, isReady])

  function updateCustomer(field: keyof CustomerDetails, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }))
    setValidation(null)
    setPaymentPlaceholderVisible(false)
  }

  function selectPrototypePickup(pickup: CdekPickupPoint) {
    setCdekPickup(pickup)
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
        <p className="formNote">Загружаем оформление.</p>
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
        <p className="formNote">
          Личный кабинет не нужен. Контакты и выбранный пункт СДЭК сохраняются на этом устройстве
          как черновик оформления.
        </p>

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
          <span>Почта</span>
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

        <div
          className="pickupList"
          role="radiogroup"
          aria-label="Пункты выдачи СДЭК"
          aria-describedby={pickupError ? getFieldErrorId('cdekPickup') : undefined}
          aria-invalid={pickupError ? true : undefined}
        >
          {prototypePickups.map((pickup) => {
            const selected = cdekPickup?.code === pickup.code

            return (
              <label
                className={selected ? 'pickupBox pickupOption pickupOptionSelected' : 'pickupBox pickupOption'}
                key={pickup.code}
              >
                <input
                  checked={selected}
                  className="visuallyHidden"
                  name="cdekPickup"
                  onChange={() => selectPrototypePickup(pickup)}
                  type="radio"
                />
                <div>
                  <strong>{pickup.name}</strong>
                  <span>{pickup.address}</span>
                  <span>
                    {formatRubles(pickup.price)} / ориентир 2-5 дней после передачи в СДЭК
                  </span>
                </div>
                <span className="buttonSecondary pickupOptionAction" aria-hidden="true">
                  {selected ? 'Выбрано' : 'Выбрать'}
                </span>
              </label>
            )
          })}
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

        {draftStorageError ? (
          <p className="formError" role="alert">
            {draftStorageError}
          </p>
        ) : null}

        {paymentPlaceholderVisible ? (
          <p className="paymentPlaceholder" role="status">
            Прототип Юкасса: здесь будет создан платеж. Реальный заказ и оплата пока не создаются.
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
                {item.title} / {item.size ?? 'Без размера'} × {item.quantity}
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

        <ul className="summaryNotes">
          <li>В наличии и предзаказы оформляются одним заказом.</li>
          <li>Оплата будет через ЮKassa после проверки формы.</li>
          <li>Возврат дистанционной покупки: памятка и адрес будут в заказе.</li>
        </ul>

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
