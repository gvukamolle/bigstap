'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { calculateCartTotals, formatRubles, type CartItem } from '@/domain/cart'
import {
  type CheckoutConsent,
  type CheckoutDraft,
  type CustomerDetails,
  type CheckoutValidationField,
  type ValidationResult,
  validateCheckoutDraft
} from '@/domain/checkout'
import {
  DELIVERY_COSTS,
  getDeliveryCost,
  isDeliveryRegion,
  type DeliveryRegion
} from '@/domain/delivery'
import type { Product } from '@/domain/products'
import {
  cartUpdatedEvent,
  dispatchCartUpdated,
  readCartStorage,
  writeCartStorage
} from '@/lib/cartStorage'

import { PaymentModal } from './PaymentModal'

// v2: старый драфт со city/email больше не подставляется (другая форма).
const checkoutDraftStorageKey = 'bigstep-checkout-draft-v2'
const checkoutDraftStorageVersion = 2

const defaultCustomer: CustomerDetails = {
  fullName: '',
  phone: '',
  telegram: ''
}

type DeliveryRegionChoice = DeliveryRegion | ''

// Черновик в localStorage НЕ хранит согласия: consent даётся явно при каждом оформлении.
type DraftSnapshot = {
  customer: CustomerDetails
  deliveryRegion: DeliveryRegionChoice
  cdekPickupRaw: string
}

type StoredCheckoutDraft = {
  version: typeof checkoutDraftStorageVersion
  updatedAt: string
  draft: DraftSnapshot
}

type CheckoutClientProps = {
  products: Product[]
  qrImageUrl: string | null
  recipientHint: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCustomerDetails(value: unknown): value is CustomerDetails {
  return (
    isRecord(value) &&
    typeof value.fullName === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.telegram === 'string'
  )
}

function isDeliveryRegionChoice(value: unknown): value is DeliveryRegionChoice {
  return value === '' || isDeliveryRegion(value)
}

function readCheckoutDraft(): DraftSnapshot | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(checkoutDraftStorageKey)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== checkoutDraftStorageVersion) return null
    if (!isRecord(parsed.draft) || !isCustomerDetails(parsed.draft.customer)) return null
    if (!isDeliveryRegionChoice(parsed.draft.deliveryRegion)) return null
    if (typeof parsed.draft.cdekPickupRaw !== 'string') return null

    return {
      customer: parsed.draft.customer,
      deliveryRegion: parsed.draft.deliveryRegion,
      cdekPickupRaw: parsed.draft.cdekPickupRaw
    }
  } catch {
    return null
  }
}

