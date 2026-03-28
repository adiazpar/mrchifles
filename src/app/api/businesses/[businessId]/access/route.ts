import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/simple-auth'
import { validateBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

/**
 * GET /api/businesses/[businessId]/access
 *
 * Validate that the current user has access to the specified business.
 * Returns the user's role and business info.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params

    const access = await validateBusinessAccess(session.userId, businessId)

    if (!access) {
      return NextResponse.json(
        { error: 'You do not have access to this business' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      businessId: access.businessId,
      businessName: access.businessName,
      role: access.role,
    })
  } catch (error) {
    console.error('Business access validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate business access' },
      { status: 500 }
    )
  }
}
