import { NextResponse } from 'next/server'
import { db, products } from '@/db'
import { eq, ne, and, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { uploadProductIcon, validateIconSize, fileToBase64 } from '@/lib/storage'
import { withBusinessAuth, validationError, HttpResponse } from '@/lib/api-middleware'
import {
  computeCanonicalGtin,
  detectBarcodeFormat,
  normalizeBarcodeValue,
  validateBarcodeSourcePrefix,
} from '@/lib/barcodes'
import { Schemas } from '@/lib/schemas'

const createProductSchema = z.object({
  name: Schemas.name(),
  price: Schemas.amount(),
  categoryId: Schemas.id().optional(),
  active: Schemas.activeFlag(),
  barcode: z.string().optional(),
  barcodeSource: z.enum(['scanned', 'generated', 'manual']).optional(),
})

/**
 * GET /api/businesses/[businessId]/products
 *
 * List all products for the specified business. Accepts an optional
 * ?barcode=<value> query param for exact-match lookup.
 */
export const GET = withBusinessAuth(async (request, access) => {
  const url = new URL(request.url)
  // Normalize the lookup query the same way we normalize on write so case
  // and whitespace differences don't cause silent misses.
  const rawBarcodeParam = url.searchParams.get('barcode')
  const barcodeParam = rawBarcodeParam ? normalizeBarcodeValue(rawBarcodeParam) : null

  const conditions = [
    eq(products.businessId, access.businessId),
    ne(products.status, 'archived'),
  ]

  if (barcodeParam) {
    conditions.push(eq(products.barcode, barcodeParam))
  }

  const productsList = await db
    .select()
    .from(products)
    .where(and(...conditions))

  return NextResponse.json({
    success: true,
    products: productsList,
  })
})

/**
 * POST /api/businesses/[businessId]/products
 *
 * Create a new product. Accepts FormData with optional icon file.
 */
export const POST = withBusinessAuth(async (request, access) => {
  const formData = await request.formData()
  const name = formData.get('name') as string
  const price = formData.get('price') as string
  const categoryId = formData.get('categoryId') as string | null
  const active = formData.get('active') as string
  const iconFile = formData.get('icon') as File | null
  const presetIcon = formData.get('presetIcon') as string | null
  const barcodeValue = normalizeBarcodeValue(formData.get('barcode') as string | null)
  // Source is an enum (lowercase). Trim only — don't run through the
  // barcode-value normalizer or it would uppercase and fail enum validation.
  const barcodeSourceValue = (formData.get('barcodeSource') as string | null)?.trim() || ''

  const validation = createProductSchema.safeParse({
    name,
    price,
    categoryId: categoryId || undefined,
    active,
    barcode: barcodeValue || undefined,
    // Format is derived server-side from the value, so we don't accept it from
    // the client. The field is omitted from validation entirely.
    barcodeSource: barcodeSourceValue || undefined,
  })

  if (!validation.success) {
    return validationError(validation)
  }

  const {
    name: validName,
    price: validPrice,
    categoryId: validCategoryId,
    active: validActive,
    barcodeSource: validBarcodeSource,
  } = validation.data
  const status = validActive ? 'active' : 'inactive'

  // Derive format from value via the cascade. Format is never trusted from
  // the client. If the value is non-empty but the cascade can't classify it,
  // reject as a malformed barcode.
  const barcodeFormat = barcodeValue ? detectBarcodeFormat(barcodeValue) : null
  if (barcodeValue && !barcodeFormat) {
    return HttpResponse.badRequest('Unrecognized barcode value')
  }

  const barcodeSource = validBarcodeSource ?? null

  // The KSR- namespace and the source field must agree. See the helper for
  // the full matrix of allowed combinations.
  const sourcePrefixError = validateBarcodeSourcePrefix(barcodeValue, barcodeSource)
  if (sourcePrefixError) {
    return HttpResponse.badRequest(sourcePrefixError)
  }
  const barcodeGtin = computeCanonicalGtin(barcodeValue, barcodeFormat)

  if (!barcodeValue && barcodeSource) {
    return HttpResponse.badRequest('Barcode source requires a barcode value')
  }

  if (barcodeValue) {
    const duplicateBarcode = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.businessId, access.businessId),
          eq(products.barcode, barcodeValue),
          ne(products.status, 'archived')
        )
      )
      .get()

    if (duplicateBarcode) {
      return HttpResponse.badRequest('Another product already uses this barcode')
    }
  }

  const productId = nanoid()

  // Resolve icon: custom upload, preset emoji, or null
  let iconData: string | null = null
  if (iconFile && iconFile.size > 0) {
    try {
      const base64 = await fileToBase64(iconFile)
      const { valid } = validateIconSize(base64)
      if (!valid) {
        return HttpResponse.badRequest('Icon is too large. Maximum size is 100KB.')
      }
      iconData = await uploadProductIcon(iconFile, productId, base64)
    } catch (err) {
      console.error('Error processing icon:', err)
    }
  } else if (presetIcon) {
    iconData = presetIcon
  }

  // Check for an archived product with the same name (case-insensitive)
  const [archivedMatch] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.businessId, access.businessId),
        eq(products.status, 'archived'),
        sql`LOWER(TRIM(${products.name})) = LOWER(TRIM(${validName}))`
      )
    )
    .limit(1)

  if (archivedMatch) {
    // Reuse the archived product row
    await db
      .update(products)
      .set({
        name: validName,
        price: validPrice,
        categoryId: validCategoryId || null,
        icon: iconData ?? archivedMatch.icon,
        barcode: barcodeValue || null,
        barcodeFormat,
        barcodeSource,
        barcodeGtin,
        status,
      })
      .where(eq(products.id, archivedMatch.id))

    const [reusedProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, archivedMatch.id))
      .limit(1)

    return NextResponse.json({
      success: true,
      product: reusedProduct,
    })
  }

  const [newProduct] = await db.insert(products).values({
    id: productId,
    businessId: access.businessId,
    name: validName,
    price: validPrice,
    categoryId: validCategoryId || null,
    icon: iconData,
    barcode: barcodeValue || null,
    barcodeFormat,
    barcodeSource,
    barcodeGtin,
    status,
    stock: 0,
  }).returning()

  return NextResponse.json({
    success: true,
    product: newProduct,
  })
})
