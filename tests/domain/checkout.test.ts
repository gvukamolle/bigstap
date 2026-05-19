import { describe, expect, it } from 'vitest'
import { validateCheckoutDraft } from '../../src/domain/checkout'

describe('checkout domain', () => {
  it('requires customer fullName and CDEK pickup before payment', () => {
    const result = validateCheckoutDraft({
      customer: {
        fullName: '',
        phone: '+79990000000',
        email: 'client@example.com',
        city: 'Москва'
      },
      cdekPickup: null
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Укажите имя и фамилию')
    expect(result.errors).toContain('Выберите пункт выдачи СДЭК')
  })

  it('accepts complete checkout draft', () => {
    const result = validateCheckoutDraft({
      customer: {
        fullName: 'Иван Иванов',
        phone: '+79990000000',
        email: 'client@example.com',
        city: 'Москва'
      },
      cdekPickup: {
        code: 'MSK123',
        name: 'СДЭК Тверская',
        address: 'Москва, Тверская 1',
        city: 'Москва',
        price: 650
      }
    })

    expect(result).toEqual({ valid: true, errors: [] })
  })
})
