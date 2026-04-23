import { customAlphabet } from 'nanoid'
import type { BarcodeFormat } from '@/types'

const BARCODE_FORMATS: BarcodeFormat[] = [
  'UPC_A',
  'UPC_E',
  'EAN_13',
  'EAN_8',
  'CODE_128',
  'CODE_39',
  'CODE_93',
  'CODABAR',
  'ITF',
  'UPC_EAN_EXTENSION',
]

const INTERNAL_BARCODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const generateInternalSuffix = customAlphabet(INTERNAL_BARCODE_ALPHABET, 10)

export function isBarcodeFormat(value: string): value is BarcodeFormat {
  return BARCODE_FORMATS.includes(value as BarcodeFormat)
}

export function getBarcodeFormatLabel(format: BarcodeFormat | null | undefined): string {
  if (!format) return 'Unknown format'

  const labels: Record<BarcodeFormat, string> = {
    CODABAR: 'Codabar',
    CODE_39: 'Code 39',
    CODE_93: 'Code 93',
    CODE_128: 'Code 128',
    ITF: 'ITF',
    EAN_13: 'EAN-13',
    EAN_8: 'EAN-8',
    UPC_A: 'UPC-A',
    UPC_E: 'UPC-E',
    UPC_EAN_EXTENSION: 'UPC/EAN Extension',
  }

  return labels[format]
}

/**
 * Normalize a barcode value to its canonical stored form. This is the single
 * chokepoint for ensuring that "ksr-abc", "KSR-ABC", and "  KSR-ABC  " all
 * collapse to the same string before being stored or compared.
 *
 * Operations: trim outer whitespace → collapse internal whitespace → uppercase.
 *
 * Note: uppercasing is technically lossy for Code 128 content (which is
 * case-sensitive), but in practice for small business inventory the practical
 * benefit of avoiding case-typo duplicates outweighs the theoretical purity.
 * Retail barcodes are all digits anyway, and KSR- codes are uppercase by
 * generation.
 */
export function normalizeBarcodeValue(value: string | null | undefined): string {
  return (value || '').trim().replace(/\s+/g, '').toUpperCase()
}

// ---------------------------------------------------------------------------
// Barcode format detection
// ---------------------------------------------------------------------------
//
// `detectBarcodeFormat` is the single source of truth for "what format is this
// value?". It is used by the manual-entry path in the product form and by the
// server-side validator. The format is never a user input — it is derived.
//
// Detection cascade (first match wins):
//   1. KSR- prefix                      → Code 128
//   2. 13 digits + valid check digit    → EAN-13
//   3. 12 digits + valid check digit    → UPC-A
//   4. 8  digits + valid check digit    → EAN-8
//   5. All digits, even length, ≥ 6     → ITF
//   6. Printable ASCII                  → Code 128 (always-available fallback)
//   7. Otherwise                        → null (caller should reject)
//
// Code 39 is intentionally NOT in the cascade. Code 128 is a strict superset
// of Code 39's encodable content, is denser, and is the modern default for
// non-retail barcodes. Keeping Code 39 as a branch meant plain numeric
// strings like "123456789" were misclassified as Code 39 just because
// digits are in the Code 39 charset. Code 39 is still accepted from the
// scanner (decoder tells us authoritatively) — we just don't guess it.

/**
 * Compute a GTIN check digit using the GS1 standard: starting from the
 * rightmost data digit, alternate *3 and *1, sum, then the check digit is
 * `(10 - sum % 10) % 10`. Works for UPC-A (11 data), EAN-13 (12 data), and
 * EAN-8 (7 data).
 */
function gtinCheckDigit(data: string): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    const digit = Number(data[data.length - 1 - i])
    sum += digit * (i % 2 === 0 ? 3 : 1)
  }
  return (10 - (sum % 10)) % 10
}

/** Returns true if `value` is all digits and its trailing digit is a valid GTIN check digit. */
function isValidGtin(value: string): boolean {
  if (!/^\d+$/.test(value)) return false
  const data = value.slice(0, -1)
  const check = Number(value.slice(-1))
  return gtinCheckDigit(data) === check
}

// Printable ASCII excluding control chars. Code 128 accepts the full range.
const PRINTABLE_ASCII = /^[\x20-\x7e]+$/

/**
 * Derive the barcode format for a given value. Returns `null` if the value is
 * empty, non-printable, or otherwise unrepresentable. The input is normalized
 * internally (trim + collapse whitespace + uppercase) before detection.
 */
