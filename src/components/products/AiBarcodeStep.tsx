'use client'

import { useCallback } from 'react'
import { Plus, ScanBarcode } from 'lucide-react'
import { useProductForm } from '@/contexts/product-form-context'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { generateInternalProductBarcode, getBarcodeFormatLabel } from '@/lib/barcodes'
import { BarcodeDisplay } from './BarcodeDisplay'
import type { BarcodeSource } from '@/types'

function getBarcodeSourceLabel(source: BarcodeSource | null): string {
  switch (source) {
    case 'scanned':
      return 'Scanned'
    case 'generated':
      return 'Generated'
    case 'manual':
      return 'Manual'
    default:
      return 'N/A'
  }
}

/**
 * Minimal barcode capture for the AI flow. Renders the barcode preview,
 * metadata, and the two capture actions (Scan / Generate). No manual entry,
 * no format selector, no print button — those live in the full edit form.
 *
 * Footer (Skip / Continue) is provided by the parent Modal.Step.
 */
export function AiBarcodeStepBody() {
  const {
    barcode,
    barcodeFormat,
    barcodeSource,
    setBarcode,
    setBarcodeFormat,
    setBarcodeSource,
    setError,
  } = useProductForm()

  const { open: openScanner, busy: scanBusy, hiddenInput: scanHiddenInput } = useBarcodeScan({
    onResult: ({ value, format }) => {
      setBarcode(value)
      setBarcodeFormat(format)
      setBarcodeSource('scanned')
    },
    onError: (message) => {
      setError(message)
    },
  })

  const handleScanClick = useCallback(() => {
    setError('')
    openScanner()
  }, [openScanner, setError])

  const handleGenerate = useCallback(() => {
    setBarcode(generateInternalProductBarcode())
    setBarcodeFormat('CODE_128')
    setBarcodeSource('generated')
  }, [setBarcode, setBarcodeFormat, setBarcodeSource])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        Scan the product&apos;s existing barcode, generate a new one to print
        and stick on your items, or skip if this product has no barcode.
      </p>

      <div className="rounded-xl border border-border bg-bg-muted p-4 min-h-36 flex items-center justify-center text-center">
        <BarcodeDisplay value={barcode} format={barcodeFormat} />
      </div>

      <div className="text-center">
        {barcode ? (
          <>
            <div className="text-sm break-all text-text-secondary">
              {`${barcode} · ${barcodeFormat ? getBarcodeFormatLabel(barcodeFormat) : 'N/A'}`}
            </div>
            <div className="text-sm text-text-tertiary mt-1">
              {getBarcodeSourceLabel(barcodeSource)}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-text-tertiary">No barcode attached</div>
            <div className="text-sm text-text-tertiary mt-1">N/A</div>
          </>
        )}
      </div>

      {scanHiddenInput}

      <div className="caja-actions">
        <button
          type="button"
          onClick={handleScanClick}
          disabled={scanBusy}
          className="caja-action-btn caja-action-btn--ghost"
          style={{ border: 'none', background: 'var(--color-bg-muted)' }}
        >
          <ScanBarcode className="caja-action-btn__icon text-brand" />
          <span>{scanBusy ? 'Reading...' : 'Scan'}</span>
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="caja-action-btn caja-action-btn--ghost"
          style={{ border: 'none', background: 'var(--color-bg-muted)' }}
        >
          <Plus className="caja-action-btn__icon text-success" />
          <span>Generate</span>
        </button>
      </div>
    </div>
  )
}
