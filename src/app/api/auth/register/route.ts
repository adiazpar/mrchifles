import { NextRequest, NextResponse } from 'next/server'
import { db, users } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { hashPassword, createToken, setAuthCookie } from '@/lib/simple-auth'
import { validationError } from '@/lib/api-middleware'
import { Schemas } from '@/lib/schemas'

const registerSchema = z.object({
  email: Schemas.email(),
  password: Schemas.password(),
  name: Schemas.name(2),
})

/**
 * POST /api/auth/register
 *
 * Register a new user account.
 * Creates user only - no business. User creates/joins business from hub.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return validationError(validation)
    }

    const { email, password, name } = validation.data

    // Check if email already exists (email is already normalized to lowercase by schema)
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .get()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    const now = new Date()
    const userId = nanoid()

    // Create user account (email is already normalized to lowercase by schema)
    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        password: passwordHash,
        name,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    // Create JWT token
    const token = await createToken({
      userId: newUser.id,
      email: newUser.email,
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
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
