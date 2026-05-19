import { describe, expect, it } from 'vitest'
import { addCartItem, calculateCartTotals } from '../../src/domain/cart'
import { products } from '../../src/data/products'

describe('cart domain', () => {
  it('adds sized products with selected size', () => {
    const overshirt = products.find((product) => product.slug === 'overshirt-01')
    if (!overshirt) throw new Error('Fixture product missing')

    const cart = addCartItem([], overshirt, 'M')

    expect(cart).toEqual([
      {
        id: 'overshirt-01:M',
        productSlug: 'overshirt-01',
        title: 'Овершерт 01',
        price: 12900,
        quantity: 1,
        size: 'M',
        saleStatus: 'in_stock'
      }
    ])
  })

  it('increments an existing cart line instead of duplicating it', () => {
    const tee = products.find((product) => product.slug === 'tee-preorder')
    if (!tee) throw new Error('Fixture product missing')

    const first = addCartItem([], tee, 'S')
    const second = addCartItem(first, tee, 'S')

    expect(second).toHaveLength(1)
    expect(second[0]?.quantity).toBe(2)
  })

  it('calculates preorder presence and totals', () => {
    const overshirt = products.find((product) => product.slug === 'overshirt-01')
    const tee = products.find((product) => product.slug === 'tee-preorder')
    if (!overshirt || !tee) throw new Error('Fixture products missing')

    const cart = addCartItem(addCartItem([], overshirt, 'M'), tee, 'M')
    const totals = calculateCartTotals(cart, 650)

    expect(totals).toEqual({
      itemsTotal: 20800,
      deliveryTotal: 650,
      orderTotal: 21450,
      hasPreorder: true
    })
  })
})
