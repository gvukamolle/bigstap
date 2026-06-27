export type DeliveryRegion = 'moscow' | 'russia'

// Фиксированные тарифы доставки СДЭК (целые рубли). Захардкожены в домене — выносить в админку
// будем, только если тарифы начнут меняться (YAGNI).
export const DELIVERY_COSTS: Record<DeliveryRegion, number> = {
  moscow: 400,
  russia: 600
}

export const DELIVERY_REGION_LABELS: Record<DeliveryRegion, string> = {
  moscow: 'Москва',
  russia: 'Россия'
}

export function isDeliveryRegion(value: unknown): value is DeliveryRegion {
  return value === 'moscow' || value === 'russia'
}

export function getDeliveryCost(region: DeliveryRegion): number {
  return DELIVERY_COSTS[region]
}
