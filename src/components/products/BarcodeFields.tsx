'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, Plus, Printer, ScanBarcode } from 'lucide-react'
import { useProductForm } from '@/contexts/product-form-context'
import { detectBarcodeFormat, generateInternalProductBarcode, getBarcodeFormatLabel } from '@/lib/barcodes'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { renderBarcodeSvg } from '@/lib/barcode-render'
import { BarcodeDisplay } from './BarcodeDisplay'
import type { BarcodeSource } from '@/types'

export function BarcodeFields() {
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
        return 'Scanned'
      case 'generated':
        return 'Generated'
      case 'manual':
        return 'Manual'
      default:
        return 'N/A'
    }
  }

  const handlePrint = useCallback(() => {
    if (!barcode) return

    const result = renderBarcodeSvg(barcode, barcodeFormat, {
      scale: 3,
      height: 18,
      includetext: true,
      paddingwidth: 0,
      paddingheight: 0,
    })

    if (!result.svg || result.error) {
      return
    }

    const escapeHtml = (input: string) => input
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

    const title = (name || 'Product barcode').trim()
    const label = `${barcode} · ${barcodeFormat ? getBarcodeFormatLabel(barcodeFormat) : 'Code 128'}`
    const safeTitle = escapeHtml(title)
    const safeLabel = escapeHtml(label)
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    const printDocument = iframe.contentWindow?.document
    if (!printDocument || !iframe.contentWindow) {
      document.body.removeChild(iframe)
      return
    }

    printDocument.open()
    printDocument.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${safeTitle}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #ffffff;
              color: #111827;
            }
            .label {
              width: 100%;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
            }
            .label-card {
              width: 100%;
              max-width: 520px;
              border: 1px solid #d1d5db;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
            }
            .title {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 16px;
            }
            .barcode {
              display: flex;
              justify-content: center;
              overflow: hidden;
            }
            .meta {
              margin-top: 14px;
              font-size: 13px;
              color: #4b5563;
              word-break: break-all;
            }
            @media print {
              body { background: #ffffff; }
              .label { min-height: auto; padding: 0; }
              .label-card {
                border: none;
                border-radius: 0;
                max-width: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <main class="label">
            <section class="label-card">
              <div class="title">${safeTitle}</div>
              <div class="barcode">${result.svg}</div>
              <div class="meta">${safeLabel}</div>
            </section>
          </main>
        </body>
      </html>
    `)
    printDocument.close()

    const printWindow = iframe.contentWindow
    const cleanup = () => {
      window.setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 250)
    }

    printWindow.addEventListener('afterprint', cleanup, { once: true })
    printWindow.focus()
    window.setTimeout(() => {
      printWindow.print()
    }, 50)
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
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="product-barcode" className="label">Barcode value</label>
        <div className="relative">
          <input
            id="product-barcode"
            type="text"
            value={barcode}
            onChange={(e) => handleBarcodeChange(e.target.value)}
            className="input w-full"
            style={{ paddingRight: 'var(--space-10)' }}
            placeholder="Scan or enter code"
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
            aria-label={copied ? 'Barcode copied' : 'Copy barcode value'}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

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
              <div className="text-sm text-text-tertiary">
                No barcode attached
              </div>
              <div className="text-sm text-text-tertiary mt-1">
                N/A
              </div>
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
        <button
          type="button"
          className="caja-action-btn caja-action-btn--ghost"
          disabled={!barcode}
          style={{ border: 'none', background: 'var(--color-bg-muted)' }}
          onClick={handlePrint}
        >
          <Printer className="caja-action-btn__icon text-pos" />
          <span>Print</span>
        </button>
      </div>
    </div>
  )
}
