'use client'

import { useIntl } from 'react-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, Plus, Printer, RotateCcw, ScanLine } from 'lucide-react'
import { useProductForm } from '@/contexts/product-form-context'
import {
  detectBarcodeFormat,
  generateInternalProductBarcode,
  getBarcodeFormatLabel,
} from '@kasero/shared/barcodes'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { printBarcodeLabel } from '@/lib/barcode-print'
import { BarcodeDisplay } from './BarcodeDisplay'
import type { BarcodeSource } from '@kasero/shared/types'

export function BarcodeFields() {
  const t = useIntl()
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<number | null>(null)
  const {
    name,
    barcode,
    barcodeFormat,
    barcodeSource,
    setBarcode,
    setBarcodeFormat,
    setBarcodeSource,
    setError,
  } = useProductForm()

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

  const handleBarcodeChange = useCallback(
    (value: string) => {
      setBarcode(value)
      const detected = detectBarcodeFormat(value)
      setBarcodeFormat(detected)
      setBarcodeSource(detected ? 'manual' : null)
    },
    [setBarcode, setBarcodeFormat, setBarcodeSource],
  )

  const handleScanClick = useCallback(() => {
    setError('')
    openScanner()
  }, [openScanner, setError])

  const handleGenerate = useCallback(() => {
    setBarcode(generateInternalProductBarcode())
    setBarcodeFormat('CODE_128')
    setBarcodeSource('generated')
  }, [setBarcode, setBarcodeFormat, setBarcodeSource])

  const handleClear = useCallback(() => {
    setBarcode('')
    setBarcodeFormat(null)
    setBarcodeSource(null)
  }, [setBarcode, setBarcodeFormat, setBarcodeSource])

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

  const handlePrint = useCallback(() => {
    printBarcodeLabel({ barcode, barcodeFormat, name })
  }, [barcode, barcodeFormat, name])

  const handleCopy = useCallback(async () => {
    const normalizedValue = barcode.trim()
    if (!normalizedValue) return

    const fallbackCopy = () => {
      const textArea = document.createElement('textarea')
      textArea.value = normalizedValue
      textArea.setAttribute('readonly', '')
      textArea.style.position = 'absolute'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      const copiedWithFallback = document.execCommand('copy')
      document.body.removeChild(textArea)
      return copiedWithFallback
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedValue)
      } else if (!fallbackCopy()) {
        throw new Error('Copy failed')
      }

      setCopied(true)
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      if (fallbackCopy()) {
        setCopied(true)
        if (copyTimeoutRef.current) {
          window.clearTimeout(copyTimeoutRef.current)
        }
        copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500)
        return
      }

      setCopied(false)
    }
  }, [barcode])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const hasBarcode = Boolean(barcode.trim())

  return (
    <div className="pm-barcode">
      <div className="pm-field">
        <label htmlFor="product-barcode" className="pm-field-label">
          {t.formatMessage({ id: 'barcode.label' })}
        </label>
        <div className="pm-barcode-input">
          <input
            id="product-barcode"
            type="text"
            value={barcode}
            onChange={(e) => handleBarcodeChange(e.target.value)}
            className="input"
            style={{ paddingRight: 'var(--space-10)', fontFamily: 'var(--font-mono)' }}
            placeholder={t.formatMessage({
              id: 'barcode.scan_input_placeholder',
            })}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasBarcode}
            className={`pm-barcode-input__copy ${
              copied ? 'pm-barcode-input__copy--copied' : ''
            }`}
            aria-label={
              copied
                ? t.formatMessage({ id: 'barcode.copy_aria_copied' })
                : t.formatMessage({ id: 'barcode.copy_aria_default' })
            }
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

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
      </div>

      {scanHiddenInput}

      <div className="pm-barcode-actions">
        <button
          type="button"
          onClick={handleScanClick}
          disabled={scanBusy}
          className="pm-action pm-action--brand"
        >
          <span className="pm-action__icon">
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
          <span className="pm-action__icon">
            <Plus size={26} strokeWidth={1.6} />
          </span>
          <span className="pm-action__label">
            {t.formatMessage({ id: 'barcode.generate_button' })}
          </span>
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!hasBarcode}
          className="pm-action pm-action--warning"
        >
          <span className="pm-action__icon">
            <Printer size={24} strokeWidth={1.6} />
          </span>
          <span className="pm-action__label">
            {t.formatMessage({ id: 'barcode.print_button' })}
          </span>
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasBarcode}
          className="pm-action pm-action--danger"
        >
          <span className="pm-action__icon">
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
