import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { like } from 'drizzle-orm'
import { db } from '@/db'
import { users, account } from '@kasero/shared/db/schema'

/**
 * POST   /api/test/seed-user
 * DELETE /api/test/seed-user
 *
 * Test-only fixtures for E2E specs. Guarded behind
 *   - `ALLOW_TEST_ENDPOINTS=true`
 *   - `NODE_ENV !== 'production'`
 * Either gate failing turns the endpoint into a 404. The matching
 * test-only `/api/test/last-otp` route uses the same pair.
 *
 * POST creates a `users` row plus optional `account` rows describing
 * which sign-in providers the seeded user already has. DELETE wipes
 * every user whose email matches the `e2e-` prefix the helpers use,
 * for end-of-run cleanup.
 *
 * Intentionally lives OUTSIDE of `withAuth` — these endpoints predate
 * any session and the gating is on the env-var pair above. Nothing else
 * authenticates: anyone with HTTP reach to the API when the env vars are
 * set can call them. That's the entire point — test infra needs
 * unfettered seed access.
 */

const Body = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  providers: z.enum(['email', 'google', 'both']).optional(),
})

function isTestEndpointEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_TEST_ENDPOINTS === 'true'
  )
}

export async function POST(request: NextRequest) {
  if (!isTestEndpointEnabled()) {
    return new NextResponse(null, { status: 404 })
  }

  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid body', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const { email, name, providers = 'email' } = parsed.data
  const normalizedEmail = email.toLowerCase()
  const userId = nanoid()
  const now = new Date()

  await db.insert(users).values({
    id: userId,
    email: normalizedEmail,
    name: name ?? '',
    emailVerified: true,
    emailVerifiedAt: now,
    language: 'en-US',
    phoneNumberVerified: false,
    createdAt: now,
    updatedAt: now,
  })

  // Account rows are entirely optional — the email-OTP plugin auto-
  // materializes a credential row on first sign-in. Seeding google
  // ahead of time lets us test the OAuth-then-OTP merge path; seeding
  // both lets us test deletes / sign-outs that should sweep multiple
  // rows.
  if (providers === 'google' || providers === 'both') {
    await db.insert(account).values({
      id: nanoid(),
      accountId: `google-${nanoid()}`,
      providerId: 'google',
      userId,
      createdAt: now,
      updatedAt: now,
    })
  }
  if (providers === 'email' || providers === 'both') {
    await db.insert(account).values({
      id: nanoid(),
      accountId: normalizedEmail,
      providerId: 'credential',
      userId,
      createdAt: now,
      updatedAt: now,
    })
  }

  return NextResponse.json({ userId, email: normalizedEmail })
}

export async function DELETE() {
  if (!isTestEndpointEnabled()) {
    return new NextResponse(null, { status: 404 })
  }

  // Only sweep rows that look like E2E fixtures — anything starting with
  // `e2e-` per the helpers' convention. Account / session rows cascade
  // via FK on users.id.
  const deleted = await db
    .delete(users)
    .where(like(users.email, 'e2e-%@example.com'))
    .returning({ id: users.id })

  return NextResponse.json({ deleted: deleted.length })
}
