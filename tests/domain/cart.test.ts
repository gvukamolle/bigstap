import { describe, expect, it } from 'vitest'
import {
  addCartItem,
  calculateCartTotals,
  sanitizeCart,
  updateCartItemQuantity,
  type CartItem,
  type CartResult
} from '../../src/domain/cart'
import { products } from '../../src/data/products'
import { isSelectableSize, type Product } from '../../src/domain/products'

function productBySlug(slug: string): Product {
  const product = products.find((item) => item.slug === slug)
  if (!product) throw new Error(`Fixture product missing: ${slug}`)

  return product
}

function cartFrom(result: CartResult): CartItem[] {
  if (!result.ok) throw new Error(`Cart add failed: ${result.error}`)

  return result.cart
}

function oneSizeProduct(stock = 8): Product {
  return {
    slug: 'test-sticker',
    title: 'Тестовый стикер',
    category: 'Аксессуары',
    dropName: 'Тестовый дроп',
    price: 900,
    saleStatus: 'in_stock',
    type: 'one_size',
    stock,
    shortDescription: 'Тестовый товар без размера.',
    description: 'Локальная фикстура для проверки one-size логики корзины.',
    image: {
      src: '/images/bigstep/test-00-front.jpg',
      alt: 'Тестовый товар'
    },
    imageTone: 'cream',
    published: true
  }
}

