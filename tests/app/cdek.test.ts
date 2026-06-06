import { describe, expect, it } from 'vitest'

import { normalizeCdekPoint } from '../../src/lib/cdek'

describe('normalizeCdekPoint', () => {
  it('maps a CDEK delivery point to the app pickup shape', () => {
    const raw = {
      code: 'MSK77',
      name: 'ПВЗ Тверская',
      location: { city: 'Москва', address: 'Тверская, 1', address_full: 'г. Москва, Тверская, 1' }
    }

    expect(normalizeCdekPoint(raw)).toEqual({
      code: 'MSK77',
      name: 'ПВЗ Тверская',
      address: 'г. Москва, Тверская, 1',
      city: 'Москва'
    })
  })

  it('falls back to short address when address_full is missing', () => {
    const raw = { code: 'C1', name: 'ПВЗ', location: { city: 'Санкт-Петербург', address: 'Невский 1' } }
    expect(normalizeCdekPoint(raw)?.address).toBe('Невский 1')
  })

  it('rejects points without code, name or location', () => {
    expect(normalizeCdekPoint({})).toBeNull()
    expect(normalizeCdekPoint({ code: 'X' })).toBeNull()
    expect(normalizeCdekPoint({ code: 'X', name: 'Y' })).toBeNull()
    expect(normalizeCdekPoint(null)).toBeNull()
  })
})
