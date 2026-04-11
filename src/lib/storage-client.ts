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
 * Convert a Blob to a base64 data URL string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mimeType = blob.type || 'image/png'
  return `data:${mimeType};base64,${base64}`
}

/**
 * Get the approximate size in bytes of a base64 string
 */
export function getBase64Size(base64: string): number {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64
  return Math.ceil((base64Data.length * 3) / 4)
}

/**
 * Maximum icon size in bytes (100KB).
 * Base64 adds ~33% overhead, so this allows ~75KB original images.
 */
export const MAX_ICON_SIZE = 100 * 1024

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
