'use client'

import { useRef, useCallback } from 'react'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { Product, ProductCategory } from '@kasero/shared/types'
import type { ProductFormData, StockAdjustmentData } from './ProductModal'
import {
  ProductNavRefContext,
  EditProductCallbacksContext,
  type EditProductCallbacks,
} from './steps/ProductNavContext'
import { ReviewStep } from './steps/ReviewStep'
import { AdjustInventoryStep } from './steps/AdjustInventoryStep'

// ============================================
// PROPS
// ============================================

export interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<Product | null>
  onDelete: (productId: string) => Promise<boolean>
  onSaveAdjustment: (data: StockAdjustmentData) => Promise<void>
  canDelete: boolean
  /** Step the modal opens to. Defaults to 0 (Edit form). Use 1 to open at "Adjust inventory". */
  initialStep?: number
}

// ============================================
// COMPONENT
// ============================================

export function EditProductModal({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  onSubmit,
  onDelete,
  onSaveAdjustment,
  canDelete,
  initialStep = 0,
}: EditProductModalProps) {
  const navRef = useRef<HTMLIonNavElement>(null)

  // X-click only flips the parent's isOpen state — see AddProductModal for
  // the matching diagnosis. onExitComplete is fired by the wrapper after
  // a post-animation delay.
  const handleClose = onClose

  const callbacks: EditProductCallbacks = {
    onClose,
    onExitComplete,
    categories,
    onSubmit,
    onDelete,
    onSaveAdjustment,
    canDelete,
  }

  // Stable root thunks — useCallback with [] so IonNav never remounts the
  // step stack due to a new function reference on every parent render.
  // IonNav expects a function returning JSX (not a component reference);
  // passing the constructor directly mounts as undefined.
  //
  // Edit flow lands at ReviewStep by default — the user sees the existing
  // product as a summary card and taps any field row to revise. The
  // legacy initialStep === 1 (deep-link to AdjustInventoryStep, fired
  // from the row's Inventory swipe action) bypasses Review entirely.
  const adjustStepRoot = useCallback(() => <AdjustInventoryStep />, [])
  const reviewStepRoot = useCallback(() => <ReviewStep />, [])
  const rootComponent = initialStep === 1 ? adjustStepRoot : reviewStepRoot

  return (
    <EditProductCallbacksContext.Provider value={callbacks}>
      <ProductNavRefContext.Provider value={navRef}>
        <ModalShell rawContent isOpen={isOpen} onClose={handleClose}>
          <IonNav ref={navRef} root={rootComponent} swipeGesture={false} />
        </ModalShell>
      </ProductNavRefContext.Provider>
    </EditProductCallbacksContext.Provider>
  )
}
