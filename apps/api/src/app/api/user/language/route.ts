import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, users } from '@/db'
import { SUPPORTED_LOCALES } from '@kasero/shared/locales'
import { validationError, errorResponse, successResponse, withAuth, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { logServerError } from '@/lib/server-logger'

const bodySchema = z.object({
  language: z.enum(SUPPORTED_LOCALES),
})

// Body is `{ language: string }` — tiny. Cap covers JSON envelope.
const MAX_BODY_BYTES = 1024

/**
 * PATCH /api/user/language
 *
 * Update the current user's UI language preference. Persists to the users
 * table; the web client manages the active UI bundle via its own intl
 * provider after the response returns.
 *
 * Wrapped in withAuth for the default per-user + per-IP mutation caps.
 */
export const PATCH = withAuth(async (request, session) => {
  try {
    const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
    if (oversize) return oversize

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return validationError(validation)
    }

    const { language } = validation.data

    await db
      .update(users)
      .set({ language })
      .where(eq(users.id, session.userId))

    return successResponse({ language })
  } catch (error) {
    logServerError('user.language', error)
    return errorResponse(ApiMessageCode.USER_LANGUAGE_UPDATE_FAILED, 500)
  }
})
