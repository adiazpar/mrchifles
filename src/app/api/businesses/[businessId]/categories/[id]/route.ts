import { NextRequest, NextResponse } from 'next/server'
import { db, productCategories, products, productSettings } from '@/db'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireBusinessAccess, canManageBusiness } from '@/lib/business-auth'

interface RouteParams {
  params: Promise<{
    businessId: string
    id: string
  }>
}

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
})

/**
 * PATCH /api/businesses/[businessId]/categories/[id]
 *
 * Update a product category.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId, id } = await params
    const access = await requireBusinessAccess(businessId)

    // Only partners and owners can update categories
    if (!canManageBusiness(access.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Verify the category belongs to this business
    const [existingCategory] = await db
      .select()
      .from(productCategories)
      .where(and(
        eq(productCategories.id, id),
        eq(productCategories.businessId, access.businessId)
      ))
      .limit(1)

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = updateCategorySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name } = validation.data
    const now = new Date()

    await db
      .update(productCategories)
      .set({
        name: name.trim(),
        updatedAt: now,
      })
      .where(eq(productCategories.id, id))

    const [updatedCategory] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, id))
      .limit(1)

    return NextResponse.json({
      success: true,
      category: updatedCategory,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Update category error:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/businesses/[businessId]/categories/[id]
 *
 * Delete a product category.
 * Products with this category will have their categoryId set to null.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { businessId, id } = await params
    const access = await requireBusinessAccess(businessId)

    // Only partners and owners can delete categories
    if (!canManageBusiness(access.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Verify the category belongs to this business
    const [existingCategory] = await db
      .select()
      .from(productCategories)
      .where(and(
        eq(productCategories.id, id),
        eq(productCategories.businessId, access.businessId)
      ))
      .limit(1)

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Get count of products using this category for the response
    const productsWithCategory = await db
      .select()
      .from(products)
      .where(eq(products.categoryId, id))

    // Clear categoryId from products
    await db
      .update(products)
      .set({ categoryId: null, updatedAt: new Date() })
      .where(eq(products.categoryId, id))

    // Clear defaultCategoryId from product_settings if this was the default
    await db
      .update(productSettings)
      .set({ defaultCategoryId: null, updatedAt: new Date() })
      .where(eq(productSettings.defaultCategoryId, id))

    // Delete the category
    await db
      .delete(productCategories)
      .where(eq(productCategories.id, id))

    return NextResponse.json({
      success: true,
      affectedProducts: productsWithCategory.length,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
