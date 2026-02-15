import PocketBase from 'pocketbase'

// NEXT_PUBLIC_ prefix makes this available in browser
// Falls back to localhost for local development
const POCKETBASE_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.POCKETBASE_URL ||
  'http://127.0.0.1:8090'

// Singleton instance
let pb: PocketBase | null = null

/**
 * Get PocketBase singleton instance
 * Works both server-side and client-side
 */
export function getPocketBase(): PocketBase {
  if (!pb) {
    pb = new PocketBase(POCKETBASE_URL)
  }
  return pb
}

/**
 * Create a fresh PocketBase instance (useful for auth flows)
 */
export function createPocketBase(): PocketBase {
  return new PocketBase(POCKETBASE_URL)
}

export default getPocketBase
