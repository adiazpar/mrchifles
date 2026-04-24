/**
 * Magic-byte sniffing for uploaded files.
 *
 * The upload routes also check the client-declared MIME type (via
 * File.type / the data-URL prefix), but that value is trusted from the
 * request and can be spoofed. These helpers inspect the actual leading
 * bytes of the decoded payload so a file can't claim to be PNG while
 * carrying SVG script content or an executable payload.
 */

/** Possible raster formats the app accepts for logos / avatars / icons. */
export type ImageMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif'

/**
 * Return the detected raster image MIME type by inspecting the magic
 * bytes, or null if the payload doesn't match any known raster format.
 * SVG has no distinctive magic (it's text), so it returns null here —
 * SVG rejection is the whole point.
 */
export function sniffImageMimeType(bytes: Uint8Array): ImageMimeType | null {
  if (bytes.length < 12) return null

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  // WebP: RIFF ???? WEBP  →  52 49 46 46 __ __ __ __ 57 45 42 50
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  // GIF: 47 49 46 38 (37|39) 61   →  "GIF87a" / "GIF89a"
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif'
  }

  return null
}

/**
 * Like sniffImageMimeType but also accepts PDF (common for order
 * receipts). Returns the detected MIME or null.
 */
export function sniffDocumentMimeType(
  bytes: Uint8Array,
): ImageMimeType | 'application/pdf' | null {
  const img = sniffImageMimeType(bytes)
  if (img) return img

  // PDF: 25 50 44 46 2D  →  "%PDF-"
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return 'application/pdf'
  }

  return null
}
