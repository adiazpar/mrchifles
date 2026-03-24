import { NextResponse } from 'next/server'
import { db, users, appConfig } from '@/db'
import { eq } from 'drizzle-orm'

/**
 * GET /api/setup-status
 *
 * Checks if initial setup (owner registration) is needed.
 */
export async function GET() {
  try {
    // Check if there's an owner in the system
    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'owner'))
      .limit(1)

    // Check app config if exists
    const [config] = await db
      .select()
      .from(appConfig)
      .limit(1)

    const ownerExists = !!owner
    const setupComplete = config?.setupComplete ?? ownerExists

    return NextResponse.json({
      setupComplete,
      ownerExists,
    })
  } catch (error) {
    console.error('Error checking setup status:', error)
    // In case of error, assume setup is complete to allow app to function
    return NextResponse.json({
      setupComplete: true,
      ownerExists: true,
      error: 'Could not verify setup status',
    })
  }
}
