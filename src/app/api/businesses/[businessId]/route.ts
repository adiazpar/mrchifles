import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/simple-auth'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'
import { withBusinessAuth, errorResponse, successResponse, type RouteParams } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { db, businesses } from '@/db'
import { eq } from 'drizzle-orm'

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
    return errorResponse(ApiMessageCode.BUSINESS_NOT_FOUND_DELETE, 404)
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
      return errorResponse(ApiMessageCode.BUSINESS_NOT_FOUND_DELETE, 404)
    }

    await db.delete(businesses).where(eq(businesses.id, businessId))

    return successResponse({}, ApiMessageCode.BUSINESS_DELETE_SUCCESS)
  } catch (error) {
    console.error('Business deletion error:', error)
    return errorResponse(ApiMessageCode.BUSINESS_DELETE_FAILED, 500)
  }
}
