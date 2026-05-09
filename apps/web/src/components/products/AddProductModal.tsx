'use client'

import { useRef, useCallback, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { Product, ProductCategory } from '@kasero/shared/types'
import type { ProductFormData } from './ProductModal'
import {
  ProductFormProvider,
  useProductForm,
} from '@/contexts/product-form-context'
import {
  ProductNavRefContext,
  AddProductCallbacksContext,
  type AddProductCallbacks,
} from './steps/ProductNavContext'
import { AddEntryStep } from './steps/AddEntryStep'
import type { PipelineStep } from '@/hooks'

export interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<Product | null>
  onAbortAiProcessing: () => void
  onPipelineReset: () => void
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onOpenSettings: () => void
  /** AI suggested category name when no existing category fits (null otherwise) */
  suggestedCategoryName: string | null
  /** Create a new category. Returns the new id or null on failure. */
  onCreateCategory: (name: string) => Promise<string | null>
  /** Start the AI pipeline using the previously stashed image */
  onStartAiPipeline: () => void
  /** Clear the previously stashed AI photo (called when user re-enters step 1) */
  onClearPendingPhoto: () => void
  /** Pre-check whether a barcode is already taken before kicking off
   *  the AI pipeline. The check is done inside the modal because the
   *  barcode field lives in the form context (which lives inside the
   *  modal in this architecture). */
  checkBarcodeExists: (barcode: string) => Promise<string | null>
  /** Default category ID for the form's initial state. */
  defaultCategoryId?: string | null
  /** AI pipeline state — mirrored into form context via useEffect inside
   *  the modal (must be inside the provider). */
  pipelineState: {
    step: PipelineStep
    result?: {
      name: string
      categoryId: string | null
      suggestedNewCategoryName: string | null
      iconPreview: string
      iconBlob: Blob
    } | null
    error?: string | null
  }
  isCompressing: boolean
}

/**
 * Outer wrapper that mounts ProductFormProvider INSIDE the modal so it
 * wraps IonNav directly. Every step pushed via navRef.push lives inside
 * this provider's React subtree, which guarantees `useProductForm()`
 * resolves to the same provider instance for every step regardless of
 * any IonNav / IonModal portal boundary semantics. (When the provider
 * was mounted at the ProductsView level, fields the user typed into
 * NameStep/PriceStep/etc. weren't reaching ReviewStep — symptom was
 * blank values on the Review surface despite the user having typed
 * them. Mounting the provider inside the modal fixes that propagation.)
 */
export function AddProductModal(props: AddProductModalProps) {
  return (
    <ProductFormProvider defaultCategoryId={props.defaultCategoryId}>
      <AddProductModalInner {...props} />
    </ProductFormProvider>
  )
}

function AddProductModalInner({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  pipelineState,
  isCompressing,
  onSubmit,
  onAbortAiProcessing,
  onAiPhotoCapture,
  onOpenSettings,
  suggestedCategoryName,
  onCreateCategory,
  onStartAiPipeline,
  onClearPendingPhoto,
  checkBarcodeExists,
  defaultCategoryId,
}: AddProductModalProps) {
  const tProductForm = useIntl()
  const navRef = useRef<HTMLIonNavElement>(null)
  const {
    barcode,
    setName,
    setCategoryId,
    setIconPreview,
    setGeneratedIconBlob,
    setIconType,
    setPresetEmoji,
    setError,
    setPipelineStep,
    setIsCompressing,
    resetForm,
  } = useProductForm()

  // Wrap onStartAiPipeline with a barcode-uniqueness pre-check. Reads
  // `barcode` from form context (which is why this lives inside the
  // modal — provider is mounted right above).
  const startAiPipelineWithBarcodeCheck = useCallback(async () => {
    setError('')
    const trimmed = barcode.trim()
    if (trimmed) {
      const existingName = await checkBarcodeExists(trimmed)
      if (existingName) {
        setError(
          tProductForm.formatMessage(
            { id: 'productForm.barcode_already_used' },
            { name: existingName },
          ),
        )
        return
      }
    }
    onStartAiPipeline()
  }, [barcode, checkBarcodeExists, onStartAiPipeline, setError, tProductForm])

  // Sync pipeline state → form context. The wrapper used to do this
  // at the ProductsView level, but the provider lives inside the modal
  // now so the sync has to live here too.
  useEffect(() => {
    setPipelineStep(pipelineState.step)
  }, [pipelineState.step, setPipelineStep])

  useEffect(() => {
    setIsCompressing(isCompressing)
  }, [isCompressing, setIsCompressing])

  useEffect(() => {
    if (pipelineState.step === 'complete' && pipelineState.result) {
      const result = pipelineState.result
      setName(result.name)
      if (result.categoryId) {
        setCategoryId(result.categoryId)
      }
      setGeneratedIconBlob(result.iconBlob)
      setIconPreview(result.iconPreview)
      setIconType('custom')
      setPresetEmoji(null)
    }
  }, [
    pipelineState.step,
    pipelineState.result,
    setName,
    setCategoryId,
    setGeneratedIconBlob,
    setIconPreview,
    setIconType,
    setPresetEmoji,
  ])

  useEffect(() => {
    if (pipelineState.step === 'error' && pipelineState.error) {
      setError(pipelineState.error)
    }
  }, [pipelineState.step, pipelineState.error, setError])

  // Delayed cleanup — runs ~250ms after the modal animates closed so we
  // don't mutate state mid-animation (which would re-render IonNav
  // children and corrupt the IonRouterOutlet view-stack reference).
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(() => {
      resetForm(defaultCategoryId)
      onExitComplete()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, resetForm, defaultCategoryId, onExitComplete])

  const callbacks: AddProductCallbacks = {
    onClose,
    onExitComplete,
    categories,
    onSubmit,
    onAbortAiProcessing,
    onAiPhotoCapture,
    onOpenSettings,
    suggestedCategoryName,
    onCreateCategory,
    onStartAiPipeline: startAiPipelineWithBarcodeCheck,
    onClearPendingPhoto,
  }

  // Stable root thunk — useCallback with [] so IonNav never remounts the
  // step stack due to a new function reference on every parent render.
  const entryStepRoot = useCallback(() => <AddEntryStep />, [])

  return (
    <AddProductCallbacksContext.Provider value={callbacks}>
      <ProductNavRefContext.Provider value={navRef}>
        <ModalShell rawContent isOpen={isOpen} onClose={onClose}>
          <IonNav ref={navRef} root={entryStepRoot} swipeGesture={false} />
        </ModalShell>
      </ProductNavRefContext.Provider>
    </AddProductCallbacksContext.Provider>
  )
}