describe('cart domain', () => {
  it('adds sized products with selected size', () => {
    const test00 = productBySlug('test-00')

    const result = addCartItem([], test00, '3')

    expect(result).toEqual({
      ok: true,
      cart: [
        {
          id: 'test-00:3',
          productSlug: 'test-00',
          title: 'ТЕСТ 00',
          price: 7900,
          quantity: 1,
          size: '3',
          saleStatus: 'in_stock'
        }
      ]
    })
  })

  it('adds one-size products without selected size', () => {
    const result = addCartItem([], oneSizeProduct(), null)

    expect(result).toEqual({
      ok: true,
      cart: [
        {
          id: 'test-sticker:one-size',
          productSlug: 'test-sticker',
          title: 'Тестовый стикер',
          price: 900,
          quantity: 1,
          size: null,
          saleStatus: 'in_stock'
        }
      ]
    })
  })

  it('increments an existing cart line instead of duplicating it', () => {
    const test01 = productBySlug('test-01')

    const first = cartFrom(addCartItem([], test01, '3'))
    const second = addCartItem(first, test01, '3')

    expect(second.ok).toBe(true)
    if (!second.ok) throw new Error(second.error)
    expect(second.cart).toHaveLength(1)
    expect(second.cart[0]?.quantity).toBe(2)
  })

  it('rejects adding a sized product beyond available stock', () => {
    const test00 = productBySlug('test-00')
    if (test00.type !== 'sized') throw new Error('Expected sized fixture')

    let cart: CartItem[] = []
    for (let count = 0; count < 20; count += 1) {
      cart = cartFrom(addCartItem(cart, test00, '3'))
    }

    const beforeLimitAdd = [...cart]
    const limitResult = addCartItem(cart, test00, '3')

    expect(cart).toEqual(beforeLimitAdd)
    expect(limitResult).toEqual({ ok: false, error: 'OUT_OF_STOCK' })
  })

  it('rejects adding a one-size product beyond available stock', () => {
    const sticker = oneSizeProduct(2)
    if (sticker.type !== 'one_size') throw new Error('Expected one-size fixture')

    let cart: CartItem[] = []
    for (let count = 0; count < sticker.stock; count += 1) {
      cart = cartFrom(addCartItem(cart, sticker, null))
    }

    const beforeLimitAdd = [...cart]
    const limitResult = addCartItem(cart, sticker, null)

    expect(cart).toEqual(beforeLimitAdd)
    expect(limitResult).toEqual({ ok: false, error: 'OUT_OF_STOCK' })
  })

  it('calculates preorder presence and totals', () => {
    const test00 = productBySlug('test-00')
    const test01 = productBySlug('test-01')
    const preorderProduct: Product = { ...test01, saleStatus: 'preorder' }

    const cart = cartFrom(addCartItem(cartFrom(addCartItem([], test00, '3')), preorderProduct, '3'))
    const totals = calculateCartTotals(cart, 650)

    expect(totals).toEqual({
      itemsTotal: 15800,
      deliveryTotal: 650,
      orderTotal: 16450,
      hasPreorder: true
    })
  })

  it('rejects missing, invalid, and out-of-stock sizes for sized products', () => {
    const test00 = productBySlug('test-00')
    if (test00.type !== 'sized') throw new Error('Expected sized fixture')

    const withOutOfStockSize: Product = {
      ...test00,
      sizes: [...test00.sizes, { label: '4', stock: 0 }]
    }

    expect(addCartItem([], test00, null)).toEqual({ ok: false, error: 'SIZE_REQUIRED' })
    expect(addCartItem([], test00, '4')).toEqual({ ok: false, error: 'SIZE_UNAVAILABLE' })
    expect(addCartItem([], withOutOfStockSize, '4')).toEqual({
      ok: false,
      error: 'SIZE_UNAVAILABLE'
    })
  })

  it('rejects sold out, hidden, and unpublished products', () => {
    const test00 = productBySlug('test-00')

    const unavailableProducts: Product[] = [
      { ...test00, saleStatus: 'sold_out' },
      { ...test00, saleStatus: 'hidden' },
      { ...test00, published: false }
    ]

    for (const product of unavailableProducts) {
      expect(addCartItem([], product, '3')).toEqual({ ok: false, error: 'PRODUCT_UNAVAILABLE' })
    }
  })

  it('rejects one-size products with a selected size or no stock', () => {
    const sticker = oneSizeProduct()
    const outOfStockSticker = oneSizeProduct(0)

    expect(addCartItem([], sticker, '3')).toEqual({ ok: false, error: 'SIZE_NOT_ALLOWED' })
    expect(addCartItem([], outOfStockSticker, null)).toEqual({ ok: false, error: 'OUT_OF_STOCK' })
  })

  it('removes non-positive quantities and leaves invalid quantities unchanged', () => {
    const cart = cartFrom(addCartItem([], oneSizeProduct(), null))
    const id = 'test-sticker:one-size'

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

  it('requires finite stock for selectable sized products', () => {
    const test00 = productBySlug('test-00')
    if (test00.type !== 'sized') throw new Error('Expected sized fixture')

    const infiniteStockProduct: Product = {
      ...test00,
      sizes: [{ label: '3', stock: Number.POSITIVE_INFINITY }]
    }

    expect(isSelectableSize(infiniteStockProduct, '3')).toBe(false)
  })

  it('exports frozen fixtures so consumers cannot mutate shared products', () => {
    const test00 = productBySlug('test-00')
    if (test00.type !== 'sized') throw new Error('Expected sized fixture')

    expect(Object.isFrozen(products)).toBe(true)
    expect(Object.isFrozen(test00)).toBe(true)
    expect(Object.isFrozen(test00.image)).toBe(true)
    expect(Object.isFrozen(test00.gallery)).toBe(true)
    expect(Object.isFrozen(test00.gallery?.[0])).toBe(true)
    expect(Object.isFrozen(test00.sizes)).toBe(true)
    expect(Object.isFrozen(test00.sizes[0])).toBe(true)
    expect(() => {
      ;(test00 as { title: string }).title = 'Mutated title'
    }).toThrow(TypeError)
    expect(test00.title).toBe('ТЕСТ 00')
  })

  it('sanitizes stored cart lines against canonical product data', () => {
    const test00 = productBySlug('test-00')
    const test01 = productBySlug('test-01')
    if (test00.type !== 'sized') throw new Error('Expected sized fixture')
    if (test01.type !== 'sized') throw new Error('Expected sized fixture')

    const sanitized = sanitizeCart(
      [
        {
          id: 'tampered-id',
          productSlug: test00.slug,
          title: 'Tampered',
          price: Number.MAX_SAFE_INTEGER,
          quantity: 999,
          size: '3',
          saleStatus: 'hidden'
        },
        {
          id: 'tampered-second',
          productSlug: test01.slug,
          title: 'Tampered second',
          price: -1,
          quantity: 2,
          size: '3',
          saleStatus: 'hidden'
        }
      ],
      products
    )

    expect(sanitized).toEqual([
      {
        id: 'test-00:3',
        productSlug: 'test-00',
        title: 'ТЕСТ 00',
        price: 7900,
        quantity: 20,
        size: '3',
        saleStatus: 'in_stock'
      },
      {
        id: 'test-01:3',
        productSlug: 'test-01',
        title: 'ТЕСТ 01',
        price: 7900,
        quantity: 2,
        size: '3',
        saleStatus: 'in_stock'
      }
    ])
  })

  it('drops unavailable, missing, and invalid stored cart lines', () => {
    const test00 = productBySlug('test-00')
    const sticker = oneSizeProduct()
    if (test00.type !== 'sized') throw new Error('Expected sized fixture')

    const unavailableProducts: Product[] = [
      { ...test00, slug: 'sold-out-product', saleStatus: 'sold_out' },
      { ...test00, slug: 'hidden-product', saleStatus: 'hidden' },
      { ...test00, slug: 'unpublished-product', published: false }
    ]

    const sanitized = sanitizeCart(
      [
        { productSlug: 'missing-product', quantity: 1, size: '3' },
        { productSlug: 'sold-out-product', quantity: 1, size: '3' },
        { productSlug: 'hidden-product', quantity: 1, size: '3' },
        { productSlug: 'unpublished-product', quantity: 1, size: '3' },
        { productSlug: test00.slug, quantity: 1, size: '4' },
        { productSlug: sticker.slug, quantity: 1, size: '3' },
        { productSlug: test00.slug, quantity: 0, size: '3' },
        { productSlug: test00.slug, quantity: -1, size: '3' },
        { productSlug: test00.slug, quantity: 1.5, size: '3' },
        { productSlug: test00.slug, quantity: Number.NaN, size: '3' },
        { productSlug: test00.slug, quantity: Number.POSITIVE_INFINITY, size: '3' },
        { productSlug: test00.slug, quantity: '2', size: '3' },
        null
      ],
      [...products, sticker, ...unavailableProducts]
    )

    expect(sanitized).toEqual([])
  })
})
