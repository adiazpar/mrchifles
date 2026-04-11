/**
 * API message codes.
 *
 * Shared between server (API routes, Zod error mapping) and client (the
 * useApiMessage hook). The server emits these codes in response bodies;
 * the client translates them to localized strings via the apiMessages
 * namespace in src/i18n/messages/*.json.
 *
 * Rules:
 * - Every code must have a corresponding key in en-US.json under
 *   apiMessages.<code_lowercase>. Typos surface as TypeScript errors
 *   because the i18n bundle is type-checked against this enum.
 * - Codes are UPPER_SNAKE and grouped by domain.
 * - Variable interpolation happens on the CLIENT via ICU. The server
 *   emits messageVars as a plain record; the client passes it to t().
 */

export const ApiMessageCode = {
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Validation (emitted by the Zod issue mapper)
  VALIDATION_GENERIC: 'VALIDATION_GENERIC',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_INVALID_TYPE: 'VALIDATION_INVALID_TYPE',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',
  VALIDATION_STRING_TOO_SHORT: 'VALIDATION_STRING_TOO_SHORT',
  VALIDATION_STRING_TOO_LONG: 'VALIDATION_STRING_TOO_LONG',
  VALIDATION_NUMBER_TOO_SMALL: 'VALIDATION_NUMBER_TOO_SMALL',
  VALIDATION_NUMBER_TOO_LARGE: 'VALIDATION_NUMBER_TOO_LARGE',

  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_TAKEN: 'AUTH_EMAIL_TAKEN',
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_REGISTER_SUCCESS: 'AUTH_REGISTER_SUCCESS',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_REGISTER_FAILED: 'AUTH_REGISTER_FAILED',
  AUTH_LOGIN_RATE_LIMITED: 'AUTH_LOGIN_RATE_LIMITED',
  AUTH_REGISTER_RATE_LIMITED: 'AUTH_REGISTER_RATE_LIMITED',
} as const

export type ApiMessageCode = (typeof ApiMessageCode)[keyof typeof ApiMessageCode]

/**
 * The response body shape for any API response that carries a user-facing
 * message. Error responses always include messageCode. Success responses
 * optionally include messageCode when the route wants to surface a toast
 * or confirmation on the client.
 */
export interface ApiMessageEnvelope {
  messageCode: ApiMessageCode
  messageVars?: Record<string, string | number>
}

/**
 * Type guard: is this response body a message envelope?
 */
export function hasMessageEnvelope(
  value: unknown,
): value is ApiMessageEnvelope {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { messageCode?: unknown }
  return typeof candidate.messageCode === 'string'
}
