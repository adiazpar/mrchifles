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
 * Decode + sniff a base64 (or `data:image/...;base64,...`) string,
 * enforce a max-decoded-size cap, and return the safe payload to
 * forward to upstream AI providers.
 *
 * Returns:
 *   - { ok: true, sniffed, dataUrl } on success — `dataUrl` is the
 *     re-encoded data URL using the SNIFFED MIME (never the
 *     client-declared one).
 *   - { ok: false, reason } when the input is non-string, decodes to
 *     bytes that don't match a known raster image, or exceeds the cap.
 *
 * Without this guard, the AI routes accepted any string and forwarded
 * it to OpenAI / fal.ai unchecked. Even a non-image string burned
 * provider tokens before the upstream rejected, and a `data:text/html`
 * payload could in theory be stored if any future code path persisted
 * the input verbatim.
 */
export function decodeAndSniffAiImage(
  input: unknown,
  maxDecodedBytes: number,
):
  | { ok: true; sniffed: ImageMimeType; dataUrl: string }
  | { ok: false; reason: 'invalid-input' | 'unsupported-type' | 'too-large' } {
  if (typeof input !== 'string' || input.length === 0) {
    return { ok: false, reason: 'invalid-input' }
  }
  // Strip the optional `data:image/...;base64,` prefix. The MIME in
  // that prefix is client-declared and ignored — we sniff the bytes.
  const commaIdx = input.indexOf(',')
  const payload =
    input.startsWith('data:') && commaIdx !== -1 ? input.slice(commaIdx + 1) : input
  let bytes: Buffer
  try {
    bytes = Buffer.from(payload, 'base64')
  } catch {
    return { ok: false, reason: 'invalid-input' }
  }
  if (bytes.length === 0) {
    return { ok: false, reason: 'invalid-input' }
  }
  if (bytes.length > maxDecodedBytes) {
    return { ok: false, reason: 'too-large' }
  }
  const sniffed = sniffImageMimeType(bytes)
  if (!sniffed || sniffed === 'image/gif') {
    // GIF is not an AI-pipeline input format (the upstreams choke on
    // animated GIF and the icon pipeline expects still images);
    // restrict to PNG/JPEG/WEBP.
    return { ok: false, reason: 'unsupported-type' }
  }
  return {
    ok: true,
    sniffed,
    dataUrl: `data:${sniffed};base64,${bytes.toString('base64')}`,
  }
}

/**
 * Detect a HEIC / HEIF file by inspecting the ftyp box at offset 4.
 * Returns true for any of the brand codes (`heic`, `heix`, `hevc`,
 * `hevx`, `mif1`, `msf1`) that map to still-image HEIF variants.
 *
 * The convert-heic route hands raw bytes to `heic-convert` (which
 * wraps native libheif/libde265 — historical CVE surface). Without
 * this guard the route accepted any 0-30 MB blob; sniffing
 * upfront rejects garbage before the parser sees it.
 */
export function isHeic(bytes: Uint8Array): boolean {
  // ftyp container: bytes 0-3 are box size (any), bytes 4-7 are
  // ASCII "ftyp", bytes 8-11 are the major brand. We allow the
  // brand to live at offset 8 (standard) or at offset 16 in
  // segmented files; the standard offset covers ~all HEIC produced
  // by phones.
  if (bytes.length < 12) return false
  if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) {
    return false // missing "ftyp"
  }
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
  return (
    brand === 'heic' ||
    brand === 'heix' ||
    brand === 'hevc' ||
    brand === 'hevx' ||
    brand === 'mif1' ||
    brand === 'msf1'
  )
}

