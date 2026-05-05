import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { validationError, errorResponse, successResponse, enforceMaxContentLength, withAuth } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { getBase64Size, MAX_UPLOAD_SIZE } from '@/lib/storage'
import { sniffImageMimeType } from '@/lib/file-sniff'
import { logServerError } from '@/lib/server-logger'

// 2 MB decoded cap (MAX_UPLOAD_SIZE) plus base64 overhead and JSON padding
// → 5 MB is a comfortable Content-Length ceiling.
const MAX_BODY_BYTES = 5 * 1024 * 1024

const DATA_URL_IMAGE_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/

const profileUpdateSchema = z.object({
  // Name is optional -- partial updates are allowed (e.g., avatar-only).
  name: Schemas.name(2).optional(),
  // Avatar accepts null (remove), undefined (unchanged), or a data URL.
  // Shape + size validation happens below after the schema parse.
  avatar: z.string().nullable().optional(),
})

/**
 * PATCH /api/auth/profile
 *
 * Update the current user's profile. Accepts partial updates: name,
 * avatar, or both. Avatar is a base64 data URL capped at the shared
 * MAX_UPLOAD_SIZE (2MB), matching the business logo upload limit.
 *
 * Wrapped in withAuth so the per-user-mutation and per-IP guardrails
 * fire automatically — without them, a stolen-cookie attacker could
 * spam unbounded 5MB avatar overwrites.
 */
// Avatar uploads can be up to 5 MB (MAX_BODY_BYTES); explicitly
// override the wrapper's default 256 KB cap.
export const PATCH = withAuth(async (request, session) => {
  try {
    const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
    if (oversize) return oversize

    const body = await request.json()
    const validation = profileUpdateSchema.safeParse(body)
    if (!validation.success) {
      return validationError(validation)
    }

    const { name, avatar } = validation.data

    // Avatar format + size check (only when the client is setting a value,
    // not when clearing to null or leaving unchanged).
    let normalizedAvatar = avatar
    if (typeof avatar === 'string' && avatar.length > 0) {
      if (!DATA_URL_IMAGE_REGEX.test(avatar)) {
        return errorResponse(ApiMessageCode.USER_AVATAR_INVALID, 400)
      }
      if (getBase64Size(avatar) > MAX_UPLOAD_SIZE) {
        return errorResponse(ApiMessageCode.USER_AVATAR_TOO_LARGE, 400)
      }
      // Content-sniff the decoded bytes. The MIME in the data URL
      // prefix is client-declared; without this check an attacker
      // could send `data:image/png;base64,<svg>` and slip non-raster
      // content past the regex. Re-encode using the sniffed type so
      // the stored data URL never disagrees with its payload.
      const base64Body = avatar.slice(avatar.indexOf(',') + 1)
      const bytes = Buffer.from(base64Body, 'base64')
      const sniffed = sniffImageMimeType(bytes)
      if (!sniffed) {
        return errorResponse(ApiMessageCode.USER_AVATAR_INVALID, 400)
      }
      normalizedAvatar = `data:${sniffed};base64,${base64Body}`
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (normalizedAvatar !== undefined) updates.avatar = normalizedAvatar

    if (Object.keys(updates).length === 0) {
      // Nothing to update; treat as a no-op success.
      const [current] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1)
      if (!current) {
        return errorResponse(ApiMessageCode.INTERNAL_ERROR, 500)
      }
      const { password: _, ...userWithoutPassword } = current
      return successResponse({ user: userWithoutPassword })
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, session.userId))
      .returning()

    if (!updated) {
      return errorResponse(ApiMessageCode.USER_PROFILE_UPDATE_FAILED, 500)
    }

    const { password: _, ...userWithoutPassword } = updated

    return successResponse(
      { user: userWithoutPassword },
      ApiMessageCode.USER_PROFILE_UPDATED
    )
  } catch (error) {
    logServerError('auth.profile', error)
    return errorResponse(ApiMessageCode.USER_PROFILE_UPDATE_FAILED, 500)
  }
}, { maxBodyBytes: MAX_BODY_BYTES })
