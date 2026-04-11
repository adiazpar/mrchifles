import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/simple-auth'
import { requireBusinessAccess, isOwner } from '@/lib/business-auth'
import type { RouteParams } from '@/lib/api-middleware'
import { db, businesses } from '@/db'
import { eq } from 'drizzle-orm'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params

    let access
    try {
      access = await requireBusinessAccess(businessId)
    } catch {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      )
    }

    if (!isOwner(access.role)) {
      return NextResponse.json(
        { error: 'Only the owner can delete a business' },
        { status: 403 }
      )
    }

    const existing = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .get()

    if (!existing) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    await db.delete(businesses).where(eq(businesses.id, businessId))

    return NextResponse.json({
      success: true,
      message: 'Business deleted successfully',
    })
  } catch (error) {
    console.error('Business deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete business' },
      { status: 500 }
    )
  }
}
