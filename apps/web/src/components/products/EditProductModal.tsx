'use client'

import { useRef, useCallback } from 'react'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { ProductCategory } from '@kasero/shared/types'
import type { ProductFormData, StockAdjustmentData } from './ProductModal'
import {
  ProductNavRefContext,
  EditProductCallbacksContext,
  type EditProductCallbacks,
} from './steps/ProductNavContext'
import { EditFormStep } from './steps/EditFormStep'
import { AdjustInventoryStep } from './steps/AdjustInventoryStep'

// ============================================
// PROPS
// ============================================

export interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
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

  const handleClose = useCallback(() => {
    onClose()
    onExitComplete()
  }, [onClose, onExitComplete])

  const callbacks: EditProductCallbacks = {
    onClose,
    onExitComplete,
    categories,
    onSubmit,
    onDelete,
    onSaveAdjustment,
    canDelete,
  }

  // When initialStep is 1, start at AdjustInventoryStep directly.
  const rootComponent =
    initialStep === 1
      ? () => <AdjustInventoryStep />
      : () => <EditFormStep />

  return (
    <EditProductCallbacksContext.Provider value={callbacks}>
      <ProductNavRefContext.Provider value={navRef}>
        <ModalShell rawContent isOpen={isOpen} onClose={handleClose}>
          <IonNav ref={navRef} root={rootComponent} />
        </ModalShell>
      </ProductNavRefContext.Provider>
    </EditProductCallbacksContext.Provider>
  )
}
