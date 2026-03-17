/**
 * useImageCompression - Image processing with HEIC support and cancellation
 *
 * Handles:
 * - HEIC to JPEG conversion (server-side)
 * - EXIF rotation correction
 * - Resize to max dimension
 * - JPEG compression
 */

import { useState, useCallback, useRef } from 'react'

export interface CompressionState {
  isProcessing: boolean
  error: string | null
}

interface UseImageCompressionReturn {
  state: CompressionState
  compressImage: (file: File) => Promise<string | null>
  cancel: () => void
}

// Max file size before compression (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024

// Target max dimension
const MAX_DIMENSION = 1024

// JPEG quality (0-1)
const JPEG_QUALITY = 0.8

export function useImageCompression(): UseImageCompressionReturn {
  const [state, setState] = useState<CompressionState>({
    isProcessing: false,
    error: null,
  })

  // Cancellation tracking
  const abortControllerRef = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)

  const cancel = useCallback(() => {
    console.log('[Compression] Cancel requested')
    cancelledRef.current = true

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setState({
      isProcessing: false,
      error: null,
    })
  }, [])

  const compressImage = useCallback(async (file: File): Promise<string | null> => {
    // Reset cancellation flag
    cancelledRef.current = false

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setState({
        isProcessing: false,
        error: 'La imagen debe ser menor a 20MB',
      })
      return null
    }

    setState({
      isProcessing: true,
      error: null,
    })

    // Create abort controller for fetch requests
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      // Check if file is HEIC/HEIF
      const isHeic = file.type === 'image/heic' ||
                     file.type === 'image/heif' ||
                     file.name.toLowerCase().endsWith('.heic') ||
                     file.name.toLowerCase().endsWith('.heif')

      let imageSource: Blob | string = file

      if (isHeic) {
        console.log('[Compression] Detected HEIC image, converting server-side...')

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/convert-heic', {
          method: 'POST',
          body: formData,
          signal,
        })

        if (cancelledRef.current) return null

        const result = await response.json()

        if (!result.success) {
          if (cancelledRef.current) return null
          setState({
            isProcessing: false,
            error: 'Error al convertir la imagen HEIC',
          })
          return null
        }

        console.log('[Compression] HEIC converted successfully')
        imageSource = result.data.image // base64 data URL
      } else {
        console.log('[Compression] Non-HEIC image, processing directly')
      }

      if (cancelledRef.current) return null

      // Use createImageBitmap to handle EXIF orientation
      let bitmap: ImageBitmap
      if (typeof imageSource === 'string') {
        // It's a base64 data URL from HEIC conversion
        const response = await fetch(imageSource)
        const blob = await response.blob()
        bitmap = await createImageBitmap(blob, {
          imageOrientation: 'from-image',
        })
      } else {
        bitmap = await createImageBitmap(imageSource, {
          imageOrientation: 'from-image',
        })
      }

      if (cancelledRef.current) {
        bitmap.close()
        return null
      }

      // Calculate resize dimensions
      let width = bitmap.width
      let height = bitmap.height

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        bitmap.close()
        if (cancelledRef.current) return null
        setState({
          isProcessing: false,
          error: 'Error al procesar la imagen',
        })
        return null
      }

      ctx.drawImage(bitmap, 0, 0, width, height)
      bitmap.close() // Free memory

      if (cancelledRef.current) return null

      // Compress to JPEG
      const compressedBase64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
      console.log(`[Compression] Image resized to ${width}x${height}, size: ~${Math.round(compressedBase64.length * 0.75 / 1024)}KB`)

      if (cancelledRef.current) return null

      setState({
        isProcessing: false,
        error: null,
      })

      return compressedBase64

    } catch (err) {
      // Check if this was an abort
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[Compression] Aborted')
        return null
      }

      if (cancelledRef.current) return null

      console.error('[Compression] Error:', err)
      setState({
        isProcessing: false,
        error: 'Error al procesar la imagen',
      })
      return null
    }
  }, [])

  return {
    state,
    compressImage,
    cancel,
  }
}
