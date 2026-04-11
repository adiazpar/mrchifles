import { NextResponse } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/simple-auth'

/**
 * GET /api/auth/me
 *
 * Get the current authenticated user
 */
export async function GET() {
  try {
    const session = await getCurrentUser()

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Get fresh user data from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { user: null, error: 'Failed to get user' },
      { status: 500 }
    )
  }
}
