import { NextRequest } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { verifyPassword, createToken, setAuthCookie } from '@/lib/simple-auth'
import { validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { checkRateLimit, getClientIp, RateLimits } from '@/lib/rate-limit'
import { setLocaleCookieServer } from '@/lib/locale-cookie'

const loginSchema = z.object({
  email: Schemas.email(),
  password: z.string().min(1),
})

/**
 * POST /api/auth/login
 *
 * Login with email and password
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const clientIp = getClientIp(request)
    const rateLimitResult = checkRateLimit(`login:${clientIp}`, RateLimits.login)
    if (!rateLimitResult.success) {
      const retryAfter = String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
      const response = errorResponse(ApiMessageCode.AUTH_LOGIN_RATE_LIMITED, 429)
      response.headers.set('Retry-After', retryAfter)
      return response
    }

    const body = await request.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return validationError(validation)
    }

    const { email, password } = validation.data

    // Find user by email (email is already normalized to lowercase by schema)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      return errorResponse(ApiMessageCode.AUTH_INVALID_CREDENTIALS, 401)
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      return errorResponse(ApiMessageCode.AUTH_INVALID_CREDENTIALS, 401)
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
    })

    // Set auth cookie
    await setAuthCookie(token)

    // Set UI language cookie from user preference
    await setLocaleCookieServer(user.language)

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = user

    return successResponse(
      { user: userWithoutPassword },
      ApiMessageCode.AUTH_LOGIN_SUCCESS
    )
  } catch (error) {
    console.error('Login error:', error)
    return errorResponse(ApiMessageCode.AUTH_LOGIN_FAILED, 500)
  }
}
