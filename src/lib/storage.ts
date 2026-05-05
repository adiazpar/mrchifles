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

import 'server-only'
import fs from 'fs/promises'
import path from 'path'
import { isBase64DataUrl } from './utils'
import type { ImageMimeType } from './file-sniff'
import { logServerError } from './server-logger'
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
 * Map a sniffed image MIME to a filesystem extension. Limited to the
 * raster types `sniffImageMimeType` can return — no SVG, since the
 * upload routes content-sniff and reject SVG explicitly. Including
 * 'image/svg+xml' here previously was dead+dangerous: combined with a
 * client-declared MIME, an SVG could land on dev disk under a .svg
 * filename, which Next.js then served with Content-Type: image/svg+xml,
 * giving a stored-XSS surface in any direct hit.
 */
function getExtensionFromMimeType(mimeType: ImageMimeType): string {
  switch (mimeType) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
  }
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
 * Upload a product icon. The MIME type passed here MUST be the result
 * of `sniffImageMimeType(buffer)` — never File.type, which is client-
 * declared and spoofable. Storing the sniffed type guarantees the data
 * URL prefix (production) or the on-disk extension (dev) cannot lie.
 *
 * Local dev: Saves file to public/media/products/<productId>.<ext>
 * Production: Returns base64 data URL using the SNIFFED MIME
 *
 * @returns The icon URL or data URL to store in the database
 */
export async function uploadProductIcon(
  buffer: Buffer,
  productId: string,
  sniffedMime: ImageMimeType,
): Promise<string> {
  if (IS_PRODUCTION) {
    // Production: build the data URL from the buffer + sniffed MIME so
    // the prefix can never disagree with the payload.
    return `data:${sniffedMime};base64,${buffer.toString('base64')}`
  }
  // Local dev: save to file system. Filename uses the sniffed-extension
  // mapping; SVG is intentionally absent so an SVG can never end up on
  // disk even via a future bug.
  await ensureMediaDir()
  const ext = getExtensionFromMimeType(sniffedMime)
  const filename = `${productId}.${ext}`
  const filepath = path.join(MEDIA_DIR, filename)

  // Delete any existing files for this product (different extensions)
  await deleteProductIconFiles(productId)

  await fs.writeFile(filepath, buffer)
  // Cache-buster query param — same filename on re-upload would otherwise
  // serve a stale image from the browser cache.
  return `/media/products/${filename}?v=${Date.now()}`
}

/**
 * Delete product icon files (local dev only)
 * Removes all files matching the productId regardless of extension.
 * Includes 'svg' in the cleanup list so legacy on-disk SVGs from
 * before the icon-sniff hardening still get cleaned up on next write.
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
    logServerError('storage.delete-icon-files', err)
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
      logServerError('storage.delete-icon-file', err)
    }
  }
}
