import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { verification } from '@kasero/shared/db/schema'

/**
 * GET /api/test/last-otp?email=...&kind=otp
 *
 * Returns the most recently issued email-verification OTP for the
 * supplied email, decoded out of better-auth's `verification` table
 * storage format (`${otp}:${attempts}`). Used exclusively by E2E
 * tests that need to read an OTP they just triggered without going
 * through a real mailbox.
 *
 * Guarded by `ALLOW_TEST_ENDPOINTS=true` AND `NODE_ENV !== 'production'`.
 * Either gate failing turns the endpoint into a 404 — that's the strongest
 * possible "this never reaches production" signal short of build-time
 * exclusion, and it matches the gating pattern the rest of the test
 * surface uses.
 *
 * `kind` is currently always `'otp'` and is reserved for future
 * verification-row kinds (password reset is gone, so there's only one
 * shape today). Required so callers can self-document the request shape.
 */

function isTestEndpointEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_TEST_ENDPOINTS === 'true'
  )
}

function otpIdentifier(email: string): string {
  return `email-verification-otp-${email.toLowerCase()}`
}

export async function GET(request: NextRequest) {
  if (!isTestEndpointEnabled()) {
    return new NextResponse(null, { status: 404 })
  }

  const email = request.nextUrl.searchParams.get('email')
  const kind = request.nextUrl.searchParams.get('kind') ?? 'otp'

  if (!email) {
    return NextResponse.json(
      { error: 'email query param is required' },
      { status: 400 },
    )
  }

  if (kind !== 'otp') {
    return NextResponse.json(
      { error: `unknown kind: ${kind}` },
      { status: 400 },
    )
  }

  const rows = await db
    .select({
      value: verification.value,
      identifier: verification.identifier,
      expiresAt: verification.expiresAt,
    })
    .from(verification)
    .where(eq(verification.identifier, otpIdentifier(email)))
    .orderBy(desc(verification.createdAt))
    .limit(1)

  const row = rows[0]
  if (!row) {
    return NextResponse.json({ otp: null }, { status: 200 })
  }

  // Storage format: `${otp}:${attempts}`. Split on the last colon so
  // we don't trip over a hypothetical future attempt-count > 9.
  const lastColon = row.value.lastIndexOf(':')
  const otp = lastColon === -1 ? row.value : row.value.slice(0, lastColon)

  return NextResponse.json({ otp, expiresAt: row.expiresAt.toISOString() })
}
