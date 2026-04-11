import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/simple-auth'
import { errorResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'

/**
 * POST /api/auth/logout
 *
 * Clear the auth cookie
 */
export async function POST() {
  try {
    await clearAuthCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return errorResponse(ApiMessageCode.INTERNAL_ERROR, 500)
  }
}
