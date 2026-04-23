'use client'

import { getBarcodeFormatLabel } from './barcodes'
import type { BarcodeFormat } from '@/types'

interface PrintBarcodeLabelOptions {
  barcode: string
  barcodeFormat: BarcodeFormat | null
  name: string
}

/**
 * Render a product's barcode into a hidden iframe and open the browser's
 * native print dialog on it. No-op if the product has no barcode or the
 * SVG fails to render. Shared between the edit form and the products-list
 * swipe action.
 *
 * The renderer pulls bwip-js (~70 KB) transitively; we dynamically import
 * it on first call so the products-page initial chunk stays lean. Print
 * is always a deliberate user action, so the one-time load cost is
 * acceptable. Callers are already fire-and-forget void consumers; the
 * async signature is a superset that still compiles under those sites.
 *
 * We write the label HTML into the iframe and wait for `load` before
 * calling `print()` — calling it too early (e.g. on a bare setTimeout)
 * can show an empty preview on slow frames. A single rAF after load
 * gives the SVG one more layout pass before the print snapshot.
 */
export async function printBarcodeLabel({ barcode, barcodeFormat, name }: PrintBarcodeLabelOptions): Promise<void> {
  if (!barcode) return

  const { renderBarcodeSvg } = await import('./barcode-render')
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
  const printWindow = iframe.contentWindow
  if (!printDocument || !printWindow) {
    document.body.removeChild(iframe)
    return
  }

  const cleanup = () => {
    window.setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 250)
  }

  printWindow.addEventListener('afterprint', cleanup, { once: true })

  const html = `<!DOCTYPE html>
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
      .barcode { display: flex; justify-content: center; overflow: hidden; }
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
</html>`

  printDocument.open()
  printDocument.write(html)
  printDocument.close()

  // `document.write` inside an iframe doesn't fire a fresh `load` event
  // reliably, so we drive the print on rAF + a short settle timeout
  // rather than on `load`. That keeps the behavior the same as the
  // original BarcodeFields path (which was working) while still giving
  // the SVG one more layout pass before the snapshot.
  printWindow.requestAnimationFrame(() => {
    window.setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 50)
  })
}
