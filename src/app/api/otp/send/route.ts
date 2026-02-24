import { NextResponse } from 'next/server'

/**
 * POST /api/otp/send
 *
 * DEPRECATED: OTP sending is now handled by Firebase on the client side.
 * This endpoint is kept for backwards compatibility but returns an error
 * directing users to use Firebase phone auth instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Este endpoint ya no esta disponible. Use Firebase Phone Auth en el cliente.',
      success: false,
    },
    { status: 410 } // Gone
  )
}
