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
}
