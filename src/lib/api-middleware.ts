/**
 * API route middleware utilities.
 *
 * Provides wrappers and helpers to reduce boilerplate in API routes,
 * plus the canonical response helpers that emit ApiMessageEnvelope
 * bodies for i18n-aware error and success messages.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireBusinessAccess, type BusinessAccess } from './business-auth'
import { ApiMessageCode, type ApiMessageEnvelope } from './api-messages'

// ============================================
// ROUTE PARAMETER TYPES
// ============================================

/**
 * Standard route params for business-scoped routes.
 */
export interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

/**
 * Route params for routes with an additional ID parameter.
 */
export interface RouteParamsWithId {
  params: Promise<{
    businessId: string
    id: string
  }>
}

// ============================================
// BUSINESS AUTH WRAPPER
// ============================================

type BusinessRouteHandler = (
  request: NextRequest,
  access: BusinessAccess,
  params: Record<string, string>
) => Promise<NextResponse>

/**
 * Wraps an API route handler with business authentication.
 *
 * Handles:
 * - Extracting and validating businessId from route params
 * - Calling requireBusinessAccess for authorization
 * - Standard error responses for Unauthorized/Not found/Server errors
 */
export function withBusinessAuth(handler: BusinessRouteHandler) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> }
  ) => {
    try {
      const resolvedParams = await params
      const { businessId, ...restParams } = resolvedParams
      const access = await requireBusinessAccess(businessId)
      return await handler(request, access, restParams)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return errorResponse(ApiMessageCode.FORBIDDEN, 403)
      }
      if (error instanceof Error && error.message.includes('Not found')) {
        return errorResponse(ApiMessageCode.NOT_FOUND, 404)
      }
      console.error('API Error:', error)
      return errorResponse(ApiMessageCode.INTERNAL_ERROR, 500)
    }
  }
}

// ============================================
// ENVELOPE RESPONSE HELPERS
// ============================================

/**
 * Build a structured error response body with a message code.
 *
 * @example
 *   return errorResponse(ApiMessageCode.PRODUCT_NOT_FOUND, 404)
 *   return errorResponse(ApiMessageCode.VALIDATION_STRING_TOO_SHORT, 400, { min: 2 })
 */
export function errorResponse(
  code: ApiMessageCode,
  status: number,
  vars?: Record<string, string | number>,
): NextResponse {
  const body: ApiMessageEnvelope = { messageCode: code }
  if (vars) body.messageVars = vars
  return NextResponse.json(body, { status })
}

/**
 * Build a structured success response that merges route data with an
 * optional message code for toast / feedback rendering on the client.
 *
 * @example
 *   return successResponse({ user }, ApiMessageCode.AUTH_LOGIN_SUCCESS)
 *   return successResponse({ products })  // no toast — just data
 */
export function successResponse(
  data: Record<string, unknown>,
  code?: ApiMessageCode,
  vars?: Record<string, string | number>,
): NextResponse {
  const body: Record<string, unknown> = { ...data }
  if (code) body.messageCode = code
  if (vars) body.messageVars = vars
  return NextResponse.json(body)
}

// ============================================
// ZOD ISSUE -> MESSAGE CODE MAPPING
// ============================================

/**
 * Map a Zod issue to an ApiMessageEnvelope. Called by validationError().
 * Returns null when the issue doesn't match a known pattern; the caller
 * falls back to VALIDATION_GENERIC.
 *
 * Handles the common Zod v4 issue codes: too_small / too_big (for strings
 * and numbers), invalid_format (email), invalid_type. Extend this function
 * as new Zod constraints are introduced.
 */
function mapZodIssueToEnvelope(issue: z.core.$ZodIssue): ApiMessageEnvelope | null {
  switch (issue.code) {
    case 'too_small': {
      const min = Number(issue.minimum ?? 0)
      if (issue.origin === 'string') {
        return {
          messageCode: ApiMessageCode.VALIDATION_STRING_TOO_SHORT,
          messageVars: { min },
        }
      }
      if (issue.origin === 'number') {
        return {
          messageCode: ApiMessageCode.VALIDATION_NUMBER_TOO_SMALL,
          messageVars: { min },
        }
      }
      return null
    }
    case 'too_big': {
      const max = Number(issue.maximum ?? 0)
      if (issue.origin === 'string') {
        return {
          messageCode: ApiMessageCode.VALIDATION_STRING_TOO_LONG,
          messageVars: { max },
        }
      }
      if (issue.origin === 'number') {
        return {
          messageCode: ApiMessageCode.VALIDATION_NUMBER_TOO_LARGE,
          messageVars: { max },
        }
      }
      return null
    }
    case 'invalid_format': {
      const format = issue.format
      if (format === 'email') {
        return { messageCode: ApiMessageCode.VALIDATION_INVALID_EMAIL }
      }
      return { messageCode: ApiMessageCode.VALIDATION_INVALID_FORMAT }
    }
    case 'invalid_type': {
      // Zod v4 reports missing required fields as invalid_type with received === 'undefined'
      if (issue.input === undefined) {
        return { messageCode: ApiMessageCode.VALIDATION_REQUIRED }
      }
      return { messageCode: ApiMessageCode.VALIDATION_INVALID_TYPE }
    }
    default:
      return null
  }
}

/**
 * Creates a validation error response from a Zod parse result.
 *
 * Emits the new ApiMessageEnvelope shape. The first issue is mapped to
 * a concrete code where possible; otherwise falls back to
 * VALIDATION_GENERIC.
 *
 * @example
 * ```typescript
 * const validation = schema.safeParse(body)
 * if (!validation.success) {
 *   return validationError(validation)
 * }
 * ```
 */
export function validationError(
  result: z.ZodSafeParseResult<unknown>
): NextResponse {
  if (result.success) {
    return errorResponse(ApiMessageCode.VALIDATION_GENERIC, 400)
  }
  const firstIssue = result.error.issues[0]
  const envelope = firstIssue ? mapZodIssueToEnvelope(firstIssue) : null
  if (envelope) {
    return NextResponse.json(envelope, { status: 400 })
  }
  return errorResponse(ApiMessageCode.VALIDATION_GENERIC, 400)
}

// ============================================
// LEGACY RESPONSE HELPERS (deprecated)
// ============================================

/**
 * Standard HTTP error responses.
 *
 * @deprecated Use errorResponse() with an ApiMessageCode instead. Kept
 * temporarily so not-yet-migrated routes keep compiling.
 */
export const HttpResponse = {
  badRequest: (message: string) =>
    NextResponse.json({ error: message }, { status: 400 }),

  unauthorized: (message = 'Authentication required') =>
    NextResponse.json({ error: message }, { status: 401 }),

  forbidden: (message = 'Permission denied') =>
    NextResponse.json({ error: message }, { status: 403 }),

  notFound: (message = 'Resource not found') =>
    NextResponse.json({ error: message }, { status: 404 }),

  serverError: (message = 'Internal server error') =>
    NextResponse.json({ error: message }, { status: 500 }),
}

// ============================================
// PAGINATION HELPERS
// ============================================

export interface PaginationParams {
  limit: number
  offset: number
}

/**
 * Extract pagination parameters from URL search params.
 */
export function getPaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 50,
  maxLimit = 500
): PaginationParams {
  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(defaultLimit)),
    maxLimit
  )
  const offset = parseInt(searchParams.get('offset') || '0')
  return { limit: isNaN(limit) ? defaultLimit : limit, offset: isNaN(offset) ? 0 : offset }
}
