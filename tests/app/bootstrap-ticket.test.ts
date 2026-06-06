import { describe, expect, it } from 'vitest'

import { issueBootstrapTicket, verifyBootstrapTicket } from '../../src/lib/bootstrapTicket'

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
