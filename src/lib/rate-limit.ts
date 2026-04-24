/**
 * Rate limiter with two backends.
 *
 * - If `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set,
 *   every limit check goes through Upstash's sliding-window Redis
 *   limiter. This is the correct backend for a multi-Lambda deploy
 *   on Vercel — counters live in Redis, so a user's budget is shared
 *   across every Lambda that handles their traffic.
 *
 * - Otherwise (local dev, single-instance, or creds missing) it falls
 *   back to an in-memory Map. The fallback is per-process, so rate
 *   limits don't survive horizontal scaling — acceptable in dev, but
 *   NOT in prod without the Upstash creds.
 *
 * If Upstash itself is unreachable (network blip, outage) the call
 * fails OPEN: the request is allowed through, and a warning is
 * logged. Better than taking the app down over the rate limiter.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ============================================
// BACKEND SELECTION
// ============================================

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

// One Ratelimit instance per distinct (limit, window) pair — creating
// them is a no-op for Upstash once Redis is shared, but caching the
// instance keeps allocation off the hot path.
const upstashLimiters = new Map<string, Ratelimit>()
function getUpstashLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!redis) return null
  const key = `${config.limit}:${config.windowSeconds}`
  let limiter = upstashLimiters.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.limit,
        `${config.windowSeconds} s`,
      ),
      analytics: false,
      prefix: 'kasero',
    })
    upstashLimiters.set(key, limiter)
  }
  return limiter
}

// ============================================
// IN-MEMORY FALLBACK
// ============================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes (fallback only).
const CLEANUP_INTERVAL = 5 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

function checkInMemory(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const entry = store.get(identifier)

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs
    store.set(identifier, { count: 1, resetAt })
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt,
    }
  }

  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

// ============================================
// PUBLIC API
// ============================================

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
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(config)
  if (limiter) {
    try {
      const result = await limiter.limit(identifier)
      return {
        success: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      }
    } catch (error) {
      // Fail open on Upstash errors — better to let a request through
      // than to take the app down over the limiter. Bubble a warning so
      // the outage is visible in logs.
      console.warn('Upstash rate-limit call failed; falling back to memory:', error)
    }
  }
  return checkInMemory(identifier, config)
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
