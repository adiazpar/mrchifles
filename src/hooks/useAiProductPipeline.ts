/**
 * useAiProductPipeline - AI product creation with proper cancellation
 *
 * This hook manages the AI pipeline for product creation with true cancellation:
 * 1. AbortController cancels fetch requests mid-flight
 * 2. Pipeline run IDs ensure stale operations don't update state
 * 3. Background removal runs with abort signal awareness
 *
 * The key insight: you can't actually stop a running ML inference,
 * but you CAN ensure its results are ignored if the pipeline was cancelled.
 */

import { useState, useCallback, useRef } from 'react'
import { removeBackground, type Config } from '@imgly/background-removal'

// Pipeline steps for progress indication
export type PipelineStep =
  | 'idle'           // Not running
  | 'compressing'    // Compressing/converting image
  | 'identifying'    // GPT identifying product
  | 'removing-bg-1'  // First background removal (on photo)
  | 'generating'     // GPT generating emoji
  | 'removing-bg-2'  // Second background removal (on emoji)
  | 'complete'       // Done successfully
  | 'error'          // Failed

export interface PipelineResult {
  name: string
  iconPreview: string      // base64 data URL
  iconBlob: Blob
  cachedBgRemoved: string  // For regeneration
}

export interface PipelineState {
  step: PipelineStep
  error: string | null
  result: PipelineResult | null
}

interface UseAiProductPipelineReturn {
  state: PipelineState
  startPipeline: (imageBase64: string) => Promise<void>
  regenerateIcon: (cachedBgRemoved: string) => Promise<PipelineResult | null>
  cancel: () => void
  reset: () => void
}

// Background removal config - runs in Web Worker to avoid blocking main thread
const bgRemovalConfig: Config = {
  debug: false,
  proxyToWorker: true,  // Run inference in Web Worker (prevents UI freezing)
  device: 'gpu',        // Use WebGL if available (faster), falls back to CPU
  model: 'isnet_quint8', // Quantized model - smaller & faster, slight quality tradeoff
}

/**
 * Generate a unique run ID for pipeline execution tracking
 */
function generateRunId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Compress and resize an image blob to fit within size limits.
 * PocketBase allows max 500KB for icons, so we target ~400KB to be safe.
 */
async function compressIconBlob(blob: Blob, maxSize = 400000, targetDimension = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Create canvas with target dimensions
      const canvas = document.createElement('canvas')
      canvas.width = targetDimension
      canvas.height = targetDimension
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Draw image scaled to fit
      ctx.drawImage(img, 0, 0, targetDimension, targetDimension)

      // Try PNG first, if too large fall back to smaller dimensions
      const tryCompress = (dimension: number): void => {
        if (dimension < 64) {
          // Give up, just use smallest size
          canvas.width = 64
          canvas.height = 64
          ctx.drawImage(img, 0, 0, 64, 64)
          canvas.toBlob((result) => {
            if (result) resolve(result)
            else reject(new Error('Failed to create blob'))
          }, 'image/png')
          return
        }

        canvas.width = dimension
        canvas.height = dimension
        ctx.clearRect(0, 0, dimension, dimension)
        ctx.drawImage(img, 0, 0, dimension, dimension)

        canvas.toBlob((result) => {
          if (!result) {
            reject(new Error('Failed to create blob'))
            return
          }
          if (result.size <= maxSize) {
            console.log(`[Pipeline] Compressed icon to ${dimension}x${dimension}, size: ${result.size}`)
            resolve(result)
          } else {
            // Try smaller dimension
            console.log(`[Pipeline] Icon at ${dimension}x${dimension} is ${result.size} bytes, trying smaller...`)
            tryCompress(Math.floor(dimension * 0.75))
          }
        }, 'image/png')
      }

      tryCompress(targetDimension)
    }
    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = URL.createObjectURL(blob)
  })
}

