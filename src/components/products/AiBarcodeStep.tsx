'use client'

import { useCallback, useEffect } from 'react'
import { Plus, ScanBarcode } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMorphingModal } from '@/components/ui'
import { useProductForm } from '@/contexts/product-form-context'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { generateInternalProductBarcode, getBarcodeFormatLabel } from '@/lib/barcodes'
import { BarcodeDisplay } from './BarcodeDisplay'
import type { BarcodeSource } from '@/types'

/**
 * Minimal barcode capture for the AI flow. Renders the barcode preview,
 * metadata, and the two capture actions (Scan / Generate). No manual entry,
 * no format selector, no print button — those live in the full edit form.
 *
 * Footer (Skip / Continue) is provided by the parent Modal.Step.
 */
export function AiBarcodeStepBody() {
  const t = useTranslations('barcode')
  const {
    barcode,
    barcodeFormat,
    barcodeSource,
    setBarcode,
    setBarcodeFormat,
    setBarcodeSource,
    setError,
  } = useProductForm()

  const getBarcodeSourceLabel = (source: BarcodeSource | null): string => {
    switch (source) {
      case 'scanned':
        return t('source_scanned')
      case 'generated':
        return t('source_generated')
      case 'manual':
        return t('source_manual')
      default:
        return t('source_na')
    }
  }

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
        {t('ai_barcode_intro')}
      </p>

      <div className="rounded-xl border border-border bg-bg-muted p-4 h-44 flex items-center justify-center text-center overflow-hidden">
        <BarcodeDisplay value={barcode} format={barcodeFormat} />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {barcode ? (
            <>
              <div className="text-sm break-all text-text-secondary">
                {`${barcode} · ${barcodeFormat ? getBarcodeFormatLabel(barcodeFormat) : t('source_na')}`}
              </div>
              <div className="text-sm text-text-tertiary mt-1">
                {getBarcodeSourceLabel(barcodeSource)}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-text-tertiary">{t('no_barcode')}</div>
              <div className="text-sm text-text-tertiary mt-1">{t('source_na')}</div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleClear}
          disabled={!barcode}
          className="text-sm text-error hover:text-error transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {t('reset_button')}
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
          <span>{scanBusy ? t('scan_reading') : t('scan_button')}</span>
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="caja-action-btn caja-action-btn--ghost"
          style={{ border: 'none', background: 'var(--color-bg-muted)' }}
        >
          <Plus className="caja-action-btn__icon text-success" />
          <span>{t('generate_button')}</span>
        </button>
      </div>
    </div>
  )
}
