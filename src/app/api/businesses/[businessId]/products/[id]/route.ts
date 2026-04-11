import { NextResponse } from 'next/server'
import { db, products, orderItems, orders } from '@/db'
import { eq, and, ne } from 'drizzle-orm'
import { uploadProductIcon, deleteProductIcon, validateIconSize, fileToBase64 } from '@/lib/storage'
import { withBusinessAuth, HttpResponse } from '@/lib/api-middleware'
import { canManageBusiness } from '@/lib/business-auth'
import {
  computeCanonicalGtin,
  detectBarcodeFormat,
  normalizeBarcodeValue,
  validateBarcodeSourcePrefix,
} from '@/lib/barcodes'
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
  // Source is an enum (lowercase). Trim only — don't run through the
  // barcode-value normalizer or it would uppercase and fail enum validation.
  const barcodeSourceValue = (formData.get('barcodeSource') as string | null)?.trim() || ''

  const updateData: Record<string, unknown> = {}

  if (name !== null) {
    const nameValidation = Schemas.name().safeParse(name)
    if (!nameValidation.success) {
      return HttpResponse.badRequest(nameValidation.error.issues[0]?.message || 'Invalid name')
    }
    updateData.name = nameValidation.data
  }

  if (price !== null) {
    const priceValidation = Schemas.amount().safeParse(price)
    if (!priceValidation.success) {
      return HttpResponse.badRequest(priceValidation.error.issues[0]?.message || 'Invalid price')
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
    updateData.active = active === 'true'
  }

  const hasBarcodeValue = formData.has('barcode')
  const hasBarcodeSource = formData.has('barcodeSource')

  // Format is no longer accepted from the client — it's derived from the
  // value via the cascade. Any `barcodeFormat` field in the request is
  // silently ignored.

  if (hasBarcodeSource) {
    if (barcodeSourceValue && !['scanned', 'generated', 'manual'].includes(barcodeSourceValue)) {
      return HttpResponse.badRequest('Unsupported barcode source')
    }
    updateData.barcodeSource = barcodeSourceValue || null
  }

  if (hasBarcodeValue) {
    // Derive format from the new value via the cascade. If the value is
    // non-empty but the cascade can't classify it, reject as malformed.
    const derivedFormat = barcodeValue ? detectBarcodeFormat(barcodeValue) : null
    if (barcodeValue && !derivedFormat) {
      return HttpResponse.badRequest('Unrecognized barcode value')
    }

    // The KSR- namespace and the source field must agree. We only run the
    // check when this request explicitly includes a barcodeSource — if the
    // source isn't being updated, we don't read the existing row from the
    // DB just to validate against it (defense in depth at this layer isn't
    // worth the extra query).
    if (hasBarcodeSource) {
      const source = (barcodeSourceValue || null) as
        | 'scanned'
        | 'generated'
        | 'manual'
        | null
      const sourcePrefixError = validateBarcodeSourcePrefix(barcodeValue, source)
      if (sourcePrefixError) {
        return HttpResponse.badRequest(sourcePrefixError)
      }
    }

    if (barcodeValue) {
      const duplicateBarcode = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.businessId, access.businessId),
            eq(products.barcode, barcodeValue),
            ne(products.id, id)
          )
        )
        .get()

      if (duplicateBarcode) {
        return HttpResponse.badRequest('Another product already uses this barcode')
      }
    }

    updateData.barcode = barcodeValue || null
    updateData.barcodeFormat = derivedFormat
    updateData.barcodeGtin = computeCanonicalGtin(barcodeValue || null, derivedFormat)

    // Clearing the barcode also clears source unless source was explicitly
    // included in the same request.
    if (!barcodeValue && !hasBarcodeSource) {
      updateData.barcodeSource = null
    }
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
      // uploadProductIcon deletes any existing file at this id before writing.
      updateData.icon = await uploadProductIcon(iconFile, id, base64ForValidation)
    } catch (err) {
      console.error('Error uploading icon:', err)
      return HttpResponse.serverError('Failed to upload icon')
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
 * Hard-delete a product. Blocked if the product is referenced in any
 * pending order — the user must receive or cancel that order first.
 * Received orders don't block deletion: stock was already adjusted, and
 * order_items.productName snapshots preserve historical display after
 * the FK is set to NULL via cascade.
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

  // Block delete if the product is referenced in any pending order
  const [blockingOrder] = await db
    .select({ id: orders.id })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orderItems.productId, id),
        eq(orders.status, 'pending'),
        eq(orders.businessId, access.businessId)
      )
    )
    .limit(1)

  if (blockingOrder) {
    return NextResponse.json(
      {
        error: 'This product is part of a pending order. Receive or cancel that order first.',
        blockingOrderId: blockingOrder.id,
      },
      { status: 409 }
    )
  }

  // Delete the icon file (if any) before removing the row
  await deleteProductIcon(existingProduct.icon, id)

  // Hard delete. order_items.productId has ON DELETE SET NULL and
  // preserves its productName snapshot for historical display.
  await db.delete(products).where(eq(products.id, id))

  return NextResponse.json({
    success: true,
  })
})
