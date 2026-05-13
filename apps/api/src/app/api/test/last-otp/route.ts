import { NextResponse } from 'next/server'
import { _getTestOtp, _getTestResetToken } from '@/lib/email'

/**
 * Test-only endpoint to retrieve the most recent OTP or reset token
 * captured by the email module's in-memory store. Returns 404 unless
 * ALLOW_TEST_ENDPOINTS is set to "true" AND NODE_ENV != "production".
 * No body-level secrets are leaked beyond what the test framework
 * already requested by email.
 */
export async function GET(request: Request) {
  if (process.env.ALLOW_TEST_ENDPOINTS !== 'true' || process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled' }, { status: 404 })
  }
  const url = new URL(request.url)
  const email = url.searchParams.get('email')
  const kind = url.searchParams.get('kind') ?? 'otp'
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }
  if (kind === 'reset') {
    const token = _getTestResetToken(email)
    if (!token) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ token })
  }
  const otp = _getTestOtp(email)
  if (!otp) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ otp })
}
