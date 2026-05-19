import { getDisplayPrice, type Product, type ProductSaleStatus } from './products'

export type CartItem = {
  id: string
  productSlug: string
  title: string
  price: number
  quantity: number
  size: string | null
  saleStatus: ProductSaleStatus
}

export type CartTotals = {
  itemsTotal: number
  deliveryTotal: number
  orderTotal: number
  hasPreorder: boolean
}

export function createCartItemId(productSlug: string, size: string | null): string {
  return `${productSlug}:${size ?? 'one-size'}`
}

export function addCartItem(cart: CartItem[], product: Product, size: string | null): CartItem[] {
  const id = createCartItemId(product.slug, size)
  const existing = cart.find((item) => item.id === id)

  if (existing) {
    return cart.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
  }

  return [
    ...cart,
    {
      id,
      productSlug: product.slug,
      title: product.title,
      price: getDisplayPrice(product),
      quantity: 1,
      size,
      saleStatus: product.saleStatus
    }
  ]
}

export function removeCartItem(cart: CartItem[], id: string): CartItem[] {
  return cart.filter((item) => item.id !== id)
}

export function updateCartItemQuantity(cart: CartItem[], id: string, quantity: number): CartItem[] {
  if (quantity <= 0) return removeCartItem(cart, id)

  return cart.map((item) => (item.id === id ? { ...item, quantity } : item))
}

export function calculateCartTotals(cart: CartItem[], deliveryTotal = 0): CartTotals {
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return {
    itemsTotal,
    deliveryTotal,
    orderTotal: itemsTotal + deliveryTotal,
    hasPreorder: cart.some((item) => item.saleStatus === 'preorder')
  }
}

export function formatRubles(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(amount)
}
