import { NextRequest, NextResponse } from 'next/server'
import { db, inviteCodes } from '@/db'
import { eq, and, gt } from 'drizzle-orm'
import { z } from 'zod'

const validateSchema = z.object({
  code: z.string().length(6, 'Code must be 6 characters').toUpperCase(),
})

/**
 * POST /api/invite/validate
 *
 * Validate an invite code without consuming it.
 * Returns the role if valid.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { valid: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { code } = validation.data

    // Find unused, non-expired invite code
    const now = new Date()
    const [invite] = await db
      .select()
      .from(inviteCodes)
      .where(
        and(
          eq(inviteCodes.code, code),
          eq(inviteCodes.used, false),
          gt(inviteCodes.expiresAt, now)
        )
      )
      .limit(1)

    if (!invite) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      role: invite.role,
    })
  } catch (error) {
    console.error('Invite validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate code' },
      { status: 500 }
    )
  }
}
