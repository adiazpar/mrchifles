'use client'

import { useMemo } from 'react'
import { renderBarcodeSvg } from '@/lib/barcode-render'
import type { BarcodeFormat } from '@/types'

interface BarcodeDisplayProps {
  value: string
  format: BarcodeFormat | null
}

export function BarcodeDisplay({ value, format }: BarcodeDisplayProps) {
  const normalizedValue = value.trim()

  const result = useMemo(() => {
    return renderBarcodeSvg(normalizedValue, format)
  }, [format, normalizedValue])

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
      dangerouslySetInnerHTML={{ __html: result.svg || '' }}
    />
  )
}
