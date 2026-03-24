import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/simple-auth'

/**
 * POST /api/auth/logout
 *
 * Clear the auth cookie
 */
export async function POST() {
  try {
    await clearAuthCookie()

    return NextResponse.json({
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
