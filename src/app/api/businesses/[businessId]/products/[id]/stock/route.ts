import { NextRequest, NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireBusinessAccess } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
    id: string
  }>
}

const stockSchema = z.object({
  stock: z.number().int().min(0, 'Stock must be 0 or greater'),
})

/**
 * PATCH /api/businesses/[businessId]/products/[id]/stock
 *
 * Adjust product stock.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId, id } = await params
    const access = await requireBusinessAccess(businessId)

    // Verify product exists and belongs to business
    const [existingProduct] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.businessId, access.businessId)
        )
      )
      .limit(1)

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = stockSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { stock } = validation.data

    await db
      .update(products)
      .set({
        stock,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))

    return NextResponse.json({
      success: true,
      stock,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Adjust stock error:', error)
    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    )
  }
}
