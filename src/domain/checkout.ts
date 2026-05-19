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

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

export function validateCheckoutDraft(draft: CheckoutDraft): ValidationResult {
  const errors: string[] = []

  if (draft.customer.fullName.trim().length < 2) errors.push('Укажите имя и фамилию')
  if (draft.customer.phone.trim().length < 6) errors.push('Укажите телефон')
  if (!draft.customer.email.includes('@')) errors.push('Укажите email')
  if (draft.customer.city.trim().length < 2) errors.push('Укажите город')
  if (!draft.cdekPickup) errors.push('Выберите пункт выдачи СДЭК')

  return {
    valid: errors.length === 0,
    errors
  }
}
