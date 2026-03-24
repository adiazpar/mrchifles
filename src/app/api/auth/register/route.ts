import { NextRequest, NextResponse } from 'next/server'
import { db, users, businesses } from '@/db'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { hashPassword, createToken, setAuthCookie } from '@/lib/simple-auth'

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').optional(),
})

/**
 * POST /api/auth/register
 *
 * Register a new user (owner). Creates user and business.
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

    const { email, password, name, businessName } = validation.data

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

    const now = new Date()
    const userId = nanoid()
    const businessId = nanoid()

    // Create business first
    await db.insert(businesses).values({
      id: businessId,
      name: businessName || `Negocio de ${name}`,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    })

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email: email.toLowerCase(),
        password: passwordHash,
        name,
        role: 'owner',
        status: 'active',
        businessId,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

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
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
