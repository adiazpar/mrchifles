'use client'

import { useIntl } from 'react-intl';
import { useCallback, useEffect } from 'react'
import { Plus, ScanLine } from 'lucide-react'
import { useProductForm } from '@/contexts/product-form-context'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { generateInternalProductBarcode, getBarcodeFormatLabel } from '@kasero/shared/barcodes'
import { BarcodeDisplay } from './BarcodeDisplay'
import type { BarcodeSource } from '@kasero/shared/types'

/**
 * Minimal barcode capture for the AI flow. Renders the barcode preview,
 * metadata, and the two capture actions (Scan / Generate). No manual entry,
 * no format selector, no print button — those live in the full edit form.
 *
 * Footer (Skip / Continue) is provided by the parent Modal.Step.
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
        return t.formatMessage({
          id: 'barcode.source_scanned'
        });
      case 'generated':
        return t.formatMessage({
          id: 'barcode.source_generated'
        });
      case 'manual':
        return t.formatMessage({
          id: 'barcode.source_manual'
        });
      default:
        return t.formatMessage({
          id: 'barcode.source_na'
        });
    }
  }

  // Clear any existing barcode state when this step mounts so the user
  // starts with a clean slate every time. In IonNav-land each step is
  // mounted fresh on push, so running on mount (empty deps) is equivalent
  // to the old currentStep === 2 guard.
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
        {t.formatMessage({
          id: 'barcode.ai_barcode_intro'
        })}
      </p>
      <div className="rounded-xl border border-border bg-bg-muted p-4 h-44 flex items-center justify-center text-center overflow-hidden">
        <BarcodeDisplay value={barcode} format={barcodeFormat} />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {barcode ? (
            <div className="text-sm text-text-secondary">
              {`${barcodeFormat ? getBarcodeFormatLabel(barcodeFormat) : t.formatMessage({
                id: 'barcode.source_na'
              })} · ${getBarcodeSourceLabel(barcodeSource)}`}
            </div>
          ) : (
            <div className="text-sm text-text-tertiary">{t.formatMessage({
              id: 'barcode.no_barcode'
            })}</div>
          )}
        </div>

        <button
          type="button"
          onClick={handleClear}
          disabled={!barcode}
          className="text-sm text-error hover:text-error transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {t.formatMessage({
            id: 'barcode.reset_button'
          })}
        </button>
      </div>
      {scanHiddenInput}
      <div className="flex gap-4 justify-center">
        <button
          type="button"
          onClick={handleScanClick}
          disabled={scanBusy}
          className="flex flex-col items-center gap-1.5 cursor-pointer select-none transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-default disabled:active:scale-100"
        >
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-muted text-brand">
            <ScanLine size={28} />
          </span>
          <span className="text-[13px] font-medium text-text-secondary">{scanBusy ? t.formatMessage({
            id: 'barcode.scan_reading'
          }) : t.formatMessage({
            id: 'barcode.scan_button'
          })}</span>
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="flex flex-col items-center gap-1.5 cursor-pointer select-none transition-transform active:scale-95"
        >
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-muted text-success">
            <Plus size={28} />
          </span>
          <span className="text-[13px] font-medium text-text-secondary">{t.formatMessage({
            id: 'barcode.generate_button'
          })}</span>
        </button>
      </div>
    </div>
  );
}
