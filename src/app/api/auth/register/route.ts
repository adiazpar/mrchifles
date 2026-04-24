import { NextRequest } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { hashPassword, createToken, setAuthCookie } from '@/lib/simple-auth'
import { validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { checkRateLimit, getClientIp, RateLimits } from '@/lib/rate-limit'
import { setLocaleCookieServer } from '@/lib/locale-cookie'
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
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = getClientIp(request)
    const rateLimitResult = await checkRateLimit(`register:${clientIp}`, RateLimits.register)
    if (!rateLimitResult.success) {
      const retryAfter = String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
      const response = errorResponse(ApiMessageCode.AUTH_REGISTER_RATE_LIMITED, 429)
      response.headers.set('Retry-After', retryAfter)
      return response
    }

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

    // Persist the detected UI language in the cookie so next-intl loads the
    // matching bundle on the next RSC render.
    await setLocaleCookieServer(detectedLanguage)

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = newUser

    return successResponse(
      { user: userWithoutPassword },
      ApiMessageCode.AUTH_REGISTER_SUCCESS
    )
  } catch (error) {
    console.error('Registration error:', error)
    return errorResponse(ApiMessageCode.AUTH_REGISTER_FAILED, 500)
  }
}
