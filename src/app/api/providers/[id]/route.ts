import { NextRequest, NextResponse } from 'next/server'
import { db, providers } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const updateProviderSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
})

/**
 * PATCH /api/providers/[id]
 *
 * Update a provider.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners and owners can update providers
    if (session.role === 'employee') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { id } = await params

    // Verify provider exists and belongs to business
    const [existingProvider] = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.id, id),
          eq(providers.businessId, session.businessId)
        )
      )
      .limit(1)

    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateProviderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name
    }
    if (validation.data.phone !== undefined) {
      updateData.phone = validation.data.phone
    }
    if (validation.data.email !== undefined) {
      updateData.email = validation.data.email
    }
    if (validation.data.notes !== undefined) {
      updateData.notes = validation.data.notes
    }
    if (validation.data.active !== undefined) {
      updateData.active = validation.data.active
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No data to update' },
        { status: 400 }
      )
    }

    updateData.updatedAt = new Date()

    await db
      .update(providers)
      .set(updateData)
      .where(eq(providers.id, id))

    const [updatedProvider] = await db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .limit(1)

    return NextResponse.json({
      success: true,
      provider: updatedProvider,
    })
  } catch (error) {
    console.error('Update provider error:', error)
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/providers/[id]
 *
 * Delete a provider.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser()
    if (!session || !session.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners and owners can delete providers
    if (session.role === 'employee') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { id } = await params

    // Verify provider exists and belongs to business
    const [existingProvider] = await db
      .select()
      .from(providers)
      .where(
        and(
          eq(providers.id, id),
          eq(providers.businessId, session.businessId)
        )
      )
      .limit(1)

    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    await db
      .delete(providers)
      .where(eq(providers.id, id))

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete provider error:', error)
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    )
  }
}
