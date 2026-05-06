'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, Plus, Printer, RotateCcw, ScanLine } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useProductForm } from '@/contexts/product-form-context'
import { detectBarcodeFormat, generateInternalProductBarcode, getBarcodeFormatLabel } from '@kasero/shared/barcodes'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { printBarcodeLabel } from '@/lib/barcode-print'
import { BarcodeDisplay } from './BarcodeDisplay'
import type { BarcodeSource } from '@kasero/shared/types'

export function BarcodeFields() {
  const t = useTranslations('barcode')
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

  const handleBarcodeChange = useCallback((value: string) => {
    setBarcode(value)

    // Format is always derived from the value — never a user input. The
    // cascade handles normalization internally and returns null for empty or
    // non-printable input.
    const detected = detectBarcodeFormat(value)
    setBarcodeFormat(detected)
    setBarcodeSource(detected ? 'manual' : null)
  }, [setBarcode, setBarcodeFormat, setBarcodeSource])

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
        return t('source_scanned')
      case 'generated':
        return t('source_generated')
      case 'manual':
        return t('source_manual')
      default:
        return t('source_na')
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

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <label htmlFor="product-barcode" className="label">{t('label')}</label>
        <div className="relative">
          <input
            id="product-barcode"
            type="text"
            value={barcode}
            onChange={(e) => handleBarcodeChange(e.target.value)}
            className="input w-full"
            style={{ paddingRight: 'var(--space-10)' }}
            placeholder={t('scan_input_placeholder')}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!barcode.trim()}
            style={{ right: 'var(--space-3)' }}
            className={`absolute top-1/2 -translate-y-1/2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              copied ? 'text-success' : 'text-text-tertiary hover:text-text-secondary'
            }`}
            aria-label={copied ? t('copy_aria_copied') : t('copy_aria_default')}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg-muted p-4 h-28 flex items-center justify-center text-center overflow-hidden">
        <BarcodeDisplay value={barcode} format={barcodeFormat} />
      </div>

      {barcode ? (
        <div className="text-sm text-text-secondary text-center">
          {`${barcodeFormat ? getBarcodeFormatLabel(barcodeFormat) : t('source_na')} · ${getBarcodeSourceLabel(barcodeSource)}`}
        </div>
      ) : (
        <div className="text-sm text-text-tertiary text-center">
          {t('no_barcode')}
        </div>
      )}

      {scanHiddenInput}

      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleScanClick}
            disabled={scanBusy}
            className="icon-stack-btn icon-stack-btn--lg icon-stack-btn--info"
          >
            <span className="icon-stack-btn__icon"><ScanLine size={28} /></span>
            <span className="icon-stack-btn__label">{scanBusy ? t('scan_reading') : t('scan_button')}</span>
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="icon-stack-btn icon-stack-btn--lg icon-stack-btn--success"
          >
            <span className="icon-stack-btn__icon"><Plus size={28} /></span>
            <span className="icon-stack-btn__label">{t('generate_button')}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!barcode}
            className="icon-stack-btn icon-stack-btn--lg icon-stack-btn--warning"
          >
            <span className="icon-stack-btn__icon"><Printer size={28} /></span>
            <span className="icon-stack-btn__label">{t('print_button')}</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!barcode}
            className="icon-stack-btn icon-stack-btn--lg icon-stack-btn--danger"
          >
            <span className="icon-stack-btn__icon"><RotateCcw size={28} /></span>
            <span className="icon-stack-btn__label">{t('reset_button')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