export function useAiProductPipeline(): UseAiProductPipelineReturn {
  const [state, setState] = useState<PipelineState>({
    step: 'idle',
    error: null,
    result: null,
  })

  // Current run tracking - only the active run can update state
  const currentRunIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Cancel any running pipeline.
   * - Aborts fetch requests immediately
   * - Marks the run as cancelled so background removal results are ignored
   */
  const cancel = useCallback(() => {
    console.log('[Pipeline] Cancel requested, runId:', currentRunIdRef.current)

    // Abort any in-flight fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Invalidate the current run (background removal will complete but be ignored)
    currentRunIdRef.current = null

    // Reset state immediately for responsive UI
    setState({
      step: 'idle',
      error: null,
      result: null,
    })
  }, [])

  /**
   * Reset to initial state (e.g., when starting fresh)
   */
  const reset = useCallback(() => {
    cancel()
  }, [cancel])

  /**
   * Check if this run is still active (hasn't been cancelled)
   */
  const isRunActive = useCallback((runId: string): boolean => {
    return currentRunIdRef.current === runId
  }, [])

  /**
   * Update state only if the run is still active
   */
  const safeSetState = useCallback((runId: string, update: Partial<PipelineState> | ((prev: PipelineState) => PipelineState)) => {
    if (!isRunActive(runId)) {
      console.log('[Pipeline] Ignoring state update for cancelled run:', runId)
      return false
    }

    if (typeof update === 'function') {
      setState(update)
    } else {
      setState(prev => ({ ...prev, ...update }))
    }
    return true
  }, [isRunActive])

  /**
   * Run the full AI pipeline:
   * 1. Identify product (GPT-4o Mini Vision)
   * 2. Remove background from photo (client-side ML)
   * 3. Generate emoji (GPT Image 1 Mini)
   * 4. Remove background from emoji (client-side ML)
   */
  const startPipeline = useCallback(async (imageBase64: string): Promise<void> => {
    // Cancel any existing run
    cancel()

    // Start new run
    const runId = generateRunId()
    currentRunIdRef.current = runId
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    console.log('[Pipeline] Starting run:', runId)

    setState({
      step: 'identifying',
      error: null,
      result: null,
    })

    try {
      // Step 1: Identify product using GPT-4o Mini Vision
      console.log('[Pipeline] Step 1: Identifying product...')

      const identifyResponse = await fetch('/api/ai/identify-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
        signal,
      })

      if (!isRunActive(runId)) return

      const identifyResult = await identifyResponse.json()

      if (!identifyResult.success) {
        if (!isRunActive(runId)) return
        setState({
          step: 'error',
          error: identifyResult.error || 'Error al identificar el producto',
          result: null,
        })
        return
      }

      if (!isRunActive(runId)) return

      const productName = identifyResult.data.name
      console.log('[Pipeline] Product identified:', productName)

      // Step 2: Remove background from photo (client-side ML)
      if (!safeSetState(runId, { step: 'removing-bg-1' })) return

      console.log('[Pipeline] Step 2: Removing background from photo...')

      // Convert base64 to blob for background removal
      const photoResponse = await fetch(imageBase64)
      const photoBlob = await photoResponse.blob()

      if (!isRunActive(runId)) return

      // Run background removal - this CANNOT be cancelled, but results will be ignored if run is cancelled
      const bgRemovedBlob = await removeBackground(photoBlob, bgRemovalConfig)

      if (!isRunActive(runId)) {
        console.log('[Pipeline] Run cancelled during bg removal 1')
        return
      }

      console.log('[Pipeline] Background removed from photo')

      // Convert to base64 for API and caching
      const bgRemovedBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(bgRemovedBlob)
      })

      if (!isRunActive(runId)) return

      // Step 3: Generate emoji icon using GPT Image 1 Mini
      if (!safeSetState(runId, { step: 'generating' })) return

      console.log('[Pipeline] Step 3: Generating emoji...')

      const iconResponse = await fetch('/api/ai/generate-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: bgRemovedBase64 }),
        signal,
      })

      if (!isRunActive(runId)) return

      const iconResult = await iconResponse.json()

      if (!iconResult.success) {
        if (!isRunActive(runId)) return
        setState({
          step: 'error',
          error: iconResult.error || 'Error al generar el icono',
          result: null,
        })
        return
      }

      if (!isRunActive(runId)) return

      console.log('[Pipeline] Emoji generated')

      // Step 4: Remove background from generated icon
      if (!safeSetState(runId, { step: 'removing-bg-2' })) return

      console.log('[Pipeline] Step 4: Removing background from emoji...')

      const iconDataUrl = iconResult.data.icon
      const iconFetchResponse = await fetch(iconDataUrl)
      const iconBlob = await iconFetchResponse.blob()

      if (!isRunActive(runId)) return

      // Run background removal on icon
      const rawTransparentBlob = await removeBackground(iconBlob, bgRemovalConfig)

      if (!isRunActive(runId)) {
        console.log('[Pipeline] Run cancelled during bg removal 2')
        return
      }

      console.log('[Pipeline] Background removed from emoji')

      // Ensure blob has correct MIME type for PocketBase validation
      const rawBlob = new Blob([rawTransparentBlob], { type: 'image/png' })

      // Compress to fit PocketBase file size limit (500KB max, target 400KB)
      console.log(`[Pipeline] Raw icon size: ${rawBlob.size} bytes, compressing...`)
      const transparentIconBlob = await compressIconBlob(rawBlob)

      if (!isRunActive(runId)) return

      // Convert to base64 for preview
      const transparentIconBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(transparentIconBlob)
      })

      if (!isRunActive(runId)) return

      // Success!
      console.log('[Pipeline] Complete!')
      setState({
        step: 'complete',
        error: null,
        result: {
          name: productName,
          iconPreview: transparentIconBase64,
          iconBlob: transparentIconBlob,
          cachedBgRemoved: bgRemovedBase64,
        },
      })

    } catch (err) {
      // Check if this was an abort
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[Pipeline] Aborted via AbortController')
        // Don't set error state - the cancel() already reset state
        return
      }

      // Check if run was cancelled
      if (!isRunActive(runId)) {
        console.log('[Pipeline] Error occurred but run was cancelled')
        return
      }

      console.error('[Pipeline] Error:', err)
      setState({
        step: 'error',
        error: err instanceof Error ? err.message : 'Error al procesar la imagen',
        result: null,
      })
    }
  }, [cancel, isRunActive, safeSetState])

  /**
   * Regenerate just the icon using cached background-removed image.
   * This skips steps 1-2 and only runs steps 3-4.
   */
  const regenerateIcon = useCallback(async (cachedBgRemoved: string): Promise<PipelineResult | null> => {
    // Cancel any existing run
    cancel()

    // Start new run
    const runId = generateRunId()
    currentRunIdRef.current = runId
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    console.log('[Pipeline] Starting regeneration run:', runId)

    setState(prev => ({
      ...prev,
      step: 'generating',
      error: null,
    }))

    try {
      // Step 3: Generate new emoji
      console.log('[Pipeline] Regenerating emoji...')

      const iconResponse = await fetch('/api/ai/generate-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: cachedBgRemoved }),
        signal,
      })

      if (!isRunActive(runId)) return null

      const iconResult = await iconResponse.json()

      if (!iconResult.success) {
        if (!isRunActive(runId)) return null
        setState(prev => ({
          ...prev,
          step: 'error',
          error: iconResult.error || 'Error al regenerar el icono',
        }))
        return null
      }

      if (!isRunActive(runId)) return null

      // Step 4: Remove background from generated icon
      if (!safeSetState(runId, prev => ({ ...prev, step: 'removing-bg-2' }))) return null

      console.log('[Pipeline] Removing background from regenerated emoji...')

      const iconDataUrl = iconResult.data.icon
      const iconFetchResponse = await fetch(iconDataUrl)
      const iconBlob = await iconFetchResponse.blob()

      if (!isRunActive(runId)) return null

      const rawTransparentBlob = await removeBackground(iconBlob, bgRemovalConfig)

      if (!isRunActive(runId)) return null

      // Ensure blob has correct MIME type for PocketBase validation
      const rawBlob = new Blob([rawTransparentBlob], { type: 'image/png' })

      // Compress to fit PocketBase file size limit (500KB max, target 400KB)
      console.log(`[Pipeline] Raw regenerated icon size: ${rawBlob.size} bytes, compressing...`)
      const transparentIconBlob = await compressIconBlob(rawBlob)

      if (!isRunActive(runId)) return null

      const transparentIconBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(transparentIconBlob)
      })

      if (!isRunActive(runId)) return null

      const result: PipelineResult = {
        name: '', // Will use existing name
        iconPreview: transparentIconBase64,
        iconBlob: transparentIconBlob,
        cachedBgRemoved: cachedBgRemoved, // Keep the same cache
      }

      setState(prev => ({
        ...prev,
        step: 'complete',
        error: null,
        result: {
          ...result,
          name: prev.result?.name || '',
        },
      }))

      console.log('[Pipeline] Regeneration complete!')
      return result

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[Pipeline] Regeneration aborted via AbortController')
        return null
      }

      if (!isRunActive(runId)) return null

      console.error('[Pipeline] Regeneration error:', err)
      setState(prev => ({
        ...prev,
        step: 'error',
        error: err instanceof Error ? err.message : 'Error al regenerar el icono',
      }))
      return null
    }
  }, [cancel, isRunActive, safeSetState])

  return {
    state,
    startPipeline,
    regenerateIcon,
    cancel,
    reset,
  }
}
