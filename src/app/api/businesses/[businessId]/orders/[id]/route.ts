import { NextResponse } from 'next/server'
import { db, orders, orderItems } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { withBusinessAuth, HttpResponse } from '@/lib/api-middleware'
import { canManageBusiness } from '@/lib/business-auth'
import { Schemas } from '@/lib/schemas'

const orderItemSchema = z.object({
  productId: Schemas.id(),
  productName: Schemas.name(),
  quantity: z.number().int().positive(),
})

/**
 * PATCH /api/businesses/[businessId]/orders/[id]
 *
 * Update an order and its items.
 */
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can modify orders
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden('Only partners and owners can modify orders')
  }

  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Order ID is required')
  }

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
    return HttpResponse.notFound('Order not found')
  }

  if (existingOrder.status === 'received') {
    return HttpResponse.badRequest('Cannot edit a received order')
  }

  const formData = await request.formData()
  const totalStr = formData.get('total') as string | null
  const notes = formData.get('notes') as string | null
  const estimatedArrivalStr = formData.get('estimatedArrival') as string | null
  const providerId = formData.get('providerId') as string | null
  const itemsJson = formData.get('items') as string | null

  const updateData: Record<string, unknown> = {}

  if (totalStr !== null) {
    const totalValidation = Schemas.positiveAmount().safeParse(totalStr)
    if (!totalValidation.success) {
      return HttpResponse.badRequest(totalValidation.error.issues[0]?.message || 'Invalid total')
    }
    updateData.total = totalValidation.data
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
        return HttpResponse.badRequest('Invalid items')
      }
    } catch {
      return HttpResponse.badRequest('Invalid items')
    }

    // Delete existing items and insert new ones
    await db.delete(orderItems).where(eq(orderItems.orderId, id))

    if (items.length > 0) {
      await db.insert(orderItems).values(
        items.map(item => ({
          id: nanoid(),
          orderId: id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
        }))
      )
    }
  }

  return NextResponse.json({
    success: true,
  })
})

/**
 * DELETE /api/businesses/[businessId]/orders/[id]
 *
 * Delete an order and its items.
 */
export const DELETE = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can delete orders
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden('Only partners and owners can delete orders')
  }

  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Order ID is required')
  }

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
    return HttpResponse.notFound('Order not found')
  }

  // Delete order (cascade will delete items)
  await db.delete(orders).where(eq(orders.id, id))

  return NextResponse.json({
    success: true,
  })
})
