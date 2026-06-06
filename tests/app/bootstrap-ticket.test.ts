import { describe, expect, it } from 'vitest'

import {
  hasValidBootstrapCookie,
  issueBootstrapTicket,
  verifyBootstrapTicket
} from '../../src/lib/bootstrapTicket'

const SECRET = 'a-strong-bootstrap-secret-1234567890'
const NOW = 1_700_000_000_000

describe('bootstrap ticket (HMAC)', () => {
  it('verifies a freshly issued ticket', async () => {
    const ticket = await issueBootstrapTicket(SECRET, NOW)
    expect(await verifyBootstrapTicket(SECRET, ticket, NOW + 1000)).toBe(true)
  })

  it('rejects an expired ticket', async () => {
    const ticket = await issueBootstrapTicket(SECRET, NOW, 60_000)
    expect(await verifyBootstrapTicket(SECRET, ticket, NOW + 60_001)).toBe(false)
  })

  it('rejects a ticket signed with a different secret (master token not leaked)', async () => {
    const ticket = await issueBootstrapTicket(SECRET, NOW)
    expect(await verifyBootstrapTicket('a-different-secret-0987654321ab', ticket, NOW + 1000)).toBe(false)
  })

  it('rejects a tampered expiry', async () => {
    const ticket = await issueBootstrapTicket(SECRET, NOW, 60_000)
    const [exp, sig] = ticket.split('.')
    const tampered = `${Number(exp) + 600_000}.${sig}`
    expect(await verifyBootstrapTicket(SECRET, tampered, NOW + 1000)).toBe(false)
  })

  it('rejects malformed tickets', async () => {
    expect(await verifyBootstrapTicket(SECRET, '', NOW)).toBe(false)
    expect(await verifyBootstrapTicket(SECRET, 'garbage', NOW)).toBe(false)
    expect(await verifyBootstrapTicket(SECRET, 'a.b.c', NOW)).toBe(false)
    expect(await verifyBootstrapTicket(SECRET, 'notanumber.deadbeef', NOW)).toBe(false)
  })

  it('does not embed the secret in the ticket', async () => {
    const ticket = await issueBootstrapTicket(SECRET, NOW)
    expect(ticket).not.toContain(SECRET)
  })
})

describe('hasValidBootstrapCookie', () => {
  it('accepts a cookie header containing a valid ticket', async () => {
    const ticket = await issueBootstrapTicket(SECRET, NOW)
    const header = `other=1; payload-bootstrap=${ticket}; foo=bar`
    expect(await hasValidBootstrapCookie(header, SECRET, NOW + 1000)).toBe(true)
  })

  it('rejects when the bootstrap cookie is absent', async () => {
    expect(await hasValidBootstrapCookie('foo=bar; baz=qux', SECRET, NOW)).toBe(false)
  })

  it('rejects a null or empty cookie header', async () => {
    expect(await hasValidBootstrapCookie(null, SECRET, NOW)).toBe(false)
    expect(await hasValidBootstrapCookie('', SECRET, NOW)).toBe(false)
  })

  it('rejects an expired or forged ticket in the cookie', async () => {
    const ticket = await issueBootstrapTicket(SECRET, NOW, 60_000)
    expect(await hasValidBootstrapCookie(`payload-bootstrap=${ticket}`, SECRET, NOW + 60_001)).toBe(false)
    expect(await hasValidBootstrapCookie('payload-bootstrap=forged.signature', SECRET, NOW + 1000)).toBe(
      false
    )
  })
})
