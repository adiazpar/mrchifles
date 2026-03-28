import { NextRequest, NextResponse } from 'next/server'
import { db, orders, orderItems, providers, products } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { requireBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
  }>
}

const orderItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
})

/**
 * GET /api/businesses/[businessId]/orders
 *
 * List all orders for the business with their items.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    // Get all orders
    const ordersList = await db
      .select()
      .from(orders)
      .where(eq(orders.businessId, access.businessId))
      .orderBy(desc(orders.date))

    // Get all order items for these orders
    const orderIds = ordersList.map(o => o.id)

    let allItems: Array<{
      id: string
      orderId: string
      productId: string | null
      productName: string
      quantity: number
      unitCost: number | null
      subtotal: number | null
    }> = []

    if (orderIds.length > 0) {
      // Get all items for the business's orders
      const allItemsResult = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          productName: orderItems.productName,
          quantity: orderItems.quantity,
          unitCost: orderItems.unitCost,
          subtotal: orderItems.subtotal,
        })
        .from(orderItems)

      allItems = allItemsResult.filter(item => orderIds.includes(item.orderId))
    }

    // Get products for expanding items
    const productsList = await db
      .select()
      .from(products)
      .where(eq(products.businessId, access.businessId))

    const productsMap = new Map(productsList.map(p => [p.id, p]))

    // Get providers
    const providersList = await db
      .select()
      .from(providers)
      .where(eq(providers.businessId, access.businessId))

    const providersMap = new Map(providersList.map(p => [p.id, p]))

    // Build expanded orders
    const expandedOrders = ordersList.map(order => {
      const items = allItems.filter(item => item.orderId === order.id)
      return {
        ...order,
        providerId: order.providerId,
        expand: {
          provider: order.providerId ? providersMap.get(order.providerId) || null : null,
          'order_items(order)': items.map(item => ({
            ...item,
            expand: {
              product: item.productId ? productsMap.get(item.productId) || null : null,
            },
          })),
        },
      }
    })

    return NextResponse.json({
      success: true,
      orders: expandedOrders,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Get orders error:', error)
    return NextResponse.json(
      { error: 'Failed to get orders' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/businesses/[businessId]/orders
 *
 * Create a new order with items.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId } = await params
    const access = await requireBusinessAccess(businessId)

    const formData = await request.formData()
    const dateStr = formData.get('date') as string
    const totalStr = formData.get('total') as string
    const status = formData.get('status') as string
    const notes = formData.get('notes') as string | null
    const estimatedArrivalStr = formData.get('estimatedArrival') as string | null
    const providerId = formData.get('providerId') as string | null
    const itemsJson = formData.get('items') as string

    // Parse and validate items
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

    const total = parseFloat(totalStr)
    if (isNaN(total) || total <= 0) {
      return NextResponse.json(
        { error: 'Total must be greater than 0' },
        { status: 400 }
      )
    }

    const orderId = nanoid()
    const now = new Date()

    await db.insert(orders).values({
      id: orderId,
      businessId: access.businessId,
      providerId: providerId || null,
      date: new Date(dateStr),
      total,
      status: status === 'received' ? 'received' : 'pending',
      estimatedArrival: estimatedArrivalStr ? new Date(estimatedArrivalStr) : null,
      receipt: null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    })

    // Create order items
    for (const item of items) {
      await db.insert(orderItems).values({
        id: nanoid(),
        orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        createdAt: now,
      })
    }

    return NextResponse.json({
      success: true,
      orderId,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Create order error:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
