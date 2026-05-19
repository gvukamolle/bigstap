export type CustomerDetails = {
  fullName: string
  phone: string
  email: string
  city: string
}

export type CdekPickupPoint = {
  code: string
  name: string
  address: string
  city: string
  price: number
}

export type CheckoutDraft = {
  customer: CustomerDetails
  cdekPickup: CdekPickupPoint | null
}

export type CheckoutValidationField = 'fullName' | 'phone' | 'email' | 'city' | 'cdekPickup'

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

export function validateCheckoutDraft(draft: CheckoutDraft): ValidationResult {
  const errors: CheckoutValidationError[] = []

  if (draft.customer.fullName.trim().length < 2) {
    errors.push({
      field: 'fullName',
      code: 'required_full_name',
      message: 'Укажите имя и фамилию'
    })
  }
  if (draft.customer.phone.replace(/\D/g, '').length < 10) {
    errors.push({
      field: 'phone',
      code: 'invalid_phone',
      message: 'Укажите телефон'
    })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.customer.email.trim())) {
    errors.push({
      field: 'email',
      code: 'invalid_email',
      message: 'Укажите email'
    })
  }
  if (draft.customer.city.trim().length < 2) {
    errors.push({
      field: 'city',
      code: 'required_city',
      message: 'Укажите город'
    })
  }
  if (!draft.cdekPickup) {
    errors.push({
      field: 'cdekPickup',
      code: 'required_cdek_pickup',
      message: 'Выберите пункт выдачи СДЭК'
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    messages: errors.map((error) => error.message)
  }
}
