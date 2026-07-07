import { describe, expect, it } from 'vitest'

import type { CheckoutDraft, CustomerDetails } from '../../src/domain/checkout'
import { validateCheckoutDraft } from '../../src/domain/checkout'

const validCustomer: CustomerDetails = {
  fullName: 'Иван Иванов',
  phone: '+79990000000',
  telegram: '@ivanov'
}

const baseDraft: CheckoutDraft = {
  customer: validCustomer,
  deliveryRegion: 'moscow',
  cdekPickupRaw: 'Москва, бул. Адмирала Ушакова, 18Б',
  consent: { offerAccepted: true, privacyAccepted: true }
}

describe('checkout domain', () => {
  it('requires fullName, telegram, region and pickup', () => {
    const result = validateCheckoutDraft({
      ...baseDraft,
      customer: { ...validCustomer, fullName: '', telegram: 'no' },
      deliveryRegion: null,
      cdekPickupRaw: ''
    })
    expect(result.valid).toBe(false)
    expect(result.messages).toContain('Укажите ФИО')
    expect(result.messages).toContain('Укажите Telegram в формате @username')
    expect(result.messages).toContain('Выберите регион доставки')
    expect(result.messages).toContain('Укажите пункт выдачи СДЭК')
  })

  it('accepts @username and t.me link forms of telegram', () => {
    expect(validateCheckoutDraft({ ...baseDraft, customer: { ...validCustomer, telegram: 'ivanov_99' } }).valid).toBe(true)
    expect(validateCheckoutDraft({ ...baseDraft, customer: { ...validCustomer, telegram: 'https://t.me/ivanov_99' } }).valid).toBe(true)
  })

  it('rejects invalid phone characters', () => {
    const result = validateCheckoutDraft({
      ...baseDraft,
      customer: { ...validCustomer, phone: 'abc<script>' }
    })
    expect(result.errors).toEqual([{ field: 'phone', code: 'invalid_phone', message: 'Укажите телефон' }])
  })

  it('requires privacy and offer consent', () => {
    const result = validateCheckoutDraft({
      ...baseDraft,
      consent: { offerAccepted: false, privacyAccepted: false }
    })
    expect(result.messages).toContain('Подтвердите согласие на обработку персональных данных')
    expect(result.messages).toContain('Подтвердите согласие с условиями оферты')
  })

  it('accepts a complete draft', () => {
    expect(validateCheckoutDraft(baseDraft)).toEqual({ valid: true, errors: [], messages: [] })
  })
})
