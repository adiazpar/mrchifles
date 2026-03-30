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
   * Password with minimum length requirement.
   */
  password: (minLength = 8) =>
    z.string().min(minLength, `Password must be at least ${minLength} characters`),

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
}
