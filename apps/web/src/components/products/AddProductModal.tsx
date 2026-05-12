'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { ModalShell } from '@/components/ui'
import type { Product, ProductCategory } from '@kasero/shared/types'
import type { ProductFormData } from './ProductModal'
import {
  ProductFormProvider,
  useProductForm,
} from '@/contexts/product-form-context'
import {
  AddProductNavContext,
  AddProductCallbacksContext,
  type AddProductCallbacks,
  type ProductNav,
} from './steps/ProductNavContext'
import { AddEntryStep } from './steps/AddEntryStep'
import { AiPhotoStep } from './steps/AiPhotoStep'
import { AiBarcodeStep } from './steps/AiBarcodeStep'
import { AnalyzingStep } from './steps/AnalyzingStep'
import { SuggestedCategoryStepWrapper } from './steps/SuggestedCategoryStepWrapper'
import { NameStep } from './steps/NameStep'
import { PriceStep } from './steps/PriceStep'
import { CategoryStockStep } from './steps/CategoryStockStep'
import { BarcodeStep } from './steps/BarcodeStep'
import { ReviewStep } from './steps/ReviewStep'
import { AddSuccessStep } from './steps/AddSuccessStep'
import type { PipelineStep } from '@/hooks'

// Each entry in the step stack identifies which step body to render. Forward
// chain (manual entry) and edit jumps (from Review) use distinct -forward /
// -edit suffixes so each shared step knows whether its CTA pushes forward in
// the chain or pops back to Review.
type Step =
  | 'entry'
  | 'ai-photo'
  | 'ai-barcode'
  | 'analyzing'
  | 'suggested-category'
  | 'name-forward'
  | 'price-forward'
  | 'category-stock-forward'
  | 'barcode-forward'
  | 'review'
  | 'name-edit'
  | 'price-edit'
  | 'category-stock-edit'
  | 'barcode-edit'
  | 'add-success'

const INITIAL_STACK: Step[] = ['entry']

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
 * wraps the step subtree directly. Every step rendered by the state-driven
 * stack below lives inside this provider's React subtree, so
 * `useProductForm()` resolves to the same provider instance for every step
 * regardless of IonModal portal boundaries. (When the provider was mounted
 * at the ProductsView level, fields the user typed into NameStep/PriceStep
 * weren't reaching ReviewStep — symptom was blank values on the Review
 * surface despite the user having typed them. Mounting the provider
 * inside the modal fixes that propagation.)
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
  const [stack, setStack] = useState<Step[]>(INITIAL_STACK)
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

  // Reset to the entry step every time the modal opens. The same modal
  // component is reused across consecutive add flows.
  useEffect(() => {
    if (isOpen) setStack(INITIAL_STACK)
  }, [isOpen])

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

  // Delayed form reset — runs ~250ms after the modal animates closed so
  // the parent's onExitComplete (clears editingProduct etc.) and our
  // resetForm don't race the dismiss animation. Pattern matches NewOrderModal.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(() => {
      resetForm(defaultCategoryId)
      onExitComplete()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, resetForm, defaultCategoryId, onExitComplete])

  const push = useCallback((step: string) => {
    setStack((s) => [...s, step as Step])
  }, [])
  const pop = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s))
  }, [])

  const nav: ProductNav = useMemo(
    () => ({ push, pop, depth: stack.length }),
    [push, pop, stack.length],
  )

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

  const current = stack[stack.length - 1]

  return (
    <AddProductCallbacksContext.Provider value={callbacks}>
      <AddProductNavContext.Provider value={nav}>
        <ModalShell rawContent isOpen={isOpen} onClose={onClose}>
          {current === 'entry' && <AddEntryStep />}
          {current === 'ai-photo' && <AiPhotoStep />}
          {current === 'ai-barcode' && <AiBarcodeStep />}
          {current === 'analyzing' && <AnalyzingStep />}
          {current === 'suggested-category' && <SuggestedCategoryStepWrapper />}
          {current === 'name-forward' && <NameStep mode="forward" />}
          {current === 'price-forward' && <PriceStep mode="forward" />}
          {current === 'category-stock-forward' && <CategoryStockStep mode="forward" />}
          {current === 'barcode-forward' && <BarcodeStep mode="forward" />}
          {current === 'review' && <ReviewStep />}
          {current === 'name-edit' && <NameStep mode="edit" />}
          {current === 'price-edit' && <PriceStep mode="edit" />}
          {current === 'category-stock-edit' && <CategoryStockStep mode="edit" />}
          {current === 'barcode-edit' && <BarcodeStep mode="edit" />}
          {current === 'add-success' && <AddSuccessStep />}
        </ModalShell>
      </AddProductNavContext.Provider>
    </AddProductCallbacksContext.Provider>
  )
}
