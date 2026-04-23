import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/simple-auth'
import { requireBusinessAccess, isOwner, invalidateAccessCacheForBusiness } from '@/lib/business-auth'
import { withBusinessAuth, errorResponse, successResponse, validationError, enforceMaxContentLength, type RouteParams } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { db, businesses } from '@/db'
import { eq } from 'drizzle-orm'
import { getLocaleConfig } from '@/lib/locale-config'
import { patchSchema } from './schema'
import { MAX_UPLOAD_SIZE } from '@/lib/storage'

/**
 * GET /api/businesses/[businessId]
 * Returns the full business record for the current user's business.
 * Any member (owner/partner/employee) can read.
 */
export const GET = withBusinessAuth(async (_request, access) => {
  const [row] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, access.businessId))
    .limit(1)

  if (!row) {
    return errorResponse(ApiMessageCode.BUSINESS_NOT_FOUND, 404)
  }

  return successResponse({
    business: {
      id: row.id,
      name: row.name,
      type: row.type,
      icon: row.icon,
      locale: row.locale,
      currency: row.currency,
    },
  })
})

/**
 * PATCH /api/businesses/[businessId]
 * Update business details. Owner or partner only.
 * Accepts FormData with any subset of: name, type, locale, logo (File), removeLogo=true.
 * Currency is derived server-side from locale.
 */
// Business logo is capped at MAX_UPLOAD_SIZE (2 MB decoded); 5 MB Content-Length
// allows for multipart boundary, the logo, and the handful of metadata fields.
const PATCH_MAX_BODY_BYTES = 5 * 1024 * 1024

export const PATCH = withBusinessAuth(async (request, access) => {
  if (access.role !== 'owner' && access.role !== 'partner') {
    return errorResponse(ApiMessageCode.BUSINESS_UPDATE_FORBIDDEN, 403)
  }

  const oversize = enforceMaxContentLength(request, PATCH_MAX_BODY_BYTES)
  if (oversize) return oversize

  const formData = await request.formData()

  // Extract logo File separately (Zod can't validate File)
  const logoEntry = formData.get('logo')
  const logoFile = logoEntry instanceof File && logoEntry.size > 0 ? logoEntry : null

  // Build plain object for Zod validation
  const plain: Record<string, string> = {}
  for (const [k, v] of formData.entries()) {
    if (k === 'logo') continue
    if (typeof v === 'string') plain[k] = v
  }

  const validation = patchSchema.safeParse(plain)
  if (!validation.success) {
    return validationError(validation)
  }

  const { name, type, locale, removeLogo } = validation.data

  // Validate locale — getLocaleConfig returns undefined for unknown locales
  let currency: string | undefined
  if (locale !== undefined) {
    const localeConfig = getLocaleConfig(locale)
    if (!localeConfig) {
      return errorResponse(ApiMessageCode.BUSINESS_UPDATE_INVALID_LOCALE, 400)
    }
    currency = localeConfig.currency
  }

  // Validate logo file
  if (logoFile) {
    if (!logoFile.type.startsWith('image/')) {
      return errorResponse(ApiMessageCode.BUSINESS_UPDATE_LOGO_INVALID_TYPE, 400)
    }
    if (logoFile.size > MAX_UPLOAD_SIZE) {
      return errorResponse(ApiMessageCode.BUSINESS_UPDATE_LOGO_TOO_LARGE, 400)
    }
  }

  // Build update object
  const update: Partial<typeof businesses.$inferInsert> = {}
  if (name !== undefined) update.name = name
  if (type !== undefined) update.type = type as typeof update.type
  if (locale !== undefined) { update.locale = locale; update.currency = currency }
  if (removeLogo === 'true') update.icon = null
  if (logoFile) {
    const buffer = Buffer.from(await logoFile.arrayBuffer())
    update.icon = `data:${logoFile.type};base64,${buffer.toString('base64')}`
  }

  if (Object.keys(update).length === 0) {
    // Nothing to update — treat as success (idempotent)
    const [row] = await db.select().from(businesses).where(eq(businesses.id, access.businessId)).limit(1)
    if (!row) return errorResponse(ApiMessageCode.BUSINESS_NOT_FOUND, 404)
    return successResponse({
      business: {
        id: row.id, name: row.name, type: row.type, icon: row.icon,
        locale: row.locale, currency: row.currency,
      },
    }, ApiMessageCode.BUSINESS_UPDATE_SUCCESS)
  }

  try {
    await db.update(businesses).set(update).where(eq(businesses.id, access.businessId))
    invalidateAccessCacheForBusiness(access.businessId)
    const [row] = await db.select().from(businesses).where(eq(businesses.id, access.businessId)).limit(1)
    if (!row) return errorResponse(ApiMessageCode.BUSINESS_NOT_FOUND, 404)
    return successResponse({
      business: {
        id: row.id, name: row.name, type: row.type, icon: row.icon,
        locale: row.locale, currency: row.currency,
      },
    }, ApiMessageCode.BUSINESS_UPDATE_SUCCESS)
  } catch (err) {
    console.error('Business update error:', err)
    return errorResponse(ApiMessageCode.BUSINESS_UPDATE_FAILED, 500)
  }
})

/**
 * DELETE /api/businesses/[businessId]
 *
 * Delete a business. Cascades to related tables via foreign keys.
 * Only the owner can delete a business.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return errorResponse(ApiMessageCode.UNAUTHORIZED, 401)
    }

    const { businessId } = await params

    let access
    try {
      access = await requireBusinessAccess(businessId)
    } catch {
      return errorResponse(ApiMessageCode.FORBIDDEN, 403)
    }

    if (!isOwner(access.role)) {
      return errorResponse(ApiMessageCode.BUSINESS_ONLY_OWNER_CAN_DELETE, 403)
    }

    const existing = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .get()

    if (!existing) {
      return errorResponse(ApiMessageCode.BUSINESS_NOT_FOUND, 404)
    }

    await db.delete(businesses).where(eq(businesses.id, businessId))

    return successResponse({}, ApiMessageCode.BUSINESS_DELETE_SUCCESS)
  } catch (error) {
    console.error('Business deletion error:', error)
    return errorResponse(ApiMessageCode.BUSINESS_DELETE_FAILED, 500)
  }
}
