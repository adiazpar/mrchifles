/**
 * Simple in-memory rate limiter for single-instance deployments.
 *
 * For multi-instance deployments (e.g., serverless at scale),
 * consider using Upstash Redis with @upstash/ratelimit.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * Check if a request should be rate limited.
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const key = identifier

  const entry = store.get(key)

  // No existing entry or window expired - create new entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt,
    }
  }

  // Within window - check limit
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client IP from request headers.
 * Handles common proxy headers.
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback for development
  return '127.0.0.1'
}

// Preset configurations for common use cases
export const RateLimits = {
  /** Login attempts: 5 per 15 minutes */
  login: { limit: 5, windowSeconds: 15 * 60 },
  /** Registration: 3 per hour */
  register: { limit: 3, windowSeconds: 60 * 60 },
  /** Code validation (invite, transfer): 10 per 15 minutes */
  codeValidation: { limit: 10, windowSeconds: 15 * 60 },
  /**
   * AI endpoints (generate-icon, identify-product, remove-background):
   * 20 per minute per user. Shared budget across the three routes, so a
   * user can't spread-then-burst. Each call is billable to fal.ai/OpenAI,
   * so the limit is intentionally tight.
   */
  ai: { limit: 20, windowSeconds: 60 },
  /**
   * HEIC conversion: 30 per minute per user. Not billable externally, but
   * each call can buffer up to 30 MB into Lambda memory.
   */
  heic: { limit: 30, windowSeconds: 60 },
  /**
   * Ownership-transfer initiation: 5 per 15 minutes per user. Mitigates
   * account enumeration via the recipient-email lookup.
   */
  transferInitiate: { limit: 5, windowSeconds: 15 * 60 },
  /**
   * Business-scoped mutations (POST/PATCH/DELETE under
   * /api/businesses/[businessId]/**): 200 per minute per (user, business).
   * Generous for real workloads — bulk product onboarding from AI snap is
   * well under this — but tight enough to cap malicious delete loops.
   */
  businessMutation: { limit: 200, windowSeconds: 60 },
  /**
   * User-scoped mutations that aren't business-scoped (invite/join,
   * transfer/decline): 30 per minute per user. Legit paths are called
   * interactively and never in bulk.
   */
  userMutation: { limit: 30, windowSeconds: 60 },
} as const
