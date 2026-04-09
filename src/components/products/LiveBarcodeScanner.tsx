'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { X } from 'lucide-react'
import { isBarcodeFormat } from '@/lib/barcodes'
import type { BarcodeFormat } from '@/types'

// Keep this in sync with the formats list in useBarcodeScan.tsx. Both paths
// (file-based and live) should accept the same symbologies.
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
]

export interface LiveBarcodeScanResult {
  value: string
  format: BarcodeFormat | null
}

export interface LiveBarcodeScannerProps {
  onResult: (result: LiveBarcodeScanResult) => void | Promise<void>
  onCancel: () => void
  onError: (message: string) => void
}

/**
 * Full-screen live camera barcode scanner.
 *
 * Mounts a `Html5Qrcode` instance, opens the device's rear camera via
 * getUserMedia, and continuously decodes frames until one succeeds. On
 * decode, calls `onResult` once and stops the stream. On cancel, calls
 * `onCancel`. On camera failure (permission denied, no camera, etc.) shows
 * an inline error and calls `onError`.
 *
 * Expected to be mounted conditionally by the parent (only while the
 * scanner is active) — unmounting releases the camera stream via the
 * useEffect cleanup.
 */
export function LiveBarcodeScanner({ onResult, onCancel, onError }: LiveBarcodeScannerProps) {
  // Sanitize React's useId() into a valid HTML id.
  const reactId = useId().replace(/:/g, '')
  const hostIdRef = useRef(`live-barcode-scanner-${reactId}`)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  // Guard against double-emission: html5-qrcode's onSuccess may fire for
  // multiple consecutive frames seeing the same barcode.
  const emittedRef = useRef(false)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [errorMessage, setErrorMessage] = useState('')

  // Stash callbacks in refs so the start-scanner effect can run exactly
  // once on mount without depending on prop identity. If a parent passes
  // inline arrow functions (new reference every render), including them
  // in the effect's dep array would re-run the effect on every parent
  // re-render — stopping and restarting the camera in a loop, which is
  // the root cause of the "Maximum update depth exceeded" error.
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  })

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(hostIdRef.current, {
          verbose: false,
          formatsToSupport: SUPPORTED_FORMATS,
        })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            // Intentionally omit `qrbox` — when set, html5-qrcode injects
            // its own shaded scan region with corner markers that it
            // positions relative to the <video> element's letterboxed
            // rendered size, not our host div. That made the injected
            // overlay appear below the vertical center of our host. By
            // scanning the full frame, the library skips drawing the
            // shaded region entirely and we rely on our own laser line.
            aspectRatio: undefined,
          },
          async (decodedText, result) => {
            if (emittedRef.current) return
            emittedRef.current = true

            const formatName = result.result.format?.formatName || null
            const format = formatName && isBarcodeFormat(formatName) ? formatName : null

            try {
              await scanner.stop()
            } catch {
              // Camera may already be stopping; safe to ignore.
            }

            try {
              await onResultRef.current({ value: decodedText, format })
            } catch (err) {
              console.error('[LiveBarcodeScanner] onResult threw:', err)
            }
          },
          () => {
            // Per-frame scan failures are normal — do not surface to UI.
          },
        )

        if (!cancelled) {
          setStatus('scanning')
        }
      } catch (err) {
        console.error('[LiveBarcodeScanner] Failed to start camera:', err)
        if (cancelled) return

        const name = (err as Error)?.name || ''
        let message = 'Could not start the camera. Please try again.'
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          message = 'Camera access is required to scan. Please allow camera access in your browser settings and try again.'
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          message = 'No camera was found on this device.'
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          message = 'The camera is in use by another app. Close other apps and try again.'
        }

        setErrorMessage(message)
        setStatus('error')
        onErrorRef.current(message)
      }
    }

    void start()

    return () => {
      cancelled = true
      const scanner = scannerRef.current
      if (scanner) {
        // Fire-and-forget cleanup. stop() and clear() are async but the
        // effect cleanup can't await. Errors here are expected if the
        // scanner never finished starting.
        void (async () => {
          try {
            await scanner.stop()
          } catch {
            // ignore
          }
          try {
            await scanner.clear()
          } catch {
            // ignore
          }
        })()
        scannerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The overlay sits between the PageHeader and the MobileNav, respecting
  // the app's CSS variables so the header and navbar remain visible and
  // interactive around the scanner. Safe-area insets are accounted for so
  // notches and home indicators don't overlap the content.
  const overlayStyle: React.CSSProperties = {
    top: 'calc(var(--header-height) + env(safe-area-inset-top, 0px))',
    bottom: 'calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px))',
    left: 0,
    right: 0,
  }

  return (
    <div
      className="fixed z-40 bg-black overflow-hidden"
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Scan barcode"
    >
      {/*
        Video host — html5-qrcode injects nested wrapper divs around a
        <video> element. The library applies inline width/height to those
        wrappers and to the video itself based on the camera stream's
        intrinsic aspect ratio, which leaves letterbox space when the host
        is taller than the video's natural ratio. We override every
        descendant inside the host to fill completely and force the video
        to object-cover so the camera feed crops to fill instead of
        letterboxing. Scoped via a host-specific <style> tag so selectors
        can target html5-qrcode's injected DOM regardless of its depth.
      */}
      <style>{`
        #${hostIdRef.current},
        #${hostIdRef.current} > div,
        #${hostIdRef.current} > div > div {
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          max-height: 100% !important;
          padding: 0 !important;
        }
        #${hostIdRef.current} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }
        #${hostIdRef.current} #qr-shaded-region {
          display: none !important;
        }
      `}</style>
      <div id={hostIdRef.current} className="absolute inset-0" />

      {/* Close button — top-right corner, floats above everything */}
      <button
        type="button"
        onClick={onCancel}
        className="absolute top-3 right-3 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        aria-label="Cancel scan"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Scanning frame — centered scan box with corner brackets and a
          horizontal laser line running through the middle. The box defines
          the visual scan target, while the underlying camera still scans
          the full frame (we omit qrbox from html5-qrcode config). */}
      {status === 'scanning' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-[85%] aspect-[3/2] max-w-md">
            {/* Four L-shaped corner brackets, aligned to the box corners */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />
            {/* Laser line — spans the box width, centered vertically */}
            <div
              className="absolute left-0 right-0 h-[2px] bg-[var(--color-error)]"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        </div>
      )}

      {/* Footer instruction */}
      {status === 'scanning' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          <p className="text-white text-center text-sm">
            Align the barcode with the line
          </p>
        </div>
      )}

      {/* Starting state */}
      {status === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-white text-sm">Starting camera...</p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="text-white text-sm max-w-sm">{errorMessage}</p>
        </div>
      )}
    </div>
  )
}
