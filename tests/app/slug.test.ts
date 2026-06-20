import { describe, expect, it } from 'vitest'

import { isValidProductSlug } from '../../src/domain/products'
import { slugify } from '../../src/lib/slug'

describe('slugify', () => {
  it('transliterates Russian titles to latin kebab-case', () => {
    expect(slugify('Худи 01')).toBe('khudi-01')
    expect(slugify('ТЕСТ 00')).toBe('test-00')
    expect(slugify('Платье «Лето»')).toBe('plate-leto')
  })

  it('handles latin input', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('collapses separators and trims edges', () => {
    expect(slugify('  Куртка —  Зима  ')).toBe('kurtka-zima')
  })

  it('returns empty string for untranslatable or empty input', () => {
    expect(slugify('🔥🔥')).toBe('')
    expect(slugify('')).toBe('')
  })

  it('always produces a value accepted by isValidProductSlug', () => {
    for (const title of ['Свитшот 2026', 'ТЕСТ 00', 'Куртка — Зима']) {
      const slug = slugify(title)
      expect(isValidProductSlug(slug)).toBe(true)
    }
  })
})
