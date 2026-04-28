import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { apiRequest, ApiError } from './api-client'

describe('apiRequest offline detection', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('converts a Chrome-style TypeError into OFFLINE_MUTATION_BLOCKED ApiError', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(apiRequest('/x'))
      .rejects.toMatchObject({ messageCode: 'OFFLINE_MUTATION_BLOCKED', statusCode: 0 })
  })

  it('converts a Firefox-style TypeError into OFFLINE_MUTATION_BLOCKED', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('NetworkError when attempting to fetch resource.'))
    await expect(apiRequest('/x'))
      .rejects.toMatchObject({ messageCode: 'OFFLINE_MUTATION_BLOCKED' })
  })

  it('converts a Safari-style TypeError into OFFLINE_MUTATION_BLOCKED', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Load failed'))
    await expect(apiRequest('/x'))
      .rejects.toMatchObject({ messageCode: 'OFFLINE_MUTATION_BLOCKED' })
  })

  it('produces an ApiError instance (so consumers using err.envelope work)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    try {
      await apiRequest('/x')
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).envelope).toEqual({
        messageCode: 'OFFLINE_MUTATION_BLOCKED',
        messageVars: undefined,
      })
    }
  })

  it('rethrows non-network TypeErrors unchanged', async () => {
    const unrelated = new TypeError('Some other type error')
    globalThis.fetch = vi.fn().mockRejectedValue(unrelated)
    await expect(apiRequest('/x')).rejects.toBe(unrelated)
  })

  it('rethrows non-TypeError rejections unchanged', async () => {
    const aborted = new DOMException('aborted', 'AbortError')
    globalThis.fetch = vi.fn().mockRejectedValue(aborted)
    await expect(apiRequest('/x')).rejects.toBe(aborted)
  })
})
