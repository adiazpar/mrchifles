import { describe, it, expect } from 'vitest'
import { postSaleSchema } from '../schema'

describe('POST /sales schema', () => {
  const validBody = {
    paymentMethod: 'cash' as const,
    items: [{ productId: 'prod_1', quantity: 2 }],
  }

  it('accepts the minimum valid body', () => {
    const r = postSaleSchema.safeParse(validBody)
    expect(r.success).toBe(true)
  })

  it('accepts cash, card, other payment methods', () => {
    for (const method of ['cash', 'card', 'other']) {
      expect(postSaleSchema.safeParse({ ...validBody, paymentMethod: method }).success).toBe(true)
    }
  })

  it('rejects unknown payment method', () => {
    expect(postSaleSchema.safeParse({ ...validBody, paymentMethod: 'crypto' }).success).toBe(false)
  })

  it('rejects empty items', () => {
    expect(postSaleSchema.safeParse({ ...validBody, items: [] }).success).toBe(false)
  })

  it('rejects more than 100 items', () => {
    const items = Array.from({ length: 101 }, () => ({ productId: 'p', quantity: 1 }))
    expect(postSaleSchema.safeParse({ ...validBody, items }).success).toBe(false)
  })

  it('rejects quantity 0 or negative', () => {
    expect(postSaleSchema.safeParse({
      ...validBody,
      items: [{ productId: 'p', quantity: 0 }],
    }).success).toBe(false)
    expect(postSaleSchema.safeParse({
      ...validBody,
      items: [{ productId: 'p', quantity: -1 }],
    }).success).toBe(false)
  })

  it('rejects quantity > 1000', () => {
    expect(postSaleSchema.safeParse({
      ...validBody,
      items: [{ productId: 'p', quantity: 1001 }],
    }).success).toBe(false)
  })

  it('rejects notes longer than 1000 chars', () => {
    expect(postSaleSchema.safeParse({
      ...validBody,
      notes: 'x'.repeat(1001),
    }).success).toBe(false)
  })

  it('accepts notes up to 1000 chars', () => {
    expect(postSaleSchema.safeParse({
      ...validBody,
      notes: 'x'.repeat(1000),
    }).success).toBe(true)
  })

  it('accepts a date in ISO format', () => {
    expect(postSaleSchema.safeParse({
      ...validBody,
      date: '2026-04-29T12:00:00Z',
    }).success).toBe(true)
  })

  it('rejects an invalid date string', () => {
    expect(postSaleSchema.safeParse({
      ...validBody,
      date: 'not-a-date',
    }).success).toBe(false)
  })
})
