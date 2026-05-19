import { describe, expect, it } from 'vitest'
import {
  addCartItem,
  calculateCartTotals,
  updateCartItemQuantity,
  type CartItem,
  type CartResult
} from '../../src/domain/cart'
import { products } from '../../src/data/products'
import type { Product } from '../../src/domain/products'

function productBySlug(slug: string): Product {
  const product = products.find((item) => item.slug === slug)
  if (!product) throw new Error(`Fixture product missing: ${slug}`)

  return product
}

function cartFrom(result: CartResult): CartItem[] {
  if (!result.ok) throw new Error(`Cart add failed: ${result.error}`)

  return result.cart
}

describe('cart domain', () => {
  it('adds sized products with selected size', () => {
    const overshirt = productBySlug('overshirt-01')

    const result = addCartItem([], overshirt, 'M')

    expect(result).toEqual({
      ok: true,
      cart: [
        {
          id: 'overshirt-01:M',
          productSlug: 'overshirt-01',
          title: 'Овершерт 01',
          price: 12900,
          quantity: 1,
          size: 'M',
          saleStatus: 'in_stock'
        }
      ]
    })
  })

  it('adds one-size products without selected size', () => {
    const bag = productBySlug('bag-one-size')

    const result = addCartItem([], bag, null)

    expect(result).toEqual({
      ok: true,
      cart: [
        {
          id: 'bag-one-size:one-size',
          productSlug: 'bag-one-size',
          title: 'Сумка One Size',
          price: 6900,
          quantity: 1,
          size: null,
          saleStatus: 'in_stock'
        }
      ]
    })
  })

  it('increments an existing cart line instead of duplicating it', () => {
    const tee = productBySlug('tee-preorder')

    const first = cartFrom(addCartItem([], tee, 'S'))
    const second = addCartItem(first, tee, 'S')

    expect(second.ok).toBe(true)
    if (!second.ok) throw new Error(second.error)
    expect(second.cart).toHaveLength(1)
    expect(second.cart[0]?.quantity).toBe(2)
  })

  it('calculates preorder presence and totals', () => {
    const overshirt = productBySlug('overshirt-01')
    const tee = productBySlug('tee-preorder')

    const cart = cartFrom(addCartItem(cartFrom(addCartItem([], overshirt, 'M')), tee, 'M'))
    const totals = calculateCartTotals(cart, 650)

    expect(totals).toEqual({
      itemsTotal: 20800,
      deliveryTotal: 650,
      orderTotal: 21450,
      hasPreorder: true
    })
  })

  it('rejects missing, invalid, and out-of-stock sizes for sized products', () => {
    const overshirt = productBySlug('overshirt-01')
    if (overshirt.type !== 'sized') throw new Error('Expected sized fixture')

    const withOutOfStockSize: Product = {
      ...overshirt,
      sizes: [...overshirt.sizes, { label: 'XL', stock: 0 }]
    }

    expect(addCartItem([], overshirt, null)).toEqual({ ok: false, error: 'SIZE_REQUIRED' })
    expect(addCartItem([], overshirt, 'XL')).toEqual({ ok: false, error: 'SIZE_UNAVAILABLE' })
    expect(addCartItem([], withOutOfStockSize, 'XL')).toEqual({
      ok: false,
      error: 'SIZE_UNAVAILABLE'
    })
  })

  it('rejects sold out, hidden, and unpublished products', () => {
    const overshirt = productBySlug('overshirt-01')

    const unavailableProducts: Product[] = [
      { ...overshirt, saleStatus: 'sold_out' },
      { ...overshirt, saleStatus: 'hidden' },
      { ...overshirt, published: false }
    ]

    for (const product of unavailableProducts) {
      expect(addCartItem([], product, 'M')).toEqual({ ok: false, error: 'PRODUCT_UNAVAILABLE' })
    }
  })

  it('rejects one-size products with a selected size or no stock', () => {
    const bag = productBySlug('bag-one-size')
    if (bag.type !== 'one_size') throw new Error('Expected one-size fixture')

    const outOfStockBag: Product = { ...bag, stock: 0 }

    expect(addCartItem([], bag, 'M')).toEqual({ ok: false, error: 'SIZE_NOT_ALLOWED' })
    expect(addCartItem([], outOfStockBag, null)).toEqual({ ok: false, error: 'OUT_OF_STOCK' })
  })

  it('removes non-positive quantities and leaves invalid quantities unchanged', () => {
    const bag = productBySlug('bag-one-size')
    const cart = cartFrom(addCartItem([], bag, null))
    const id = 'bag-one-size:one-size'

    expect(updateCartItemQuantity(cart, id, 3)[0]?.quantity).toBe(3)
    expect(updateCartItemQuantity(cart, id, 0)).toEqual([])
    expect(updateCartItemQuantity(cart, id, -1)).toEqual([])
    expect(updateCartItemQuantity(cart, id, Number.NaN)).toEqual(cart)
    expect(updateCartItemQuantity(cart, id, Number.POSITIVE_INFINITY)).toEqual(cart)
    expect(updateCartItemQuantity(cart, id, 1.5)).toEqual(cart)
  })

  it('ignores invalid item quantities and invalid delivery totals', () => {
    const cart: CartItem[] = [
      {
        id: 'valid:one-size',
        productSlug: 'valid',
        title: 'Valid',
        price: 1000,
        quantity: 2,
        size: null,
        saleStatus: 'preorder'
      },
      {
        id: 'nan:one-size',
        productSlug: 'nan',
        title: 'NaN',
        price: 1000,
        quantity: Number.NaN,
        size: null,
        saleStatus: 'in_stock'
      },
      {
        id: 'fractional:one-size',
        productSlug: 'fractional',
        title: 'Fractional',
        price: 1000,
        quantity: 1.5,
        size: null,
        saleStatus: 'in_stock'
      },
      {
        id: 'negative:one-size',
        productSlug: 'negative',
        title: 'Negative',
        price: 1000,
        quantity: -1,
        size: null,
        saleStatus: 'in_stock'
      }
    ]

    expect(calculateCartTotals(cart, Number.NaN)).toEqual({
      itemsTotal: 2000,
      deliveryTotal: 0,
      orderTotal: 2000,
      hasPreorder: true
    })
    expect(calculateCartTotals(cart, -650).deliveryTotal).toBe(0)
    expect(calculateCartTotals(cart, Number.POSITIVE_INFINITY).deliveryTotal).toBe(0)
  })
})
