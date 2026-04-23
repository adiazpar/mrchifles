'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import { isBarcodeFormat } from '@/lib/barcodes'
import type { BarcodeFormat } from '@/types'
import type { LiveBarcodeScanResult } from '@/components/products/LiveBarcodeScanner'
import { useIsMobile } from './useIsMobile'

// html5-qrcode (~100KB gzipped) + LiveBarcodeScanner are only needed once
// the user actually opens the scanner. Loading the component dynamically
// keeps them out of the initial products-page chunk.
const LiveBarcodeScanner = dynamic(
  () => import('@/components/products/LiveBarcodeScanner').then(m => m.LiveBarcodeScanner),
  { ssr: false },
)

// Lazy-import the html5-qrcode module for the file-picker scan path. The
// dynamic import shares a chunk with LiveBarcodeScanner so the payload is
// downloaded exactly once, on first scanner open.
async function loadHtml5Qrcode() {
  const mod = await import('html5-qrcode')
  return {
    Html5Qrcode: mod.Html5Qrcode,
    SUPPORTED_FORMATS: [
      mod.Html5QrcodeSupportedFormats.CODABAR,
      mod.Html5QrcodeSupportedFormats.CODE_39,
      mod.Html5QrcodeSupportedFormats.CODE_93,
      mod.Html5QrcodeSupportedFormats.CODE_128,
      mod.Html5QrcodeSupportedFormats.ITF,
      mod.Html5QrcodeSupportedFormats.EAN_13,
      mod.Html5QrcodeSupportedFormats.EAN_8,
      mod.Html5QrcodeSupportedFormats.UPC_A,
      mod.Html5QrcodeSupportedFormats.UPC_E,
      mod.Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
    ],
  }
}

// ---------------------------------------------------------------------------
// File preprocessing helpers
// ---------------------------------------------------------------------------

// Rasterize page 1 of a PDF to a PNG File using unpdf (browser build of PDF.js,
// no worker config or Next.js bundler workarounds required).
async function rasterizePdfFirstPage(file: File): Promise<File> {
  const { renderPageAsImage } = await import('unpdf')
  const data = new Uint8Array(await file.arrayBuffer())
  const imageBuffer = await renderPageAsImage(data, 1, { scale: 2 })
  return new File([imageBuffer], `${file.name}.png`, { type: 'image/png' })
}

// Convert a HEIC/HEIF file to JPEG via the server-side conversion endpoint.
// html5-qrcode cannot decode HEIC natively, so this is required for iOS users
// who pick photos from their camera roll.
async function convertHeicToJpeg(file: File): Promise<File> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/convert-heic', { method: 'POST', body: formData })
  if (!res.ok) {
    throw new Error(`HEIC conversion failed with status ${res.status}`)
  }
  const json = await res.json()
  if (!json?.success || !json?.data?.image) {
    throw new Error('HEIC conversion returned no image')
  }
  // data.image is a base64 data URL like "data:image/jpeg;base64,..."
  const dataUrl = json.data.image as string
  const base64 = dataUrl.split(',')[1] ?? ''
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new File([bytes], `${file.name.replace(/\.(heic|heif)$/i, '')}.jpg`, {
    type: 'image/jpeg',
  })
}

function isHeicFile(file: File): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true
  return /\.(heic|heif)$/i.test(file.name)
}

function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true
  return /\.pdf$/i.test(file.name)
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Match the limit used by useImageCompression for consistency.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

// Distinct error kinds the hook can surface. Callers receive a human-readable
// message via onError; the kind is exported for callers that want to branch
// on a specific failure mode.
const ScanErrorKind = {
  NoBarcodeInImage: 'no_barcode_in_image',
  PdfUnreadable: 'pdf_unreadable',
  HeicConversionFailed: 'heic_conversion_failed',
  FileTooLarge: 'file_too_large',
  ResultHandlerError: 'result_handler_error',
  DecoderError: 'decoder_error',
} as const