export function detectBarcodeFormat(value: string | null | undefined): BarcodeFormat | null {
  if (!value) return null

  const v = value.trim().replace(/\s+/g, '').toUpperCase()
  if (!v) return null

  // 1. KSR- internal labels are always Code 128.
  if (v.startsWith('KSR-')) return 'CODE_128'

  // 2-4. GTIN family — require the correct length AND a valid check digit.
  //      This is what prevents a typo from being mislabeled as a real retail
  //      barcode.
  if (/^\d{13}$/.test(v) && isValidGtin(v)) return 'EAN_13'
  if (/^\d{12}$/.test(v) && isValidGtin(v)) return 'UPC_A'
  if (/^\d{8}$/.test(v)  && isValidGtin(v)) return 'EAN_8'

  // 5. ITF (Interleaved 2 of 5) requires an even number of digits and is
  //    commonly used for shipping cartons. Minimum length 6 to avoid matching
  //    short numeric strings that are more likely to be SKUs.
  if (/^\d+$/.test(v) && v.length >= 6 && v.length % 2 === 0) return 'ITF'

  // 6. Code 128 is the universal fallback — it accepts any printable ASCII.
  //    This branch is what guarantees manual entries always get a rendered
  //    visual, including plain numeric strings that didn't match a GTIN or
  //    ITF (e.g., "123456789").
  if (PRINTABLE_ASCII.test(v)) return 'CODE_128'

  // 7. Non-printable / non-ASCII input: caller should reject with a message.
  return null
}

export function generateInternalProductBarcode(): string {
  return `KSR-${generateInternalSuffix()}`
}

/**
 * Validate that a barcode value's KSR- prefix and its `source` field agree.
 *
 * The KSR- namespace is reserved for Kasero-generated labels. The full set of
 * valid (source, has-KSR-prefix) combinations is:
 *
 *   generated + KSR-      → ok (the only legitimate generated case)
 *   generated + non-KSR-  → reject (generator must produce KSR- values)
 *   scanned   + KSR-      → reject (real labels don't start with KSR-)
 *   scanned   + non-KSR-  → ok
 *   manual    + KSR-      → reject (KSR- is reserved)
 *   manual    + non-KSR-  → ok
 *
 * Returns a user-facing error message string if the combination is invalid,
 * or `null` if it is valid (or if `value`/`source` is null and the rule
 * doesn't apply).
 */
export function validateBarcodeSourcePrefix(
  value: string | null | undefined,
  source: 'scanned' | 'generated' | 'manual' | null | undefined,
): string | null {
  if (!value || !source) return null

  const isKsr = value.startsWith('KSR-')

  if (source === 'manual' && isKsr) {
    return 'KSR- barcodes are reserved for generated labels'
  }
  if (source === 'scanned' && isKsr) {
    return 'That looks like a Kasero-generated label, not a real product barcode. If you meant to find an existing product, use the search instead.'
  }
  if (source === 'generated' && !isKsr) {
    return 'Generated barcodes must use the KSR- namespace'
  }

  return null
}

/**
 * Compute the canonical 14-digit GTIN for a retail barcode. Returns null for
 * any format that isn't in the GTIN family (Code 128, Code 39, KSR-, etc.)
 * or for any value that isn't a valid check-digit-verified GTIN.
 *
 * GS1 defines GTIN-14 as the canonical form. EAN-13 / UPC-A / EAN-8 / UPC-E
 * are all losslessly promotable by left-padding with zeros. This is what
 * supplier, POS, and e-commerce integrations match on.
 *
 * UPC-E is not handled here — it should be expanded to UPC-A before this
 * function is called. That expansion is a separate, follow-up piece of work.
 */
export function computeCanonicalGtin(
  value: string | null | undefined,
  format: BarcodeFormat | null | undefined,
): string | null {
  if (!value || !format) return null

  // Only GTIN-family formats get a canonical GTIN. Everything else is null.
  const isGtinFamily =
    format === 'EAN_13' || format === 'UPC_A' || format === 'EAN_8'
  if (!isGtinFamily) return null

  const v = value.trim()
  if (!/^\d+$/.test(v)) return null
  if (!isValidGtin(v)) return null

  // Left-pad with zeros to 14 digits. EAN-13 → "0" + value, UPC-A → "00" +
  // value, EAN-8 → "000000" + value. All are losslessly reversible.
  return v.padStart(14, '0')
}

export function getBwipBcid(format: BarcodeFormat | null | undefined): string | null {
  if (!format) return 'code128'

  const bcidMap: Record<Exclude<BarcodeFormat, 'UPC_EAN_EXTENSION'>, string> = {
    CODABAR: 'rationalizedCodabar',
    CODE_39: 'code39',
    CODE_93: 'code93',
    CODE_128: 'code128',
    ITF: 'interleaved2of5',
    EAN_13: 'ean13',
    EAN_8: 'ean8',
    UPC_A: 'upca',
    UPC_E: 'upce',
  }

  if (format === 'UPC_EAN_EXTENSION') {
    return null
  }

  return bcidMap[format]
}
