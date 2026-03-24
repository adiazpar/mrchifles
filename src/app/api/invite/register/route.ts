import { NextRequest, NextResponse } from 'next/server'
import { db, users, inviteCodes } from '@/db'
import { eq, and, gt } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { hashPassword, createToken, setAuthCookie } from '@/lib/simple-auth'

const registerSchema = z.object({
  inviteCode: z.string().length(6, 'Code must be 6 characters').toUpperCase(),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

/**
 * POST /api/invite/register
 *
 * Register a new user using an invite code.
 * Consumes the invite code and creates the user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { inviteCode, email, password, name } = validation.data

    // Find unused, non-expired invite code
    const now = new Date()
    const [invite] = await db
      .select()
      .from(inviteCodes)
      .where(
        and(
          eq(inviteCodes.code, inviteCode),
          eq(inviteCodes.used, false),
          gt(inviteCodes.expiresAt, now)
        )
      )
      .limit(1)

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    const userId = nanoid()

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email: email.toLowerCase(),
        password: passwordHash,
        name,
        role: invite.role,
        status: 'active',
        businessId: invite.businessId,
        invitedBy: invite.createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    // Mark invite code as used
    await db
      .update(inviteCodes)
      .set({
        used: true,
        usedBy: userId,
        usedAt: now,
      })
      .where(eq(inviteCodes.id, invite.id))

    // Create JWT token
    const token = await createToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      businessId: newUser.businessId,
    })

    // Set auth cookie
    await setAuthCookie(token)

    // Return user (without password)
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Account created successfully',
    })
  } catch (error) {
    console.error('Invite registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