type ScanErrorKind = typeof ScanErrorKind[keyof typeof ScanErrorKind]

const ERROR_MESSAGES: Record<ScanErrorKind, string> = {
  [ScanErrorKind.NoBarcodeInImage]: 'No barcode detected in that image. Try a clearer photo.',
  [ScanErrorKind.PdfUnreadable]: "Couldn't read that PDF. Try a clearer file or an image.",
  [ScanErrorKind.HeicConversionFailed]: "Couldn't process that photo. Try a JPEG or PNG instead.",
  [ScanErrorKind.FileTooLarge]: 'That file is too large. Please choose one under 20 MB.',
  [ScanErrorKind.ResultHandlerError]: "Something went wrong saving the scan result. Please try again.",
  [ScanErrorKind.DecoderError]: 'The barcode reader hit an unexpected error. Please try again.',
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

interface BarcodeScanResult {
  value: string
  format: BarcodeFormat | null
}

interface UseBarcodeScanOptions {
  onResult: (result: BarcodeScanResult) => void | Promise<void>
  onError: (message: string, kind?: ScanErrorKind) => void
}

interface UseBarcodeScanReturn {
  open: () => void
  busy: boolean
  hiddenInput: ReactNode
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBarcodeScan({ onResult, onError }: UseBarcodeScanOptions): UseBarcodeScanReturn {
  const isMobile = useIsMobile()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  // useId() gives us an SSR-safe, instance-unique id without the module-level
  // counter that previously caused collisions in Strict Mode and across hot
  // reloads. Sanitized to a valid HTML id by stripping React's `:` chars.
  const reactId = useId()
  const hostIdRef = useRef<string>(`barcode-scan-host-${reactId.replace(/:/g, '')}`)
  const activeScannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [liveOpen, setLiveOpen] = useState(false)

  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  }, [onResult, onError])

  // On unmount, make sure any in-flight scanner is cleared so we don't leak
  // host elements or scanner state across page transitions.
  useEffect(() => {
    return () => {
      const scanner = activeScannerRef.current
      if (scanner) {
        try {
          scanner.clear()
        } catch {
          // Best-effort cleanup. Host element may already be detached.
        }
        activeScannerRef.current = null
      }
    }
  }, [])

  const emitError = useCallback((kind: ScanErrorKind, override?: string) => {
    const message = override ?? ERROR_MESSAGES[kind]
    onErrorRef.current(message, kind)
  }, [])

  const setBusyState = useCallback((value: boolean) => {
    busyRef.current = value
    setBusy(value)
  }, [])

  const openFilePicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const openLiveScanner = useCallback(() => {
    setBusyState(true)
    setLiveOpen(true)
  }, [setBusyState])

  const open = useCallback(() => {
    // Re-entrancy guard: ignore double-clicks while a scan is in flight.
    if (busyRef.current) return
    // On mobile, use the continuous live camera decoder. On desktop, fall
    // back to the file-input path (which on desktop opens a file picker).
    if (isMobile) {
      openLiveScanner()
    } else {
      openFilePicker()
    }
  }, [isMobile, openLiveScanner, openFilePicker])

  // --- Live scanner result handling ---

  const handleLiveResult = useCallback(
    async (result: LiveBarcodeScanResult) => {
      setLiveOpen(false)
      try {
        await onResultRef.current(result)
      } catch (err) {
        console.error('[useBarcodeScan] onResult handler threw (live):', err)
        onErrorRef.current(
          ERROR_MESSAGES[ScanErrorKind.ResultHandlerError],
          ScanErrorKind.ResultHandlerError,
        )
      } finally {
        setBusyState(false)
      }
    },
    [setBusyState],
  )

  const handleLiveCancel = useCallback(() => {
    setLiveOpen(false)
    setBusyState(false)
  }, [setBusyState])

  // Escape hatch from the live scanner back to the file picker. Used when
  // a mobile user wants to pick a PDF or a pre-taken photo instead of
  // scanning live, and also when a dev testing mobile emulation in
  // DevTools wants to bypass the webcam and pick a test image.
  const handleSwitchToFilePicker = useCallback(() => {
    setLiveOpen(false)
    setBusyState(false)
    // Trigger the file picker synchronously from the button's click
    // handler chain so the browser still sees the user gesture and
    // allows the file dialog to open.
    inputRef.current?.click()
  }, [setBusyState])

  const handleLiveError = useCallback((message: string) => {
    // The component shows its own inline error; we also surface it to the
    // caller so they can display a secondary banner if they want.
    onErrorRef.current(message, ScanErrorKind.DecoderError)
  }, [])

  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Re-entrancy guard for the file picker. The browser shouldn't fire
      // change twice in a row, but defending against it costs nothing.
      if (busyRef.current) {
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      // File size guard. Larger photos cause OOM on mobile and don't help
      // the decoder anyway since the scan area is bounded.
      if (file.size > MAX_FILE_SIZE_BYTES) {
        emitError(ScanErrorKind.FileTooLarge)
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      setBusyState(true)

      // Preprocessing: PDFs and HEIC files need conversion before they can be
      // handed to html5-qrcode. JPEGs / PNGs / WebP go through unchanged.
      let scanTarget: File | Blob = file
      try {
        if (isPdfFile(file)) {
          scanTarget = await rasterizePdfFirstPage(file)
        } else if (isHeicFile(file)) {
          scanTarget = await convertHeicToJpeg(file)
        }
      } catch (err) {
        const isPdf = isPdfFile(file)
        console.error(
          `[useBarcodeScan] ${isPdf ? 'PDF rasterization' : 'HEIC conversion'} failed:`,
          err,
        )
        emitError(isPdf ? ScanErrorKind.PdfUnreadable : ScanErrorKind.HeicConversionFailed)
        setBusyState(false)
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      const { Html5Qrcode: Html5QrcodeCtor, SUPPORTED_FORMATS } = await loadHtml5Qrcode()
      const scanner = new Html5QrcodeCtor(hostIdRef.current, {
        verbose: false,
        formatsToSupport: SUPPORTED_FORMATS,
      })
      activeScannerRef.current = scanner

      const cleanup = async () => {
        setBusyState(false)
        try {
          await scanner.clear()
        } catch {
          // Host element may already be detached.
        }
        if (activeScannerRef.current === scanner) {
          activeScannerRef.current = null
        }
        if (inputRef.current) {
          inputRef.current.value = ''
        }
      }

      let decoded: BarcodeScanResult
      try {
        const result = await scanner.scanFileV2(scanTarget as File, false)
        const formatName = result.result.format?.formatName || null
        const format = formatName && isBarcodeFormat(formatName) ? formatName : null
        decoded = { value: result.decodedText, format }
      } catch {
        // html5-qrcode collapses every decode failure into a generic exception.
        // We can't reliably distinguish "no barcode in image" from "decoder
        // hit an internal error", so default to the user-friendly message.
        emitError(ScanErrorKind.NoBarcodeInImage)
        await cleanup()
        return
      }

      // Run the caller's result handler. If it throws, surface a distinct
      // error so the user isn't left staring at a silently-cleared spinner.
      try {
        await onResultRef.current(decoded)
      } catch (err) {
        console.error('[useBarcodeScan] onResult handler threw:', err)
        emitError(ScanErrorKind.ResultHandlerError)
      } finally {
        await cleanup()
      }
    },
    [emitError, setBusyState],
  )

  const hiddenInput = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        onChange={handleFile}
        className="hidden"
      />
      <div id={hostIdRef.current} className="hidden" />
      {liveOpen && (
        <LiveBarcodeScanner
          onResult={handleLiveResult}
          onCancel={handleLiveCancel}
          onError={handleLiveError}
          onSwitchToFilePicker={handleSwitchToFilePicker}
        />
      )}
    </>
  )

  return { open, busy, hiddenInput }
}
