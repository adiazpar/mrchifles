'use client'

import bwipjs from 'bwip-js/browser'
import { getBwipBcid } from '@kasero/shared/barcodes'
import type { BarcodeFormat } from '@kasero/shared/types'

interface BarcodeSvgResult {
  svg: string | null
  error: string | null
}

export function renderBarcodeSvg(
  value: string,
  format: BarcodeFormat | null,
  options?: {
    scale?: number
    height?: number
    includetext?: boolean
    paddingwidth?: number
    paddingheight?: number
  }
): BarcodeSvgResult {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return { svg: null, error: null }
  }

  const bcid = getBwipBcid(format)
  if (!bcid) {
    return {
      svg: null,
      error: 'This barcode type cannot be previewed yet.',
    }
  }

  try {
    const svg = bwipjs.toSVG({
      bcid,
      text: normalizedValue,
      scale: options?.scale ?? 2,
      height: options?.height ?? 12,
      includetext: options?.includetext ?? false,
      backgroundcolor: 'FFFFFF',
      paddingwidth: options?.paddingwidth ?? 8,
      paddingheight: options?.paddingheight ?? 8,
    })

    return { svg, error: null }
  } catch {
    return {
      svg: null,
      error: 'Unable to render this barcode with the current value and type.',
    }
  }
}

