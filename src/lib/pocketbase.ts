import PocketBase from 'pocketbase'

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'

// Singleton instance
let pb: PocketBase | null = null

export function getPocketBase(): PocketBase {
  if (!pb) {
    pb = new PocketBase(POCKETBASE_URL)
  }
  return pb
}

// For client-side usage
export function createPocketBase(): PocketBase {
  return new PocketBase(POCKETBASE_URL)
}

export default getPocketBase
