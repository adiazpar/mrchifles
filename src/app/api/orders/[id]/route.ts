import { NextRequest, NextResponse } from 'next/server'
import { db, orders, orderItems } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/simple-auth'

const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
})

/**
 * PATCH /api/orders/[id]
 *
 * Update an order and its items.
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

    const { id } = await params

    // Verify order exists and belongs to business
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.businessId, session.businessId)
        )
      )
      .limit(1)

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (existingOrder.status === 'received') {
      return NextResponse.json(
        { error: 'Cannot edit a received order' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const totalStr = formData.get('total') as string | null
    const notes = formData.get('notes') as string | null
    const estimatedArrivalStr = formData.get('estimatedArrival') as string | null
    const providerId = formData.get('providerId') as string | null
    const itemsJson = formData.get('items') as string | null
    const receiptFile = formData.get('receipt') as File | null

    const updateData: Record<string, unknown> = {}

    if (totalStr !== null) {
      const total = parseFloat(totalStr)
      if (isNaN(total) || total <= 0) {
        return NextResponse.json(
          { error: 'Total must be greater than 0' },
          { status: 400 }
        )
      }
      updateData.total = total
    }

    if (notes !== null) {
      updateData.notes = notes || null
    }

    if (estimatedArrivalStr !== null) {
      updateData.estimatedArrival = estimatedArrivalStr ? new Date(estimatedArrivalStr) : null
    }

    if (providerId !== null) {
      updateData.providerId = providerId || null
    }

    // TODO: Upload receipt to R2 if provided
    if (receiptFile && receiptFile.size > 0) {
      // Will implement R2 upload later
    }

    updateData.updatedAt = new Date()

    await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))

    // Update items if provided
    if (itemsJson) {
      let items: Array<{ productId: string; productName: string; quantity: number }>
      try {
        items = JSON.parse(itemsJson)
        const validation = z.array(orderItemSchema).safeParse(items)
        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid items' },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid items' },
          { status: 400 }
        )
      }

      // Delete existing items and insert new ones
      await db.delete(orderItems).where(eq(orderItems.orderId, id))

      const now = new Date()
      for (const item of items) {
        await db.insert(orderItems).values({
          id: nanoid(),
          orderId: id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          createdAt: now,
        })
      }
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/orders/[id]
 *
 * Delete an order and its items.
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

    const { id } = await params

    // Verify order exists and belongs to business
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.businessId, session.businessId)
        )
      )
      .limit(1)

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Delete order (cascade will delete items)
    await db.delete(orders).where(eq(orders.id, id))

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete order error:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}
