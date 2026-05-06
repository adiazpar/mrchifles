/**
 * Client-safe storage helpers.
 *
 * Pure functions that work in both browser and server environments --
 * no Node.js imports (fs, path, etc.). Client components MUST import
 * from this file rather than `./storage`, because `./storage` has a
 * top-level `import fs from 'fs/promises'` that breaks the browser
 * bundle.
 *
 * Server code can still import these helpers from `./storage`, which
 * re-exports them.
 */

/**
 * Convert a File to a base64 data URL string
 * Returns format: data:image/png;base64,iVBORw0KGgo...
 */
export async function fileToBase64(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = file.type || 'image/png'
  return `data:${mimeType};base64,${base64}`
}

/**
 * Get the size in bytes of a base64-encoded payload.
 *
 * Decodes via Buffer.from rather than computing
 * `Math.ceil(length * 3 / 4)` — that math underestimates by up to 2
 * bytes when the `=` padding is stripped and is brittle if any
 * caller ever feeds in whitespace-containing or non-padded base64
 * (audit L-15). Buffer.from handles all of these consistently.
 *
 * Browser-safe: Node's Buffer is polyfilled by Next.js's webpack
 * config in client bundles for code paths that share this helper.
 * We're called from React event handlers, never the SSR layer.
 */
export function getBase64Size(base64: string): number {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
  return Buffer.from(base64Data, 'base64').length
}

/**
 * Maximum icon size in bytes (100KB).
 * Used for product icons (many small tiles stored as base64 data URLs).
 * Base64 adds ~33% overhead, so this allows ~75KB original images.
 */
const MAX_ICON_SIZE = 100 * 1024

/**
 * Maximum image upload size in bytes (2MB).
 * Used for user avatars and business logos — single hero images per row,
 * so the larger cap gives a more forgiving UX for phone-captured photos.
 */
export const MAX_UPLOAD_SIZE = 2 * 1024 * 1024

/**
 * Validate that an icon is within size limits
 */
export function validateIconSize(base64: string): { valid: boolean; size: number } {
  const size = getBase64Size(base64)
  return {
    valid: size <= MAX_ICON_SIZE,
    size,
  }
}
