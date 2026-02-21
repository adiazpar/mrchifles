/**
 * Product utility functions
 */

const POCKETBASE_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  process.env.POCKETBASE_URL ||
  'http://127.0.0.1:8090'

/**
 * Get product image URL from PocketBase
 * @param product - Product with id, collectionId, and optional image filename
 * @param thumb - Optional thumbnail size ('100x100' or '200x200')
 * @returns Full URL to the image or null if no image
 */
export function getProductImageUrl(
  product: { id: string; collectionId: string; image?: string },
  thumb?: '100x100' | '200x200'
): string | null {
  if (!product.image) return null

  const baseUrl = `${POCKETBASE_URL}/api/files/${product.collectionId}/${product.id}/${product.image}`

  if (thumb) {
    return `${baseUrl}?thumb=${thumb}`
  }

  return baseUrl
}

/**
 * Format price for display (Peruvian Sol)
 */
export function formatPrice(price: number): string {
  return `S/ ${price.toFixed(2)}`
}
