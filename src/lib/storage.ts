/**
 * Storage utility for product icons (server-only file paths).
 *
 * Local dev: Files stored in public/media/products/ directory
 * Production: Base64 strings stored directly in the database
 *
 * **Server-only.** This module imports `fs/promises`, which doesn't
 * exist in the browser bundle. Client components must import the pure
 * helpers (fileToBase64, validateIconSize, etc.) from `./storage-client`
 * directly. They are re-exported here for server convenience.
 */

import fs from 'fs/promises'
import path from 'path'
import { isBase64DataUrl } from './utils'
// Pulled in for both local use (uploadProductIcon needs fileToBase64) and
// for the re-export below.
import {
  fileToBase64,
  getBase64Size,
  validateIconSize,
  MAX_UPLOAD_SIZE,
} from './storage-client'

// Re-export the client-safe helpers so existing server consumers keep
// working without changing their import paths.
export {
  fileToBase64,
  getBase64Size,
  validateIconSize,
  MAX_UPLOAD_SIZE,
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const MEDIA_DIR = path.join(process.cwd(), 'public', 'media', 'products')

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }
  return extensions[mimeType] || 'png'
}

/**
 * Ensure media directory exists (local dev only)
 */
async function ensureMediaDir(): Promise<void> {
  try {
    await fs.access(MEDIA_DIR)
  } catch {
    await fs.mkdir(MEDIA_DIR, { recursive: true })
  }
}

/**
 * Upload a product icon
 *
 * Local dev: Saves file to public/media/products/<productId>.<ext>
 * Production: Returns base64 data URL
 *
 * @returns The icon URL or data URL to store in the database
 */
export async function uploadProductIcon(file: File, productId: string, precomputedBase64?: string): Promise<string> {
  if (IS_PRODUCTION) {
    // Production: return base64 data URL (reuse if already computed)
    return precomputedBase64 || await fileToBase64(file)
  } else {
    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'image/png'
    // Local dev: save to file system
    await ensureMediaDir()
    const ext = getExtensionFromMimeType(mimeType)
    const filename = `${productId}.${ext}`
    const filepath = path.join(MEDIA_DIR, filename)

    // Delete any existing files for this product (different extensions)
    await deleteProductIconFiles(productId)

    await fs.writeFile(filepath, buffer)
    // Cache-buster query param — same filename on re-upload would otherwise
    // serve a stale image from the browser cache.
    return `/media/products/${filename}?v=${Date.now()}`
  }
}

/**
 * Delete product icon files (local dev only)
 * Removes all files matching the productId regardless of extension
 */
async function deleteProductIconFiles(productId: string): Promise<void> {
  try {
    await ensureMediaDir()
    const files = await fs.readdir(MEDIA_DIR)
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']

    for (const ext of extensions) {
      const filename = `${productId}.${ext}`
      if (files.includes(filename)) {
        await fs.unlink(path.join(MEDIA_DIR, filename))
      }
    }
  } catch (err) {
    // Ignore errors - file might not exist
    console.error('Error deleting icon files:', err)
  }
}

/**
 * Delete a product icon
 *
 * Local dev: Deletes file from public/media/products/
 * Production: No-op (base64 is deleted with the database row)
 */
export async function deleteProductIcon(iconUrl: string | null, productId?: string): Promise<void> {
  if (!iconUrl) return

  // If it's a base64 URL, nothing to delete (data is in the DB)
  if (isBase64DataUrl(iconUrl)) {
    return
  }

  // Local dev: delete file
  if (!IS_PRODUCTION && productId) {
    await deleteProductIconFiles(productId)
  } else if (!IS_PRODUCTION && iconUrl.startsWith('/media/products/')) {
    // Strip any cache-buster query string before resolving the filename.
    const [pathOnly] = iconUrl.split('?')
    const filename = pathOnly.replace('/media/products/', '')
    try {
      await fs.unlink(path.join(MEDIA_DIR, filename))
    } catch (err) {
      console.error('Error deleting icon file:', err)
    }
  }
}
