import type { BarcodeFormat, BarcodeSource } from '@kasero/shared/types'

// Shared types for product modals

export type IconType = 'preset' | 'custom' | null

export interface ProductFormData {
  name: string
  price: string
  categoryId: string
  active: boolean
  generatedIconBlob: Blob | null
  iconType: IconType
  presetEmoji: string | null
  barcode: string
  barcodeFormat: BarcodeFormat | null
  barcodeSource: BarcodeSource | null
  /** Starting stock — surfaced from CategoryStockStep on Add only.
   *  Edit path uses AdjustInventoryStep which calls a different
   *  endpoint (`/products/:id/stock`), so this field is ignored
   *  when editingProductId is non-null. */
  initialStock?: number
}

export interface StockAdjustmentData {
  productId: string
  newStockValue: number
  // The value the user observed when the modal opened. Sent to the
  // server as `expectedStock` for optimistic locking — if the row's
  // stock changed underneath, the server returns 409 instead of
  // silently overwriting another manager's edit.
  expectedStockValue: number
}
