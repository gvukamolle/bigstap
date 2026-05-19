import { sanitizeCart, type CartItem } from '@/domain/cart'
import type { Product } from '@/domain/products'

export const cartStorageKey = 'bigstep-cart'
export const cartUpdatedEvent = 'bigstep-cart-updated'

const cartStorageVersion = 1

type StoredCartPayload = {
  version: typeof cartStorageVersion
  updatedAt: string
  items: CartItem[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getStoredItems(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value

  if (
    isRecord(value) &&
    value.version === cartStorageVersion &&
    Array.isArray(value.items)
  ) {
    return value.items
  }

  return []
}

export function readCartStorage(canonicalProducts: readonly Product[]): CartItem[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(cartStorageKey)
    if (!raw) return []

    return sanitizeCart(getStoredItems(JSON.parse(raw) as unknown), canonicalProducts)
  } catch {
    return []
  }
}

export function writeCartStorage(cart: CartItem[]): boolean {
  if (typeof window === 'undefined') return false

  try {
    const payload: StoredCartPayload = {
      version: cartStorageVersion,
      updatedAt: new Date().toISOString(),
      items: cart
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function dispatchCartUpdated() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new Event(cartUpdatedEvent))
}
