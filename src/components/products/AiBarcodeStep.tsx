'use client'

import { useCallback, useEffect } from 'react'
import { Plus, ScanBarcode } from 'lucide-react'
import { useMorphingModal } from '@/components/ui'
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

  const { currentStep } = useMorphingModal()

  // Clear any existing barcode state when entering this step so the user
  // starts with a clean slate every time.
  useEffect(() => {
    if (currentStep === 2) {
      setBarcode('')
      setBarcodeFormat(null)
      setBarcodeSource(null)
      setError('')
    }
  }, [currentStep, setBarcode, setBarcodeFormat, setBarcodeSource, setError])

  const handleClear = useCallback(() => {
    setBarcode('')
    setBarcodeFormat(null)
    setBarcodeSource(null)
  }, [setBarcode, setBarcodeFormat, setBarcodeSource])

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
      <p className="text-sm text-text-secondary text-center">
        Scan the product&apos;s existing barcode, generate a new one, or skip
        to complete this setup later.
      </p>

      <div className="rounded-xl border border-border bg-bg-muted p-4 h-44 flex items-center justify-center text-center overflow-hidden">
        <BarcodeDisplay value={barcode} format={barcodeFormat} />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
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

        <button
          type="button"
          onClick={handleClear}
          disabled={!barcode}
          className="text-sm text-error hover:text-error transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          Reset
        </button>
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
