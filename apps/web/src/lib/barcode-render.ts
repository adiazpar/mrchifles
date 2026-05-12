'use client'

import bwipjs from 'bwip-js/browser'
import { getBwipBcid } from '@kasero/shared/barcodes'
import type { BarcodeFormat } from '@kasero/shared/types'

interface BarcodeSvgResult {
  svg: string | null
  error: string | null
}

// bwip-js v4 emits SVG with only a viewBox and no width/height attrs.
// Inline SVG without explicit width/height has no intrinsic size in
// WebKit/Blink when its container also has no fixed dimensions (e.g.
// the hidden 0x0 iframe used for the print path) — the result is a
// 0x0 render and a blank print preview. Inject explicit width/height
// derived from the viewBox so the SVG always has intrinsic dimensions.
function withExplicitDimensions(svg: string): string {
  if (/<svg[^>]*\swidth=/.test(svg) && /<svg[^>]*\sheight=/.test(svg)) {
    return svg
  }
  const viewBoxMatch = svg.match(
    /viewBox=["']?\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']?/,
  )
  if (!viewBoxMatch) return svg
  const [, width, height] = viewBoxMatch
  return svg.replace(/<svg\b/, `<svg width="${width}" height="${height}"`)
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

    return { svg: withExplicitDimensions(svg), error: null }
  } catch {
    return {
      svg: null,
      error: 'Unable to render this barcode with the current value and type.',
    }
  }
}

