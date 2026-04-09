/**
 * Backfill the `products.barcode_gtin` column for every existing product.
 *
 * For any product whose barcode_format is in the GTIN family (EAN_13, UPC_A,
 * EAN_8), we compute the canonical 14-digit GTIN and write it. Products with
 * non-retail formats (CODE_128, KSR-, etc.) or missing/invalid values get a
 * null GTIN.
 *
 * Idempotent: safe to run multiple times. Running it on a database that's
 * already backfilled is a no-op per row.
 *
 * Usage:
 *   npx tsx scripts/backfill-barcode-gtin.ts             # dev database
 *   DRIZZLE_ENV=production npx tsx scripts/backfill-barcode-gtin.ts   # prod
 */

import { db, products } from '../src/db'
import { eq } from 'drizzle-orm'
import { computeCanonicalGtin } from '../src/lib/barcodes'

async function main() {
  const rows = await db
    .select({
      id: products.id,
      barcode: products.barcode,
      barcodeFormat: products.barcodeFormat,
      barcodeGtin: products.barcodeGtin,
    })
    .from(products)

  let updated = 0
  let skipped = 0
  let cleared = 0

  for (const row of rows) {
    const expected = computeCanonicalGtin(row.barcode, row.barcodeFormat)

    if (expected === row.barcodeGtin) {
      skipped++
      continue
    }

    await db
      .update(products)
      .set({ barcodeGtin: expected })
      .where(eq(products.id, row.id))

    if (expected) updated++
    else cleared++
  }

  console.log(`Backfill complete. Rows processed: ${rows.length}`)
  console.log(`  Updated with GTIN: ${updated}`)
  console.log(`  Cleared (invalid/non-retail): ${cleared}`)
  console.log(`  Already correct: ${skipped}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
