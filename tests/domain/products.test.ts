import { describe, expect, it } from 'vitest'

import { isValidProductSlug } from '../../src/domain/products'

describe('isValidProductSlug', () => {
  it('accepts lowercase kebab-case slugs', () => {
    expect(isValidProductSlug('test-00')).toBe(true)
    expect(isValidProductSlug('test-1')).toBe(true)
    expect(isValidProductSlug('overshirt')).toBe(true)
  })

  it('rejects the "?" slug that produced broken /shop? links', () => {
    expect(isValidProductSlug('?')).toBe(false)
  })

  it('rejects empty, whitespace and non-string values', () => {
    expect(isValidProductSlug('')).toBe(false)
    expect(isValidProductSlug('   ')).toBe(false)
    expect(isValidProductSlug(undefined)).toBe(false)
    expect(isValidProductSlug(null)).toBe(false)
  })

  it('rejects uppercase, spaces, separators and dangling hyphens', () => {
    expect(isValidProductSlug('Test-00')).toBe(false)
    expect(isValidProductSlug('test 00')).toBe(false)
    expect(isValidProductSlug('test/00')).toBe(false)
    expect(isValidProductSlug('-test')).toBe(false)
    expect(isValidProductSlug('test-')).toBe(false)
  })
})
