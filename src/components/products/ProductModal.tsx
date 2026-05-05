import type { BarcodeFormat, BarcodeSource } from '@/types'

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
