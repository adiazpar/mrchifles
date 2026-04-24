/**
 * Shared Zod schema builders for common validation patterns.
 *
 * Custom error messages intentionally omitted: the route-level
 * `validationError()` helper in api-middleware.ts maps Zod issue codes
 * to ApiMessageCode values, and the client translates them via the
 * `apiMessages` i18n namespace. Adding `.min(n, 'English string')` here
 * would be dead code that no one reads.
 */

import { z } from 'zod'

export const Schemas = {
  /**
   * Email field with lowercase normalization.
   */
  email: () => z.email().toLowerCase(),

  /**
   * Required name field with minimum and maximum length. The 80-char default
   * is a permissive safety net: plenty of room for real business/product
   * names while blocking pathological pasted values.
   */
  name: (minLength = 1, maxLength = 80) =>
    z.string().min(minLength).max(maxLength),

  /**
   * Required ID field.
   */
  id: () => z.string().min(1),

  /**
   * Boolean from string or boolean input (for FormData).
   * Defaults to true if not provided.
   */
  activeFlag: () =>
    z
      .preprocess((val) => val === 'true' || val === true, z.boolean())
      .default(true),

  /**
   * Optional phone number field.
   */
  phone: () => z.string().nullable().optional(),

  /**
   * Password with security requirements:
   * - Minimum 8 characters
   * - At least one uppercase letter
   * - At least one number
   */
  password: (minLength = 8) =>
    z
      .string()
      .min(minLength)
      .regex(/[A-Z]/)
      .regex(/[0-9]/),

  /**
   * Non-negative numeric amount (for prices, costs, etc).
   * Upper bound caps the field at ~1B in the smallest currency unit —
   * well above any legit single-item price, but low enough that a
   * client sending Number.MAX_SAFE_INTEGER gets rejected at the edge
   * instead of writing a nonsense value to the DB.
   */
  amount: () => z.coerce.number().min(0).max(1_000_000_000),

  /**
   * Positive numeric amount (must be > 0). Same upper bound as amount.
   */
  positiveAmount: () => z.coerce.number().positive().max(1_000_000_000),

  /**
   * Required code field (invite codes, transfer codes).
   */
  code: () => z.string().min(1).toUpperCase(),

  /**
   * Role field with allowed values.
   */
  role: () => z.enum(['owner', 'partner', 'employee']),

  /**
   * Business type field.
   */
  businessType: () => z.enum(['food', 'retail', 'services', 'wholesale', 'manufacturing', 'other']),

  /**
   * Locale code (e.g., 'en-US', 'es-MX').
   */
  locale: () => z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),

  /**
   * Currency code (ISO 4217, e.g., 'USD', 'MXN').
   */
  currency: () => z.string().length(3).toUpperCase(),

  /**
   * Business icon (emoji or base64 image data URL).
   *
   * Accepts either a short string (emoji / ZWJ sequence) or a data URL whose
   * MIME type is a supported image format and whose decoded payload is <= 2 MB.
   * Rejects anything else so a tampered client can't bloat the row.
   */
  businessIcon: () =>
    z
      .string()
      .nullable()
      .optional()
      .refine(
        (val) => {
          if (val == null || val === '') return true
          if (!val.startsWith('data:')) {
            // Emoji / short identifier — cap length as a safety net.
            return val.length <= 64
          }
          if (!DATA_URL_IMAGE_REGEX.test(val)) return false
          const base64 = val.slice(val.indexOf(',') + 1)
          const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
          const decodedBytes = Math.floor((base64.length * 3) / 4) - padding
          return decodedBytes <= MAX_BUSINESS_ICON_BYTES
        },
        // params.apiMessageCode is read by mapZodIssueToEnvelope() in
        // api-middleware.ts and mapped to a translated string on the client.
        { params: { apiMessageCode: 'BUSINESS_ICON_INVALID' } }
      ),
}

const MAX_BUSINESS_ICON_BYTES = 2 * 1024 * 1024
const DATA_URL_IMAGE_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/
