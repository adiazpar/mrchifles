'use client'

import { useIntl } from 'react-intl'
import { useCallback, useEffect } from 'react'
import { Plus, ScanLine, RotateCcw } from 'lucide-react'
import { useProductForm } from '@/contexts/product-form-context'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import {
  generateInternalProductBarcode,
  getBarcodeFormatLabel,
} from '@kasero/shared/barcodes'
import { BarcodeDisplay } from './BarcodeDisplay'
import type { BarcodeSource } from '@kasero/shared/types'

/**
 * Minimal barcode capture for the AI flow. Renders the barcode preview,
 * metadata, and capture actions (Scan / Generate / Reset). No manual
 * entry, no format selector, no print button — those live in the full
 * edit form.
 *
 * Footer (Skip / Continue) is provided by the parent step.
 */
export function AiBarcodeStepBody() {
  const t = useIntl()
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
        return t.formatMessage({ id: 'barcode.source_scanned' })
      case 'generated':
        return t.formatMessage({ id: 'barcode.source_generated' })
      case 'manual':
        return t.formatMessage({ id: 'barcode.source_manual' })
      default:
        return t.formatMessage({ id: 'barcode.source_na' })
    }
  }

  // Clear any existing barcode state when this step mounts so the user
  // starts with a clean slate every time.
  useEffect(() => {
    setBarcode('')
    setBarcodeFormat(null)
    setBarcodeSource(null)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClear = useCallback(() => {
    setBarcode('')
    setBarcodeFormat(null)
    setBarcodeSource(null)
  }, [setBarcode, setBarcodeFormat, setBarcodeSource])

  const {
    open: openScanner,
    busy: scanBusy,
    hiddenInput: scanHiddenInput,
  } = useBarcodeScan({
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

  const hasBarcode = Boolean(barcode.trim())

  return (
    <div className="pm-barcode">
      <p className="pm-hero__subtitle" style={{ marginTop: 0 }}>
        {t.formatMessage({ id: 'barcode.ai_barcode_intro' })}
      </p>

      <div className="pm-barcode-ledger pm-barcode-ledger--tall">
        <BarcodeDisplay value={barcode} format={barcodeFormat} />
      </div>

      <div className="pm-barcode-meta">
        {hasBarcode ? (
          <div className="pm-barcode-meta__chips">
            <span className="pm-barcode-chip pm-barcode-chip--brand">
              {barcodeFormat
                ? getBarcodeFormatLabel(barcodeFormat)
                : t.formatMessage({ id: 'barcode.source_na' })}
            </span>
            <span className="pm-barcode-chip pm-barcode-chip--ink">
              {getBarcodeSourceLabel(barcodeSource)}
            </span>
          </div>
        ) : (
          <span className="pm-barcode-meta__empty">
            {t.formatMessage({ id: 'barcode.no_barcode' })}
          </span>
        )}
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasBarcode}
          className="pm-barcode-meta__reset"
        >
          {t.formatMessage({ id: 'barcode.reset_button' })}
        </button>
      </div>

      {scanHiddenInput}

      <div className="pm-barcode-actions">
        <button
          type="button"
          onClick={handleScanClick}
          disabled={scanBusy}
          className="pm-action pm-action--brand"
        >
          <span className="pm-action__circle">
            <ScanLine size={26} strokeWidth={1.6} />
          </span>
          <span className="pm-action__label">
            {scanBusy
              ? t.formatMessage({ id: 'barcode.scan_reading' })
              : t.formatMessage({ id: 'barcode.scan_button' })}
          </span>
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="pm-action pm-action--success"
        >
          <span className="pm-action__circle">
            <Plus size={26} strokeWidth={1.6} />
          </span>
          <span className="pm-action__label">
            {t.formatMessage({ id: 'barcode.generate_button' })}
          </span>
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasBarcode}
          className="pm-action pm-action--danger"
        >
          <span className="pm-action__circle">
            <RotateCcw size={24} strokeWidth={1.6} />
          </span>
          <span className="pm-action__label">
            {t.formatMessage({ id: 'barcode.reset_button' })}
          </span>
        </button>
      </div>
    </div>
  )
}
