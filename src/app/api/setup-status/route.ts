import { NextResponse } from 'next/server'
import PocketBase from 'pocketbase'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD

/**
 * GET /api/setup-status
 *
 * Checks if initial setup (owner registration) is needed.
 * This is a server-side route that authenticates as admin to query
 * PocketBase without client-side restrictions.
 */
export async function GET() {
  try {
    const pb = new PocketBase(POCKETBASE_URL)

    // Authenticate as admin to bypass collection rules
    if (PB_ADMIN_EMAIL && PB_ADMIN_PASSWORD) {
      await pb.collection('_superusers').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)
    }

    // Check if any user with role='owner' exists
    const owners = await pb.collection('users').getList(1, 1, {
      filter: 'role = "owner"',
    })

    const ownerExists = owners.totalItems > 0

    return NextResponse.json({
      setupComplete: ownerExists,
      ownerExists,
    })
  } catch (error) {
    console.error('Error checking setup status:', error)
    // On error, assume setup is complete to avoid blocking existing users
    return NextResponse.json({
      setupComplete: true,
      ownerExists: true,
      error: 'Could not verify setup status',
    })
  }
}
