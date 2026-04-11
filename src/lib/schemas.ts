/**
 * Shared Zod schema builders for common validation patterns.
 *
 * Use these to ensure consistent validation messages across API routes.
 */

import { z } from 'zod'

export const Schemas = {
  /**
   * Email field with lowercase normalization.
   */
  email: () => z.string().email('Invalid email').toLowerCase(),

  /**
   * Required name field with minimum length.
   */
  name: (minLength = 1) =>
    z.string().min(minLength, `Name must be at least ${minLength} character(s)`),

  /**
   * Required ID field.
   */
  id: () => z.string().min(1, 'ID is required'),

  /**
   * Nanoid format ID (21 characters).
   */
  nanoid: () => z.string().length(21, 'Invalid ID format'),

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
   * Optional notes/description field.
   */
  notes: () => z.string().nullable().optional(),

  /**
   * Password with security requirements:
   * - Minimum 8 characters
   * - At least one uppercase letter
   * - At least one number
   */
  password: (minLength = 8) =>
    z
      .string()
      .min(minLength, `Password must be at least ${minLength} characters`)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),

  /**
   * Non-negative numeric amount (for prices, costs, etc).
   */
  amount: () => z.coerce.number().min(0, 'Amount must be 0 or greater'),

  /**
   * Positive numeric amount (must be > 0).
   */
  positiveAmount: () => z.coerce.number().positive('Amount must be greater than 0'),

  /**
   * Required code field (invite codes, transfer codes).
   */
  code: () => z.string().min(1, 'Code is required').toUpperCase(),

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
  locale: () => z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, 'Invalid locale format'),

  /**
   * Currency code (ISO 4217, e.g., 'USD', 'MXN').
   */
  currency: () => z.string().length(3, 'Currency must be 3 characters').toUpperCase(),

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
        { message: 'Icon must be a PNG, JPEG, WebP, or GIF image under 2MB' }
      ),
}

const MAX_BUSINESS_ICON_BYTES = 2 * 1024 * 1024
const DATA_URL_IMAGE_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/
