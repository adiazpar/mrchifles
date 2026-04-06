'use client'

import { useCallback } from 'react'
import { Plus, Printer, ScanBarcode } from 'lucide-react'
import { useProductForm } from '@/contexts/product-form-context'
import { BARCODE_FORMATS, generateInternalProductBarcode, getBarcodeFormatLabel } from '@/lib/barcodes'
import { renderBarcodeSvg } from '@/lib/barcode-render'
import { BarcodeDisplay } from './BarcodeDisplay'
import type { BarcodeFormat, BarcodeSource } from '@/types'

interface BarcodeFieldsProps {
  onOpenScanner: () => void
}

export function BarcodeFields({ onOpenScanner }: BarcodeFieldsProps) {
  const {
    name,
    barcode,
    barcodeFormat,
    barcodeSource,
    setBarcode,
    setBarcodeFormat,
    setBarcodeSource,
  } = useProductForm()

  const handleBarcodeChange = useCallback((value: string) => {
    setBarcode(value)
    const normalized = value.trim()

    if (!normalized) {
      setBarcodeFormat(null)
      setBarcodeSource(null)
      return
    }

    if (!barcodeFormat) {
      setBarcodeFormat('CODE_128')
    }
    setBarcodeSource('manual')
  }, [barcodeFormat, setBarcode, setBarcodeFormat, setBarcodeSource])

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

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-3 items-start">
          <div className="flex-[1.9] min-w-0">
            <label htmlFor="product-barcode" className="label">Barcode value</label>
            <input
              id="product-barcode"
              type="text"
              value={barcode}
              onChange={(e) => handleBarcodeChange(e.target.value)}
              className="input"
              placeholder="Scan or enter code"
              autoComplete="off"
            />
          </div>

          <div className="flex-[1.1] min-w-0">
            <label htmlFor="product-barcode-format" className="label">Barcode type</label>
            <select
              id="product-barcode-format"
              value={barcodeFormat || ''}
              onChange={(e) => setBarcodeFormat(e.target.value ? e.target.value as BarcodeFormat : null)}
              className={`input ${barcodeFormat ? '' : 'select-placeholder'}`}
            >
              <option value="">N/A</option>
              {BARCODE_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {getBarcodeFormatLabel(format)}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      <div className="rounded-xl border border-border bg-bg-muted p-4 mt-4 min-h-36 flex items-center justify-center text-center">
        <BarcodeDisplay value={barcode} format={barcodeFormat} />
      </div>

      <div className="flex items-start justify-between gap-4 mt-3">
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

      <div className="caja-actions mt-4">
        <button
          type="button"
          onClick={onOpenScanner}
          className="caja-action-btn caja-action-btn--ghost"
          style={{ border: 'none', background: 'var(--color-bg-muted)' }}
        >
          <ScanBarcode className="caja-action-btn__icon text-brand" />
          <span>Scan</span>
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
    </>
  )
}
