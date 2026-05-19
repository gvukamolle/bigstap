import { getDisplayPrice, type Product, type ProductSaleStatus } from './products'

export { formatRubles } from './formatting'

export type CartError =
  | 'PRODUCT_UNAVAILABLE'
  | 'SIZE_REQUIRED'
  | 'SIZE_UNAVAILABLE'
  | 'SIZE_NOT_ALLOWED'
  | 'OUT_OF_STOCK'

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

export type CartResult = { ok: true; cart: CartItem[] } | { ok: false; error: CartError }

export function createCartItemId(productSlug: string, size: string | null): string {
  return `${productSlug}:${size ?? 'one-size'}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getCartValidationError(product: Product, size: string | null): CartError | null {
  if (!product.published || product.saleStatus === 'sold_out' || product.saleStatus === 'hidden') {
    return 'PRODUCT_UNAVAILABLE'
  }

  if (product.type === 'one_size') {
    if (size !== null) return 'SIZE_NOT_ALLOWED'
    if (!Number.isFinite(product.stock) || product.stock <= 0) return 'OUT_OF_STOCK'

    return null
  }

  if (!size) return 'SIZE_REQUIRED'

  const selectedSize = product.sizes.find((item) => item.label === size)
  if (!selectedSize || !Number.isFinite(selectedSize.stock) || selectedSize.stock <= 0) {
    return 'SIZE_UNAVAILABLE'
  }

  return null
}

function getAvailableStock(product: Product, size: string | null): number {
  if (product.type === 'one_size') return product.stock

  return product.sizes.find((item) => item.label === size)?.stock ?? 0
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0
}

export function sanitizeCart(
  storedCart: readonly unknown[],
  canonicalProducts: readonly Product[]
): CartItem[] {
  const productsBySlug = new Map(canonicalProducts.map((product) => [product.slug, product]))
  const sanitizedById = new Map<string, CartItem>()

  for (const storedItem of storedCart) {
    if (!isRecord(storedItem)) continue
    if (typeof storedItem.productSlug !== 'string') continue
    if (typeof storedItem.quantity !== 'number' || !isPositiveSafeInteger(storedItem.quantity)) continue
    if (!(typeof storedItem.size === 'string' || storedItem.size === null)) continue

    const product = productsBySlug.get(storedItem.productSlug)
    if (!product) continue
    if (getCartValidationError(product, storedItem.size)) continue

    const availableStock = getAvailableStock(product, storedItem.size)
    if (!isPositiveSafeInteger(availableStock)) continue

    const price = getDisplayPrice(product)
    if (!Number.isFinite(price) || price < 0) continue

    const id = createCartItemId(product.slug, storedItem.size)
    const quantity = Math.min(storedItem.quantity, availableStock)
    const existing = sanitizedById.get(id)

    if (existing) {
      sanitizedById.set(id, {
        ...existing,
        quantity: Math.min(existing.quantity + quantity, availableStock)
      })
      continue
    }

    sanitizedById.set(id, {
      id,
      productSlug: product.slug,
      title: product.title,
      price,
      quantity,
      size: storedItem.size,
      saleStatus: product.saleStatus
    })
  }

  return [...sanitizedById.values()]
}

export function addCartItem(cart: CartItem[], product: Product, size: string | null): CartResult {
  const validationError = getCartValidationError(product, size)
  if (validationError) return { ok: false, error: validationError }

  const id = createCartItemId(product.slug, size)
  const existing = cart.find((item) => item.id === id)

  if (existing) {
    const availableStock = getAvailableStock(product, size)
    if (!Number.isSafeInteger(existing.quantity) || existing.quantity >= availableStock) {
      return { ok: false, error: 'OUT_OF_STOCK' }
    }

    return {
      ok: true,
      cart: cart.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
    }
  }

  return {
    ok: true,
    cart: [
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
}

export function removeCartItem(cart: CartItem[], id: string): CartItem[] {
  return cart.filter((item) => item.id !== id)
}

export function updateCartItemQuantity(cart: CartItem[], id: string, quantity: number): CartItem[] {
  if (!Number.isSafeInteger(quantity)) return cart
  if (quantity <= 0) return removeCartItem(cart, id)

  return cart.map((item) => (item.id === id ? { ...item, quantity } : item))
}

export function calculateCartTotals(cart: CartItem[], deliveryTotal = 0): CartTotals {
  const safeDeliveryTotal = Number.isFinite(deliveryTotal) && deliveryTotal >= 0 ? deliveryTotal : 0
  const itemsTotal = cart.reduce((sum, item) => {
    if (!isPositiveSafeInteger(item.quantity) || !Number.isFinite(item.price) || item.price < 0) {
      return sum
    }

    return sum + item.price * item.quantity
  }, 0)

  return {
    itemsTotal,
    deliveryTotal: safeDeliveryTotal,
    orderTotal: itemsTotal + safeDeliveryTotal,
    hasPreorder: cart.some((item) => item.saleStatus === 'preorder')
  }
}
