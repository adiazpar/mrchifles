import PocketBase from 'pocketbase'

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'

// Singleton instance for server-side usage
let pb: PocketBase | null = null

/**
 * Get PocketBase singleton instance (server-side)
 * For client-side usage, create a new instance directly with `new PocketBase()`
 */
export function getPocketBase(): PocketBase {
  if (!pb) {
    pb = new PocketBase(POCKETBASE_URL)
  }
  return pb
}

export default getPocketBase
