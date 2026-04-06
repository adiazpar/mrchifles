import { NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq, and, ne } from 'drizzle-orm'
import { uploadProductIcon, deleteProductIcon, validateIconSize, fileToBase64 } from '@/lib/storage'
import { withBusinessAuth, HttpResponse } from '@/lib/api-middleware'
import { canManageBusiness } from '@/lib/business-auth'
import { isBarcodeFormat, normalizeBarcodeValue } from '@/lib/barcodes'
import { Schemas } from '@/lib/schemas'

/**
 * PATCH /api/businesses/[businessId]/products/[id]
 *
 * Update a product. Accepts FormData with optional icon file.
 */
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can modify products
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden('Only partners and owners can modify products')
  }

  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Product ID is required')
  }

  const formData = await request.formData()
  const name = formData.get('name') as string | null
  const price = formData.get('price') as string | null
  const categoryId = formData.get('categoryId') as string | null
  const active = formData.get('active') as string | null
  const iconFile = formData.get('icon') as File | null
  const presetIcon = formData.get('presetIcon') as string | null
  const clearIconFlag = formData.get('clearIcon') as string | null
  const barcodeValue = normalizeBarcodeValue(formData.get('barcode') as string | null)
  const barcodeFormatValue = normalizeBarcodeValue(formData.get('barcodeFormat') as string | null)
  const barcodeSourceValue = normalizeBarcodeValue(formData.get('barcodeSource') as string | null)

  const updateData: Record<string, unknown> = {}

  if (name !== null) {
    const nameValidation = Schemas.name().safeParse(name)
    if (!nameValidation.success) {
      return HttpResponse.badRequest(nameValidation.error.errors[0]?.message || 'Invalid name')
    }
    updateData.name = nameValidation.data
  }

  if (price !== null) {
    const priceValidation = Schemas.amount().safeParse(price)
    if (!priceValidation.success) {
      return HttpResponse.badRequest(priceValidation.error.errors[0]?.message || 'Invalid price')
    }
    updateData.price = priceValidation.data
  }

  if (categoryId !== null) {
    if (categoryId === '') {
      updateData.categoryId = null
    } else {
      updateData.categoryId = categoryId
    }
  }

  if (active !== null) {
    updateData.status = active === 'true' ? 'active' : 'inactive'
  }

  const hasBarcodeValue = formData.has('barcode')
  const hasBarcodeFormat = formData.has('barcodeFormat')
  const hasBarcodeSource = formData.has('barcodeSource')

  if (hasBarcodeFormat) {
    if (barcodeFormatValue && !isBarcodeFormat(barcodeFormatValue)) {
      return HttpResponse.badRequest('Unsupported barcode format')
    }
    updateData.barcodeFormat = barcodeFormatValue || null
  }

  if (hasBarcodeSource) {
    if (barcodeSourceValue && !['scanned', 'generated', 'manual'].includes(barcodeSourceValue)) {
      return HttpResponse.badRequest('Unsupported barcode source')
    }
    updateData.barcodeSource = barcodeSourceValue || null
  }

  if (hasBarcodeValue) {
    if (barcodeValue) {
      const duplicateBarcode = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.businessId, access.businessId),
            eq(products.barcode, barcodeValue),
            ne(products.id, id),
            ne(products.status, 'archived')
          )
        )
        .get()

      if (duplicateBarcode) {
        return HttpResponse.badRequest('Another product already uses this barcode')
      }
    }

    updateData.barcode = barcodeValue || null

    if (!barcodeValue && !hasBarcodeFormat) {
      updateData.barcodeFormat = null
    }
    if (!barcodeValue && !hasBarcodeSource) {
      updateData.barcodeSource = null
    }
  }

  if (hasBarcodeValue && !barcodeValue && barcodeFormatValue) {
    return HttpResponse.badRequest('Barcode format requires a barcode value')
  }
  if (hasBarcodeValue && !barcodeValue && barcodeSourceValue) {
    return HttpResponse.badRequest('Barcode source requires a barcode value')
  }

  // Handle icon changes
  if (iconFile && iconFile.size > 0) {
    // Custom icon upload (AI-generated or user-uploaded)
    try {
      const base64ForValidation = await fileToBase64(iconFile)
      const { valid } = validateIconSize(base64ForValidation)
      if (!valid) {
        return HttpResponse.badRequest('Icon is too large. Maximum size is 100KB.')
      }
      await deleteProductIcon(null, id)
      updateData.icon = await uploadProductIcon(iconFile, id)
    } catch (err) {
      console.error('Error uploading icon:', err)
    }
  } else if (presetIcon) {
    // Preset emoji icon - store the emoji string directly
    await deleteProductIcon(null, id)
    updateData.icon = presetIcon
  } else if (clearIconFlag === 'true') {
    // Icon was cleared
    await deleteProductIcon(null, id)
    updateData.icon = null
  }

  if (Object.keys(updateData).length === 0) {
    return HttpResponse.badRequest('No data to update')
  }

  updateData.updatedAt = new Date()

  // Update with ownership check in WHERE (no separate verify query needed)
  await db
    .update(products)
    .set(updateData)
    .where(and(eq(products.id, id), eq(products.businessId, access.businessId)))

  // Re-fetch full product for consistent response
  const [updatedProduct] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!updatedProduct) {
    return HttpResponse.notFound('Product not found')
  }

  return NextResponse.json({
    success: true,
    product: updatedProduct,
  })
})

/**
 * DELETE /api/businesses/[businessId]/products/[id]
 *
 * Delete a product.
 */
export const DELETE = withBusinessAuth(async (request, access, routeParams) => {
  // Only partners and owners can delete products
  if (!canManageBusiness(access.role)) {
    return HttpResponse.forbidden('Only partners and owners can delete products')
  }

  const id = routeParams?.id
  if (!id) {
    return HttpResponse.badRequest('Product ID is required')
  }

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
    return HttpResponse.notFound('Product not found')
  }

  // Archive instead of hard delete — preserves icon for reuse if product is re-added
  await db
    .update(products)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))

  return NextResponse.json({
    success: true,
  })
})
