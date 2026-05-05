'use client'

import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { renderBarcodeSvg } from '@/lib/barcode-render'
import type { BarcodeFormat } from '@/types'

interface BarcodeDisplayProps {
  value: string
  format: BarcodeFormat | null
}

// SVG-only DOMPurify profile. We only ever inject bwip-js SVG output;
// HTML elements have no business inside a barcode render and would
// be a tell that something is off.
const DOMPURIFY_OPTIONS = {
  USE_PROFILES: { svg: true, svgFilters: true },
} as const

export function BarcodeDisplay({ value, format }: BarcodeDisplayProps) {
  const normalizedValue = value.trim()

  const result = useMemo(() => {
    return renderBarcodeSvg(normalizedValue, format)
  }, [format, normalizedValue])

  // bwip-js renders the supplied value as a `<text>` label inside the
  // SVG. Format validation upstream restricts the allowed character
  // set per BCID, but a future BCID that accepts arbitrary text — or
  // a regression in bwip-js attribute escaping — would surface a
  // stored-XSS vector here. Run the SVG through DOMPurify with an
  // SVG-only profile before injection so any `<script>`, event
  // handler attribute, or `<foreignObject>` payload is stripped.
  const safeSvg = useMemo(() => {
    if (!result.svg) return ''
    // DOMPurify needs `window`; this component is `'use client'` so
    // it only ever renders in the browser. Server-side render won't
    // hit this path.
    return DOMPurify.sanitize(result.svg, DOMPURIFY_OPTIONS)
  }, [result.svg])

  if (!normalizedValue) {
    return (
      <div className="text-sm text-text-tertiary">
        Barcode visual appears here once you scan or generate a code.
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="text-sm text-text-tertiary max-w-sm">
        {result.error}
      </div>
    )
  }

  return (
    <div
      className="w-full flex justify-center items-center overflow-hidden [&_svg]:max-h-full [&_svg]:w-auto"
      dangerouslySetInnerHTML={{ __html: safeSvg }}
    />
  )
}
