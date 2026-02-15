import { NextResponse } from 'next/server'
import PocketBase from 'pocketbase'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

/**
 * GET /api/setup-status
 *
 * Checks if initial setup (owner registration) is needed.
 * Uses the app_config collection which has public read access.
 */
export async function GET() {
  try {
    const pb = new PocketBase(POCKETBASE_URL)

    // app_config has public read access (listRule: "", viewRule: "")
    // The migration creates one record with setupComplete = false initially
    const configs = await pb.collection('app_config').getList(1, 1)

    if (configs.totalItems === 0) {
      // No config record = fresh install, needs setup
      return NextResponse.json({
        setupComplete: false,
        ownerExists: false,
      })
    }

    const config = configs.items[0]
    const setupComplete = config.setupComplete === true

    return NextResponse.json({
      setupComplete,
      ownerExists: setupComplete,
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
