'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { isBarcodeFormat } from '@/lib/barcodes'
import type { BarcodeFormat } from '@/types'

const SUPPORTED_BARCODE_FORMATS = [
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

export interface BarcodeScanResult {
  value: string
  format: BarcodeFormat | null
}

export interface UseBarcodeScanOptions {
  onResult: (result: BarcodeScanResult) => void
  onError: (message: string) => void
}

export interface UseBarcodeScanReturn {
  open: () => void
  busy: boolean
  hiddenInput: ReactNode
}

let scanHostCounter = 0

export function useBarcodeScan({ onResult, onError }: UseBarcodeScanOptions): UseBarcodeScanReturn {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const hostIdRef = useRef<string>(`barcode-scan-host-${++scanHostCounter}`)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  }, [onResult, onError])

  const open = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBusy(true)
    const scanner = new Html5Qrcode(hostIdRef.current, {
      verbose: false,
      formatsToSupport: SUPPORTED_BARCODE_FORMATS,
    })

    try {
      const result = await scanner.scanFileV2(file, false)
      const formatName = result.result.format?.formatName || null
      const format = formatName && isBarcodeFormat(formatName) ? formatName : null
      onResultRef.current({ value: result.decodedText, format })
    } catch {
      onErrorRef.current('No barcode detected in that image. Try a clearer photo.')
    } finally {
      setBusy(false)
      try {
        await scanner.clear()
      } catch {
        // ignore - host element may already be detached
      }
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }, [])

  const hiddenInput = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <div id={hostIdRef.current} className="hidden" />
    </>
  )

  return { open, busy, hiddenInput }
}
