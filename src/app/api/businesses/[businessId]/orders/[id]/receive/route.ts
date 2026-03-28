import { NextRequest, NextResponse } from 'next/server'
import { db, orders, orderItems, products } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
    id: string
  }>
}

const receiveOrderSchema = z.object({
  receivedQuantities: z.record(z.number().int().min(0)),
})

/**
 * POST /api/businesses/[businessId]/orders/[id]/receive
 *
 * Receive an order and update product stock.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId, id } = await params
    const access = await requireBusinessAccess(businessId)

    // Verify order exists and belongs to business
    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.businessId, access.businessId)
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
        { error: 'Order has already been received' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validation = receiveOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { receivedQuantities } = validation.data

    // Get order items
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))

    const now = new Date()

    // Update product stock for each item
    for (const item of items) {
      const receivedQty = receivedQuantities[item.id] ?? item.quantity

      if (receivedQty > 0 && item.productId) {
        // Update product stock
        await db
          .update(products)
          .set({
            stock: sql`${products.stock} + ${receivedQty}`,
            updatedAt: now,
          })
          .where(eq(products.id, item.productId))
      }
    }

    // Update order status
    await db
      .update(orders)
      .set({
        status: 'received',
        receivedDate: now,
        updatedAt: now,
      })
      .where(eq(orders.id, id))

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Receive order error:', error)
    return NextResponse.json(
      { error: 'Failed to receive order' },
      { status: 500 }
    )
  }
}
