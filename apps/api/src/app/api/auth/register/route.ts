import { NextRequest } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { hashPassword, createToken, setAuthCookie } from '@/lib/simple-auth'
import { logServerError } from '@/lib/server-logger'
import { validationError, errorResponse, successResponse, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { Schemas } from '@/lib/schemas'
import { getClientIp, RateLimits } from '@/lib/rate-limit'
import { pickLocaleFromAcceptLanguage } from '@/lib/accept-language'

const registerSchema = z.object({
  email: Schemas.email(),
  password: Schemas.password(),
  name: Schemas.name(2),
})

/**
 * POST /api/auth/register
 *
 * Register a new user account.
 * Creates user only - no business. User creates/joins business from hub.
 */
// 16 KB covers email + password + name + the JSON envelope; keeps
// parse cost trivial pre-rate-limit.
const MAX_BODY_BYTES = 16 * 1024

export async function POST(request: NextRequest) {
  try {
    const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
    if (oversize) return oversize
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return errorResponse(ApiMessageCode.VALIDATION_GENERIC, 400)
    }

    // Rate limit by IP. Fail-closed: if Upstash is unreachable on
    // this auth-critical limiter, the helper returns 503 instead of
    // silently dropping back to in-memory (which would let
    // registration spam through during a brownout).
    const clientIp = getClientIp(request)
    const limited = await applyRateLimit(
      `register:${clientIp}`,
      RateLimits.register,
      ApiMessageCode.AUTH_REGISTER_RATE_LIMITED,
    )
    if (limited) return limited

    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return validationError(validation)
    }

    const { email, password, name } = validation.data

    // Detect the user's preferred language from the Accept-Language header
    // so their first post-signup experience is in their browser language.
    // Falls back to DEFAULT_LOCALE when the header is missing or only names
    // unsupported languages. Users can still switch via the user menu.
    const detectedLanguage = pickLocaleFromAcceptLanguage(
      request.headers.get('accept-language')
    )

    // Check if email already exists (email is already normalized to lowercase by schema)
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .get()

    if (existingUser) {
      return errorResponse(ApiMessageCode.AUTH_EMAIL_TAKEN, 400)
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    const userId = nanoid()

    // Create user account (email is already normalized to lowercase by schema)
    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        password: passwordHash,
        name,
        language: detectedLanguage,
      })
      .returning()

    // Create JWT token
    const token = await createToken({
      userId: newUser.id,
      email: newUser.email,
    })

    // Set auth cookie
    await setAuthCookie(token)

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = newUser

    return successResponse(
      { user: userWithoutPassword },
      ApiMessageCode.AUTH_REGISTER_SUCCESS
    )
  } catch (error) {
    logServerError('auth.register', error)
    return errorResponse(ApiMessageCode.AUTH_REGISTER_FAILED, 500)
  }
}
