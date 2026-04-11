import { NextRequest } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'
import { validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'
import { getBase64Size, MAX_ICON_SIZE } from '@/lib/storage'

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
 * avatar, or both. Avatar is a base64 data URL (same pattern as product
 * icons) capped at 100KB decoded size.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    const body = await request.json()
    const validation = profileUpdateSchema.safeParse(body)
    if (!validation.success) {
      return validationError(validation)
    }

    const { name, avatar } = validation.data

    // Avatar format + size check (only when the client is setting a value,
    // not when clearing to null or leaving unchanged).
    if (typeof avatar === 'string' && avatar.length > 0) {
      if (!DATA_URL_IMAGE_REGEX.test(avatar)) {
        return errorResponse(ApiMessageCode.USER_AVATAR_INVALID, 400)
      }
      if (getBase64Size(avatar) > MAX_ICON_SIZE) {
        return errorResponse(ApiMessageCode.USER_AVATAR_TOO_LARGE, 400)
      }
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (avatar !== undefined) updates.avatar = avatar

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
    console.error('Update profile error:', error)
    return errorResponse(ApiMessageCode.USER_PROFILE_UPDATE_FAILED, 500)
  }
}