function writeCheckoutDraft(draft: DraftSnapshot): boolean {
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

export function CheckoutClient({ products, qrImageUrl, recipientHint }: CheckoutClientProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isReady, setIsReady] = useState(false)
  const [customer, setCustomer] = useState<CustomerDetails>(defaultCustomer)
  const [deliveryRegion, setDeliveryRegion] = useState<DeliveryRegionChoice>('')
  const [cdekPickupRaw, setCdekPickupRaw] = useState('')
  // Согласие даётся явно при каждом оформлении и НЕ сохраняется в черновик (юр-требование).
  const [consent, setConsent] = useState<CheckoutConsent>({
    offerAccepted: false,
    privacyAccepted: false
  })
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [draftStorageError, setDraftStorageError] = useState<string | null>(null)

  const deliveryTotal = isDeliveryRegion(deliveryRegion) ? getDeliveryCost(deliveryRegion) : 0
  const totals = useMemo(
    () => calculateCartTotals(cart, deliveryTotal),
    [cart, deliveryTotal]
  )
  const validationMessages = getValidationMessages(validation)
  const errorsByField = useMemo(() => getErrorsByField(validation), [validation])
  const fullNameError = errorsByField.fullName?.[0] ?? null
  const phoneError = errorsByField.phone?.[0] ?? null
  const telegramError = errorsByField.telegram?.[0] ?? null
  const regionError = errorsByField.deliveryRegion?.[0] ?? null
  const pickupError = errorsByField.cdekPickupRaw?.[0] ?? null
  const privacyConsentError = errorsByField.privacyConsent?.[0] ?? null
  const offerConsentError = errorsByField.offerConsent?.[0] ?? null

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
      setDeliveryRegion(storedDraft.deliveryRegion)
      setCdekPickupRaw(storedDraft.cdekPickupRaw)
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
      deliveryRegion,
      cdekPickupRaw
    })

    setDraftStorageError(saved ? null : 'Не удалось сохранить черновик оформления.')
  }, [customer, deliveryRegion, cdekPickupRaw, isReady])

  function updateCustomer(field: keyof CustomerDetails, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }))
    setValidation(null)
    setOrderError(null)
  }

  function updateConsent(field: keyof CheckoutConsent, value: boolean) {
    setConsent((current) => ({ ...current, [field]: value }))
    setValidation(null)
    setOrderError(null)
  }

  function selectRegion(region: DeliveryRegion) {
    setDeliveryRegion(region)
    setValidation(null)
    setOrderError(null)
  }

  function buildDraft(): CheckoutDraft {
    return {
      customer,
      deliveryRegion: isDeliveryRegion(deliveryRegion) ? deliveryRegion : null,
      cdekPickupRaw,
      consent
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOrderError(null)

    const result = validateCheckoutDraft(buildDraft())

    setValidation(result)

    if (!result.valid) return

    setShowPayment(true)
  }

  async function submitOrder(receipt: File) {
    setSubmitting(true)
    setOrderError(null)

    const payload = {
      customer,
      deliveryRegion,
      cdekPickupRaw,
      consent,
      items: cart.map((item) => ({
        productSlug: item.productSlug,
        size: item.size,
        quantity: item.quantity
      }))
    }
    const form = new FormData()
    form.set('payload', JSON.stringify(payload))
    form.set('receipt', receipt, receipt.name)

    try {
      const response = await fetch('/api/checkout', { method: 'POST', body: form })
      const data:
        | { ok?: boolean; orderNumber?: string; error?: string }
        | null = await response.json().catch(() => null)

      if (!response.ok || !data?.ok || !data.orderNumber) {
        setOrderError(data?.error ?? 'Не удалось оформить заказ. Попробуйте ещё раз.')
        return
      }

      writeCartStorage([])
      dispatchCartUpdated()
      setCart([])
      setOrderNumber(data.orderNumber)
      setShowPayment(false)
    } catch {
      setOrderError('Не удалось связаться с сервером. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isReady) {
    return (
      <section className="checkoutLayout" aria-live="polite">
        <p className="formNote">Загружаем оформление.</p>
      </section>
    )
  }

  if (orderNumber) {
    return (
      <section className="checkoutLayout">
        <div className="checkoutPanel">
          <div className="checkoutPanelHeader">
            <span className="eyebrow">Готово</span>
            <h2>Заказ принят</h2>
          </div>
          <p className="formNote" role="status">
            Заказ <strong>{orderNumber}</strong> принят. Проверю оплату и напишу тебе в Telegram.
          </p>
          <Link className="button" href="/shop">
            Вернуться в магазин
          </Link>
        </div>
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
          Личный кабинет не нужен. Контакты и регион доставки сохраняются на этом устройстве как
          черновик оформления.
        </p>

        <label className="checkoutField">
          <span>Имя и фамилия</span>
          <input
            aria-invalid={fullNameError ? true : undefined}
            autoComplete="name"
            name="fullName"
            onChange={(event) => updateCustomer('fullName', event.target.value)}
            value={customer.fullName}
          />
        </label>

        <label className="checkoutField">
          <span>Телефон</span>
          <input
            aria-invalid={phoneError ? true : undefined}
            autoComplete="tel"
            inputMode="tel"
            name="phone"
            onChange={(event) => updateCustomer('phone', event.target.value)}
            type="tel"
            value={customer.phone}
          />
        </label>

        <label className="checkoutField">
          <span>Telegram</span>
          <input
            aria-invalid={telegramError ? true : undefined}
            name="telegram"
            onChange={(event) => updateCustomer('telegram', event.target.value)}
            placeholder="@username"
            value={customer.telegram}
          />
        </label>

        <div className="checkoutPanelHeader">
          <span className="eyebrow">02</span>
          <h2>Доставка</h2>
        </div>

        <div
          className="pickupList"
          role="radiogroup"
          aria-label="Регион доставки"
          aria-describedby={regionError ? getFieldErrorId('deliveryRegion') : undefined}
          aria-invalid={regionError ? true : undefined}
        >
          {(Object.keys(DELIVERY_COSTS) as DeliveryRegion[]).map((region) => {
            const selected = deliveryRegion === region
            const label = region === 'moscow' ? 'Москва' : 'Россия'

            return (
              <label
                className={selected ? 'pickupBox pickupOption pickupOptionSelected' : 'pickupBox pickupOption'}
                key={region}
              >
                <input
                  checked={selected}
                  className="visuallyHidden"
                  name="deliveryRegion"
                  onChange={() => selectRegion(region)}
                  type="radio"
                />
                <div>
                  <strong>{label}</strong>
                  <span>Доставка СДЭК — {formatRubles(DELIVERY_COSTS[region])}</span>
                </div>
                <span className="buttonSecondary pickupOptionAction" aria-hidden="true">
                  {selected ? 'Выбрано' : 'Выбрать'}
                </span>
              </label>
            )
          })}
        </div>

        {regionError ? (
          <p className="fieldError" id={getFieldErrorId('deliveryRegion')}>
            {regionError}
          </p>
        ) : null}

        <label className="checkoutField">
          <span>Пункт выдачи СДЭК</span>
          <input
            aria-invalid={pickupError ? true : undefined}
            name="cdekPickupRaw"
            onChange={(event) => {
              setCdekPickupRaw(event.target.value)
              setValidation(null)
              setOrderError(null)
            }}
            placeholder="Город, адрес пункта выдачи"
            value={cdekPickupRaw}
          />
        </label>
        <p className="formNote">
          Найдите ближайший пункт на{' '}
          <Link href="https://www.cdek.ru/ru/offices" prefetch={false} target="_blank">
            карте СДЭК
          </Link>{' '}
          и впишите его адрес.
        </p>

        {pickupError ? (
          <p className="fieldError" id={getFieldErrorId('cdekPickupRaw')}>
            {pickupError}
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

        {orderError ? (
          <p className="formError" role="alert">
            {orderError}
          </p>
        ) : null}

        <div className="checkoutPanelHeader">
          <span className="eyebrow">03</span>
          <h2>Согласия</h2>
        </div>

        <label className="checkoutConsent">
          <input
            aria-invalid={privacyConsentError ? true : undefined}
            checked={consent.privacyAccepted}
            name="privacyConsent"
            onChange={(event) => updateConsent('privacyAccepted', event.target.checked)}
            type="checkbox"
          />
          <span>
            Даю согласие на обработку персональных данных в соответствии с{' '}
            <Link href="/privacy" prefetch={false} target="_blank">
              Политикой конфиденциальности
            </Link>
            .
          </span>
        </label>
        {privacyConsentError ? <span className="fieldError">{privacyConsentError}</span> : null}

        <label className="checkoutConsent">
          <input
            aria-invalid={offerConsentError ? true : undefined}
            checked={consent.offerAccepted}
            name="offerConsent"
            onChange={(event) => updateConsent('offerAccepted', event.target.checked)}
            type="checkbox"
          />
          <span>
            Ознакомлен(а) и согласен(на) с условиями{' '}
            <Link href="/offer" prefetch={false} target="_blank">
              Публичной оферты
            </Link>
            .
          </span>
        </label>
        {offerConsentError ? <span className="fieldError">{offerConsentError}</span> : null}

        <p className="formNote">
          Оплата по СБП: на следующем шаге откроется QR. После перевода приложите PDF-чек — заказ
          уйдёт на проверку, и я напишу тебе в Telegram.
        </p>

        <button className="button" type="submit" disabled={submitting}>
          Перейти к оплате
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
          <li>Оплата по СБП: статичный QR, сумму вводите вручную.</li>
          <li>Возврат дистанционной покупки: памятка и адрес будут в заказе.</li>
        </ul>

        <div className="summaryRow">
          <span>Товары</span>
          <strong>{formatRubles(totals.itemsTotal)}</strong>
        </div>
        <div className="summaryRow">
          <span>СДЭК</span>
          <strong>
            {isDeliveryRegion(deliveryRegion) ? formatRubles(totals.deliveryTotal) : 'Выберите регион'}
          </strong>
        </div>
        <div className="summaryRow summaryRowTotal">
          <span>Итого</span>
          <strong>{formatRubles(totals.orderTotal)}</strong>
        </div>
      </aside>

      {showPayment ? (
        <PaymentModal
          total={totals.orderTotal}
          qrImageUrl={qrImageUrl}
          recipientHint={recipientHint}
          submitting={submitting}
          onConfirm={submitOrder}
          onClose={() => setShowPayment(false)}
        />
      ) : null}
    </section>
  )
}
