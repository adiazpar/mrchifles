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
import { getCurrentUser, type JWTPayload } from './simple-auth'
import { checkRateLimit, RateLimits, type RateLimitConfig } from './rate-limit'

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

// ============================================
// USER AUTH WRAPPER
// ============================================

type UserRouteHandler = (
  request: NextRequest,
  user: JWTPayload,
) => Promise<NextResponse>

/**
 * Wraps a route handler with user-level authentication (no business scope).
 *
 * Use for routes that need a logged-in user but aren't tied to a specific
 * business — e.g. AI / HEIC pipelines, account-level operations that don't
 * fit under `/businesses/[businessId]/*`.
 *
 * On failure returns UNAUTHORIZED 401. Rare framework errors return
 * INTERNAL_ERROR 500.
 */
export function withAuth(handler: UserRouteHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser()
      if (!user) return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
      return await handler(request, user)
    } catch (error) {
      console.error('API Error:', error)
      return errorResponse(ApiMessageCode.INTERNAL_ERROR, 500)
    }
  }
}

// ============================================
// RATE LIMITING HELPER
// ============================================

/**
 * Apply a rate limit check to a request. Returns a 429 NextResponse if the
 * caller is over their budget, or `null` if the request may proceed.
 *
 * The `Retry-After` header is populated so well-behaved clients back off
 * at the correct interval.
 *
 * Async because `checkRateLimit` may call Upstash over the network when
 * Redis credentials are configured. In-memory fallback resolves
 * synchronously; the await is effectively a no-op in that case.
 *
 * @example
 *   const rl = await applyRateLimit(`ai:${user.userId}`, RateLimits.ai)
 *   if (rl) return rl
 */
export async function applyRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(identifier, config)
  if (result.success) return null
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  const response = errorResponse(ApiMessageCode.RATE_LIMITED, 429)
  response.headers.set('Retry-After', String(retryAfter))
  return response
}

// ============================================
// BODY SIZE GUARD
// ============================================

/**
 * Reject the request before reading the body if the declared
 * Content-Length exceeds `maxBytes`. Returns a 413 NextResponse to send,
 * or `null` if the request is within the limit.
 *
 * This runs BEFORE `request.formData()` / `request.arrayBuffer()` /
 * `request.json()` so the Lambda never buffers an oversized body into
 * memory. A missing Content-Length is rejected with 411 — we require a
 * declared length to be able to cap it up front.
 *
 * @example
 *   const oversize = enforceMaxContentLength(request, 5 * 1024 * 1024)
 *   if (oversize) return oversize
 */
export function enforceMaxContentLength(
  request: NextRequest,
  maxBytes: number,
): NextResponse | null {
  const header = request.headers.get('content-length')
  if (header === null) {
    return errorResponse(ApiMessageCode.REQUEST_LENGTH_REQUIRED, 411)
  }
  const length = Number(header)
  if (!Number.isFinite(length) || length < 0) {
    return errorResponse(ApiMessageCode.REQUEST_LENGTH_REQUIRED, 411)
  }
  if (length > maxBytes) {
    return errorResponse(ApiMessageCode.REQUEST_TOO_LARGE, 413)
  }
  return null
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

      // Rate-limit writes per (user, business). Reads are unbounded so
      // legit polling / navigation never hits 429, but POST/PATCH/DELETE
      // caps out at RateLimits.businessMutation. Keyed per-business so a
      // partner in two businesses doesn't contend with themselves.
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const rateLimited = await applyRateLimit(
          `mutate:${access.userId}:${access.businessId}`,
          RateLimits.businessMutation,
        )
        if (rateLimited) return rateLimited
      }

      return await handler(request, access, restParams)
    } catch (error) {
      if (error instanceof Error) {
        // Split 401 "not authenticated" from 403 "no membership" so
        // clients can distinguish re-login-required from permission-
        // denied. requireBusinessAccess throws distinct messages.
        if (error.message.includes('Not authenticated')) {
          return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
        }
        if (error.message.includes('No access')) {
          return errorResponse(ApiMessageCode.FORBIDDEN, 403)
        }
        if (error.message.includes('Not found')) {
          return errorResponse(ApiMessageCode.NOT_FOUND, 404)
        }
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
 * Includes `success: true` so legacy consumers that check `data.success`
 * continue to work during the migration. Remove when all consumers have
 * switched to `response.ok` checks.
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
  const body: Record<string, unknown> = { success: true, ...data }
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
 * and numbers), invalid_format (email), invalid_type. Also handles custom
 * refine() issues that attach a `params.apiMessageCode` -- any refine can
 * emit any ApiMessageCode by adding `params: { apiMessageCode: '...' }`
 * as the second argument. Extend this function as new Zod constraints
 * are introduced.
 */
function mapZodIssueToEnvelope(issue: z.core.$ZodIssue): ApiMessageEnvelope | null {
  // Custom refine() calls can pass through an explicit code via the
  // `params` field. This is how refine errors map to the i18n layer.
  if (issue.code === 'custom') {
    const params = (issue as z.core.$ZodIssue & { params?: unknown }).params
    if (
      params &&
      typeof params === 'object' &&
      'apiMessageCode' in params &&
      typeof (params as { apiMessageCode: unknown }).apiMessageCode === 'string'
    ) {
      const code = (params as { apiMessageCode: string }).apiMessageCode
      // We trust the refine author to use a real ApiMessageCode value.
      // The i18n typecheck will catch unknown keys at render time.
      return { messageCode: code as ApiMessageCode }
    }
    return null
  }

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

