import { isDeliveryRegion, type DeliveryRegion } from './delivery'

export type CustomerDetails = {
  fullName: string
  phone: string
  telegram: string
}

export type CheckoutConsent = {
  offerAccepted: boolean
  privacyAccepted: boolean
}

export type CheckoutDraft = {
  customer: CustomerDetails
  deliveryRegion: DeliveryRegion | null
  cdekPickupRaw: string
  consent: CheckoutConsent
}

export type CheckoutValidationField =
  | 'fullName'
  | 'phone'
  | 'telegram'
  | 'deliveryRegion'
  | 'cdekPickupRaw'
  | 'privacyConsent'
  | 'offerConsent'

export type CheckoutValidationError = {
  field: CheckoutValidationField
  code: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  errors: CheckoutValidationError[]
  messages: string[]
}

function isValidPhone(phone: string): boolean {
  const trimmedPhone = phone.trim()
  const digits = trimmedPhone.replace(/\D/g, '')
  const plusCount = (trimmedPhone.match(/\+/g) ?? []).length

  return (
    digits.length >= 10 &&
    /^[+\d\s()-]+$/.test(trimmedPhone) &&
    plusCount <= 1 &&
    (plusCount === 0 || trimmedPhone.startsWith('+'))
  )
}

// Telegram: @username (5–32 символа, буквы/цифры/_) или ссылка t.me/username.
function isValidTelegram(value: string): boolean {
  const trimmed = value.trim().replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '@')
  const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  return /^[A-Za-z0-9_]{5,32}$/.test(handle)
}

export function validateCheckoutDraft(draft: CheckoutDraft): ValidationResult {
  const errors: CheckoutValidationError[] = []

  if (draft.customer.fullName.trim().length < 2) {
    errors.push({ field: 'fullName', code: 'required_full_name', message: 'Укажите имя и фамилию' })
  }
  if (!isValidPhone(draft.customer.phone)) {
    errors.push({ field: 'phone', code: 'invalid_phone', message: 'Укажите телефон' })
  }
  if (!isValidTelegram(draft.customer.telegram)) {
    errors.push({
      field: 'telegram',
      code: 'invalid_telegram',
      message: 'Укажите Telegram в формате @username'
    })
  }
  if (!isDeliveryRegion(draft.deliveryRegion)) {
    errors.push({
      field: 'deliveryRegion',
      code: 'required_delivery_region',
      message: 'Выберите регион доставки'
    })
  }
  if (draft.cdekPickupRaw.trim().length < 5) {
    errors.push({
      field: 'cdekPickupRaw',
      code: 'required_cdek_pickup',
      message: 'Укажите пункт выдачи СДЭК'
    })
  }
  if (!draft.consent?.privacyAccepted) {
    errors.push({
      field: 'privacyConsent',
      code: 'required_privacy_consent',
      message: 'Подтвердите согласие на обработку персональных данных'
    })
  }
  if (!draft.consent?.offerAccepted) {
    errors.push({
      field: 'offerConsent',
      code: 'required_offer_consent',
      message: 'Подтвердите согласие с условиями оферты'
    })
  }

  return { valid: errors.length === 0, errors, messages: errors.map((e) => e.message) }
}
