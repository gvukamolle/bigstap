import { describe, expect, it } from 'vitest'

import { formatYookassaAmount, isYookassaWebhookIp } from '../../src/lib/yookassa'

describe('formatYookassaAmount', () => {
  it('formats integer rubles as a 2-decimal string (ЮKassa требует строку)', () => {
    expect(formatYookassaAmount(1990)).toBe('1990.00')
    expect(formatYookassaAmount(8550)).toBe('8550.00')
    expect(formatYookassaAmount(0)).toBe('0.00')
  })
})

describe('isYookassaWebhookIp', () => {
  it('accepts IPs within official YooKassa ranges', () => {
    expect(isYookassaWebhookIp('185.71.76.5')).toBe(true) // 185.71.76.0/27
    expect(isYookassaWebhookIp('185.71.77.30')).toBe(true) // 185.71.77.0/27
    expect(isYookassaWebhookIp('77.75.153.50')).toBe(true) // 77.75.153.0/25
    expect(isYookassaWebhookIp('77.75.154.200')).toBe(true) // 77.75.154.128/25
    expect(isYookassaWebhookIp('77.75.156.11')).toBe(true) // /32
    expect(isYookassaWebhookIp('77.75.156.35')).toBe(true) // /32
  })

  it('rejects IPs outside YooKassa ranges', () => {
    expect(isYookassaWebhookIp('8.8.8.8')).toBe(false)
    expect(isYookassaWebhookIp('185.71.76.32')).toBe(false) // вне /27 (0–31)
    expect(isYookassaWebhookIp('77.75.154.127')).toBe(false) // вне /25 (128–255)
    expect(isYookassaWebhookIp('77.75.156.12')).toBe(false)
  })

  it('rejects malformed input', () => {
    expect(isYookassaWebhookIp('not-an-ip')).toBe(false)
    expect(isYookassaWebhookIp('')).toBe(false)
    expect(isYookassaWebhookIp('185.71.76')).toBe(false)
    expect(isYookassaWebhookIp('999.1.1.1')).toBe(false)
  })
})
