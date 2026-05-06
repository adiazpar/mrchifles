import { describe, it, expect, vi } from 'vitest'

// Mock the db proxy before importing the module under test so we don't
// instantiate a real libsql client during the test run. The DB proxy in
// src/db/index.ts auto-creates a connection on first method access.
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
  },
  businesses: {},
  businessUsers: {},
  products: {},
  providers: {},
  productCategories: {},
}))

import { assertProductsInBusiness } from './business-auth'

describe('assertProductsInBusiness', () => {
  it('returns true for an empty product list (no DB query)', async () => {
    // Empty input is vacuously true. The function must short-circuit
    // BEFORE issuing a DB query — verified by leaving db.select as a
    // bare vi.fn() that would throw on call.
    await expect(assertProductsInBusiness([], 'biz-1')).resolves.toBe(true)
  })
})
