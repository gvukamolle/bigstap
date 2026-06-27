import { describe, expect, it } from 'vitest'

import {
  DELIVERY_COSTS,
  getDeliveryCost,
  isDeliveryRegion,
  type DeliveryRegion
} from '../../src/domain/delivery'

describe('delivery domain', () => {
  it('exposes fixed tariffs for Moscow and Russia', () => {
    expect(DELIVERY_COSTS).toEqual({ moscow: 400, russia: 600 })
  })

  it('returns the tariff for a region', () => {
    expect(getDeliveryCost('moscow')).toBe(400)
    expect(getDeliveryCost('russia')).toBe(600)
  })

  it('recognises valid regions and rejects others', () => {
    expect(isDeliveryRegion('moscow')).toBe(true)
    expect(isDeliveryRegion('russia')).toBe(true)
    expect(isDeliveryRegion('spb')).toBe(false)
    expect(isDeliveryRegion(null)).toBe(false)
  })

  it('narrows unknown input through the guard', () => {
    const raw: unknown = 'russia'
    if (isDeliveryRegion(raw)) {
      const region: DeliveryRegion = raw
      expect(getDeliveryCost(region)).toBe(600)
    }
  })
})
