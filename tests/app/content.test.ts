import { describe, expect, it } from 'vitest'

import { lexicalToPlainText, sanitizeExternalUrl } from '../../src/lib/content'

describe('sanitizeExternalUrl', () => {
  it('accepts http and https links', () => {
    expect(sanitizeExternalUrl('https://example.com/interview')).toBe(
      'https://example.com/interview'
    )
    expect(sanitizeExternalUrl('http://t.me/grushkostepan')).toBe('http://t.me/grushkostepan')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeExternalUrl('  https://example.com  ')).toBe('https://example.com')
  })

  it('rejects dangerous or non-http(s) protocols', () => {
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeExternalUrl('data:text/html,<script>')).toBeNull()
    expect(sanitizeExternalUrl('mailto:hi@example.com')).toBeNull()
  })

  it('rejects empty, malformed, or non-string values', () => {
    expect(sanitizeExternalUrl('')).toBeNull()
    expect(sanitizeExternalUrl('   ')).toBeNull()
    expect(sanitizeExternalUrl('not a url')).toBeNull()
    expect(sanitizeExternalUrl(null)).toBeNull()
    expect(sanitizeExternalUrl(undefined)).toBeNull()
    expect(sanitizeExternalUrl(42)).toBeNull()
  })
})

describe('lexicalToPlainText', () => {
  const doc = {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Первый абзац' },
            { type: 'text', text: ' статьи.' }
          ]
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Второй абзац.' }]
        }
      ]
    }
  }

  it('collects text from nested Lexical nodes', () => {
    expect(lexicalToPlainText(doc)).toBe('Первый абзац  статьи. Второй абзац.'.replace(/\s+/g, ' '))
  })

  it('returns empty string for missing or malformed content', () => {
    expect(lexicalToPlainText(undefined)).toBe('')
    expect(lexicalToPlainText(null)).toBe('')
    expect(lexicalToPlainText({})).toBe('')
    expect(lexicalToPlainText({ root: {} })).toBe('')
  })
})
