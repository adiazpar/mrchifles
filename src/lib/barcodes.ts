import { customAlphabet } from 'nanoid'
import type { BarcodeFormat } from '@/types'

export const BARCODE_FORMATS: BarcodeFormat[] = [
  'UPC_A',
  'UPC_E',
  'EAN_13',
  'EAN_8',
  'CODE_128',
  'CODE_39',
  'CODE_93',
  'CODABAR',
  'ITF',
  'UPC_EAN_EXTENSION',
]

const INTERNAL_BARCODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const generateInternalSuffix = customAlphabet(INTERNAL_BARCODE_ALPHABET, 10)

export function isBarcodeFormat(value: string): value is BarcodeFormat {
  return BARCODE_FORMATS.includes(value as BarcodeFormat)
}

export function getBarcodeFormatLabel(format: BarcodeFormat | null | undefined): string {
  if (!format) return 'Unknown format'

  const labels: Record<BarcodeFormat, string> = {
    CODABAR: 'Codabar',
    CODE_39: 'Code 39',
    CODE_93: 'Code 93',
    CODE_128: 'Code 128',
    ITF: 'ITF',
    EAN_13: 'EAN-13',
    EAN_8: 'EAN-8',
    UPC_A: 'UPC-A',
    UPC_E: 'UPC-E',
    UPC_EAN_EXTENSION: 'UPC/EAN Extension',
  }

  return labels[format]
}

export function normalizeBarcodeValue(value: string | null | undefined): string {
  return (value || '').trim()
}

export function generateInternalProductBarcode(): string {
  return `KSR-${generateInternalSuffix()}`
}

export function getBwipBcid(format: BarcodeFormat | null | undefined): string | null {
  if (!format) return 'code128'

  const bcidMap: Record<Exclude<BarcodeFormat, 'UPC_EAN_EXTENSION'>, string> = {
    CODABAR: 'rationalizedCodabar',
    CODE_39: 'code39',
    CODE_93: 'code93',
    CODE_128: 'code128',
    ITF: 'interleaved2of5',
    EAN_13: 'ean13',
    EAN_8: 'ean8',
    UPC_A: 'upca',
    UPC_E: 'upce',
  }

  if (format === 'UPC_EAN_EXTENSION') {
    return null
  }

  return bcidMap[format]
}
