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
    expect(result.messages).toContain('Укажите имя и фамилию')
    expect(result.messages).toContain('Выберите пункт выдачи СДЭК')
    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          field: 'fullName',
          code: 'required_full_name',
          message: 'Укажите имя и фамилию'
        },
        {
          field: 'cdekPickup',
          code: 'required_cdek_pickup',
          message: 'Выберите пункт выдачи СДЭК'
        }
      ])
    )
  })

  it('returns structured errors for invalid phone and email', () => {
    const result = validateCheckoutDraft({
      customer: {
        fullName: 'Иван Иванов',
        phone: '+7',
        email: '@',
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

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      {
        field: 'phone',
        code: 'invalid_phone',
        message: 'Укажите телефон'
      },
      {
        field: 'email',
        code: 'invalid_email',
        message: 'Укажите email'
      }
    ])
    expect(result.messages).toEqual(['Укажите телефон', 'Укажите email'])
  })

  it('rejects phone values with invalid characters even when digit count is valid', () => {
    const result = validateCheckoutDraft({
      customer: {
        fullName: 'Иван Иванов',
        phone: 'abc+79990000000<script>',
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

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      {
        field: 'phone',
        code: 'invalid_phone',
        message: 'Укажите телефон'
      }
    ])
  })

  it('rejects incomplete CDEK pickup details', () => {
    const result = validateCheckoutDraft({
      customer: {
        fullName: 'Иван Иванов',
        phone: '+79990000000',
        email: 'client@example.com',
        city: 'Москва'
      },
      cdekPickup: {
        code: '',
        name: ' ',
        address: '',
        city: '',
        price: Number.POSITIVE_INFINITY
      }
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toEqual([
      {
        field: 'cdekPickup',
        code: 'invalid_cdek_pickup',
        message: 'Проверьте пункт выдачи СДЭК'
      }
    ])
    expect(result.messages).toEqual(['Проверьте пункт выдачи СДЭК'])
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

    expect(result).toEqual({ valid: true, errors: [], messages: [] })
  })
})
