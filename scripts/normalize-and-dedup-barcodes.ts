/**
 * Normalize barcode values across the products table and resolve duplicates.
 *
 * For every product:
 *   1. Normalize the barcode value (trim + collapse whitespace + uppercase).
 *   2. Re-derive the format via the detectBarcodeFormat cascade.
 *   3. Recompute the canonical GTIN.
 *   4. Update the row if any of those values changed.
 *
 * For every group of products in the same business with the same normalized
 * barcode:
 *   - Keep the row with the lexicographically smallest id.
 *   - Null out the barcode/format/source/gtin on the other rows so they no
 *     longer collide. The product rows themselves are NOT deleted — they
 *     stay active, just without a barcode. Owners can re-attach a unique
 *     barcode at their leisure.
 *   - Log every collision so the operator can review.
 *
 * Idempotent: safe to run multiple times. After the first run that does
 * anything, subsequent runs are no-ops.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/normalize-and-dedup-barcodes.ts
 *   DRIZZLE_ENV=production npx tsx --env-file=.env.local scripts/normalize-and-dedup-barcodes.ts
 *
 * Run BEFORE pushing the new schema with the unique index, so the index
 * creation doesn't fail on existing duplicates.
 */

import { db, products } from '../src/db'
import { eq } from 'drizzle-orm'
import {
  computeCanonicalGtin,
  detectBarcodeFormat,
  normalizeBarcodeValue,
} from '../src/lib/barcodes'

interface ProductRow {
  id: string
  businessId: string
  barcode: string | null
  barcodeFormat: string | null
  barcodeSource: string | null
  barcodeGtin: string | null
}

async function main() {
  const rows = (await db
    .select({
      id: products.id,
      businessId: products.businessId,
      barcode: products.barcode,
      barcodeFormat: products.barcodeFormat,
      barcodeSource: products.barcodeSource,
      barcodeGtin: products.barcodeGtin,
    })
    .from(products)) as ProductRow[]

  console.log(`Loaded ${rows.length} product rows`)

  // ---------------------------------------------------------------
  // Pass 1 — normalize values and re-derive format/GTIN
  // ---------------------------------------------------------------
  let normalizedCount = 0
  const normalized: ProductRow[] = []

  for (const row of rows) {
    const normValue = row.barcode ? normalizeBarcodeValue(row.barcode) : null
    const newFormat = normValue ? detectBarcodeFormat(normValue) : null
    const newGtin = computeCanonicalGtin(normValue, newFormat)

    const valueChanged = (normValue || null) !== (row.barcode || null)
    const formatChanged = (newFormat || null) !== (row.barcodeFormat || null)
    const gtinChanged = (newGtin || null) !== (row.barcodeGtin || null)

    if (valueChanged || formatChanged || gtinChanged) {
      await db
        .update(products)
        .set({
          barcode: normValue,
          barcodeFormat: newFormat,
          barcodeGtin: newGtin,
        })
        .where(eq(products.id, row.id))
      normalizedCount++
    }

    normalized.push({
      ...row,
      barcode: normValue,
      barcodeFormat: newFormat,
      barcodeGtin: newGtin,
    })
  }

  console.log(`Normalized ${normalizedCount} rows`)

  // ---------------------------------------------------------------
  // Pass 2 — detect and resolve duplicates within each business
  // ---------------------------------------------------------------
  const groups = new Map<string, ProductRow[]>()

  for (const row of normalized) {
    if (!row.barcode) continue

    const key = `${row.businessId}::${row.barcode}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  let duplicateGroups = 0
  let nulledRows = 0

  for (const [key, list] of groups) {
    if (list.length < 2) continue
    duplicateGroups++

    // Sort by id ascending — lexicographically smallest wins.
    list.sort((a, b) => a.id.localeCompare(b.id))
    const winner = list[0]
    const losers = list.slice(1)

    console.log(`Duplicate group: ${key}`)
    console.log(`  Winner (kept): ${winner.id}`)

    for (const loser of losers) {
      console.log(`  Loser (cleared): ${loser.id}`)
      await db
        .update(products)
        .set({
          barcode: null,
          barcodeFormat: null,
          barcodeSource: null,
          barcodeGtin: null,
        })
        .where(eq(products.id, loser.id))
      nulledRows++
    }
  }

  console.log('')
  console.log('Migration complete.')
  console.log(`  Rows processed:   ${rows.length}`)
  console.log(`  Rows normalized:  ${normalizedCount}`)
  console.log(`  Duplicate groups: ${duplicateGroups}`)
  console.log(`  Rows nulled out:  ${nulledRows}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
