import { db, products } from '@/db'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { uploadProductIcon, validateIconSize, fileToBase64 } from '@/lib/storage'
import { withBusinessAuth, validationError, errorResponse, successResponse, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
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
  ]

  if (barcodeParam) {
    conditions.push(eq(products.barcode, barcodeParam))
  }

  // Defensive cap — a small business never legitimately exposes 500+
  // products on one list call; pathological inserts (malicious or bugged)
  // can't drag the bandwidth / parse cost past this ceiling.
  const productsList = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .limit(500)

  return successResponse({ products: productsList })
})

/**
 * POST /api/businesses/[businessId]/products
 *
 * Create a new product. Accepts FormData with optional icon file.
 */
// Product icon is capped at MAX_ICON_SIZE (100 KB); 5 MB Content-Length is
// generous headroom for the multipart envelope plus the other fields.
const POST_MAX_BODY_BYTES = 5 * 1024 * 1024

export const POST = withBusinessAuth(async (request, access) => {
  const oversize = enforceMaxContentLength(request, POST_MAX_BODY_BYTES)
  if (oversize) return oversize

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

  // Derive format from value via the cascade. Format is never trusted from
  // the client. If the value is non-empty but the cascade can't classify it,
  // reject as a malformed barcode.
  const barcodeFormat = barcodeValue ? detectBarcodeFormat(barcodeValue) : null
  if (barcodeValue && !barcodeFormat) {
    return errorResponse(ApiMessageCode.BARCODE_UNRECOGNIZED, 400)
  }

  const barcodeSource = validBarcodeSource ?? null

  // The KSR- namespace and the source field must agree. See the helper for
  // the full matrix of allowed combinations.
  const sourcePrefixError = validateBarcodeSourcePrefix(barcodeValue, barcodeSource)
  if (sourcePrefixError) {
    return errorResponse(ApiMessageCode.BARCODE_SOURCE_INVALID, 400)
  }
  const barcodeGtin = computeCanonicalGtin(barcodeValue, barcodeFormat)

  if (!barcodeValue && barcodeSource) {
    return errorResponse(ApiMessageCode.BARCODE_SOURCE_REQUIRES_VALUE, 400)
  }

  if (barcodeValue) {
    const duplicateBarcode = await db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.businessId, access.businessId),
          eq(products.barcode, barcodeValue)
        )
      )
      .get()

    if (duplicateBarcode) {
      return errorResponse(ApiMessageCode.BARCODE_DUPLICATE, 400)
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
        return errorResponse(ApiMessageCode.PRODUCT_ICON_TOO_LARGE, 400)
      }
      iconData = await uploadProductIcon(iconFile, productId, base64)
    } catch (err) {
      console.error('Error uploading icon:', err)
      return errorResponse(ApiMessageCode.PRODUCT_ICON_UPLOAD_FAILED, 500)
    }
  } else if (presetIcon) {
    iconData = presetIcon
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
    active: validActive,
    stock: 0,
  }).returning()

  return successResponse({ product: newProduct })
})
