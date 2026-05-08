'use client'

import { useRef, useCallback } from 'react'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { ProductCategory } from '@kasero/shared/types'
import type { ProductFormData } from './ProductModal'
import {
  ProductNavRefContext,
  AddProductCallbacksContext,
  type AddProductCallbacks,
} from './steps/ProductNavContext'
import { AddEntryStep } from './steps/AddEntryStep'

// ============================================
// PROPS
// ============================================

export interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
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
}

// ============================================
// COMPONENT
// ============================================

export function AddProductModal({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  onSubmit,
  onAbortAiProcessing,
  onAiPhotoCapture,
  onOpenSettings,
  suggestedCategoryName,
  onCreateCategory,
  onStartAiPipeline,
  onClearPendingPhoto,
}: AddProductModalProps) {
  const navRef = useRef<HTMLIonNavElement>(null)

  const handleClose = useCallback(() => {
    onClose()
    onExitComplete()
  }, [onClose, onExitComplete])

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
    onStartAiPipeline,
    onClearPendingPhoto,
  }

  // Stable root thunk — useCallback with [] so IonNav never remounts the step
  // stack due to a new function reference produced on every parent render.
  const entryStepRoot = useCallback(() => <AddEntryStep />, [])

  return (
    <AddProductCallbacksContext.Provider value={callbacks}>
      <ProductNavRefContext.Provider value={navRef}>
        <ModalShell rawContent isOpen={isOpen} onClose={handleClose}>
          <IonNav ref={navRef} root={entryStepRoot} />
        </ModalShell>
      </ProductNavRefContext.Provider>
    </AddProductCallbacksContext.Provider>
  )
}
