import { describe, expect, it } from 'vitest'

import type { CdekPickupPoint, CustomerDetails } from '../../src/domain/checkout'
import { validateCheckoutDraft } from '../../src/domain/checkout'

const validCustomer: CustomerDetails = {
  fullName: 'Иван Иванов',
  phone: '+79990000000',
  email: 'client@example.com',
  city: 'Москва'
}

const validPickup: CdekPickupPoint = {
  code: 'MSK123',
  name: 'СДЭК Тверская',
  address: 'Москва, Тверская 1',
  city: 'Москва',
  price: 650
}

const fullConsent = { offerAccepted: true, privacyAccepted: true }

describe('checkout domain', () => {
  it('requires customer fullName and CDEK pickup before payment', () => {
    const result = validateCheckoutDraft({
      customer: { ...validCustomer, fullName: '' },
      cdekPickup: null,
      consent: fullConsent
    })

    expect(result.valid).toBe(false)
    expect(result.messages).toContain('Укажите имя и фамилию')
    expect(result.messages).toContain('Выберите пункт выдачи СДЭК')
    expect(result.errors).toEqual(
      expect.arrayContaining([
        { field: 'fullName', code: 'required_full_name', message: 'Укажите имя и фамилию' },
        { field: 'cdekPickup', code: 'required_cdek_pickup', message: 'Выберите пункт выдачи СДЭК' }
      ])
    )
  })

  it('returns structured errors for invalid phone and email', () => {
    const result = validateCheckoutDraft({
      customer: { ...validCustomer, phone: '+7', email: '@' },
      cdekPickup: validPickup,
      consent: fullConsent
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      { field: 'phone', code: 'invalid_phone', message: 'Укажите телефон' },
      { field: 'email', code: 'invalid_email', message: 'Укажите email' }
    ])
    expect(result.messages).toEqual(['Укажите телефон', 'Укажите email'])
  })

  it('rejects phone values with invalid characters even when digit count is valid', () => {
    const result = validateCheckoutDraft({
      customer: { ...validCustomer, phone: 'abc+79990000000<script>' },
      cdekPickup: validPickup,
      consent: fullConsent
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      { field: 'phone', code: 'invalid_phone', message: 'Укажите телефон' }
    ])
  })

  it('rejects incomplete CDEK pickup details', () => {
    const result = validateCheckoutDraft({
      customer: validCustomer,
      cdekPickup: { code: '', name: ' ', address: '', city: '', price: Number.POSITIVE_INFINITY },
      consent: fullConsent
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      { field: 'cdekPickup', code: 'invalid_cdek_pickup', message: 'Проверьте пункт выдачи СДЭК' }
    ])
    expect(result.messages).toEqual(['Проверьте пункт выдачи СДЭК'])
  })

  it('requires consent to personal data processing (152-ФЗ)', () => {
    const result = validateCheckoutDraft({
      customer: validCustomer,
      cdekPickup: validPickup,
      consent: { offerAccepted: true, privacyAccepted: false }
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      {
        field: 'privacyConsent',
        code: 'required_privacy_consent',
        message: 'Подтвердите согласие на обработку персональных данных'
      }
    ])
  })

  it('requires acceptance of the public offer', () => {
    const result = validateCheckoutDraft({
      customer: validCustomer,
      cdekPickup: validPickup,
      consent: { offerAccepted: false, privacyAccepted: true }
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      {
        field: 'offerConsent',
        code: 'required_offer_consent',
        message: 'Подтвердите согласие с условиями оферты'
      }
    ])
  })

  it('accepts complete checkout draft with consent', () => {
    const result = validateCheckoutDraft({
      customer: validCustomer,
      cdekPickup: validPickup,
      consent: fullConsent
    })

    expect(result).toEqual({ valid: true, errors: [], messages: [] })
  })
})
