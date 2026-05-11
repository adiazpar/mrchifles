'use client'

import { useRef, useCallback, useEffect } from 'react'
import { IonNav } from '@ionic/react'
import { ModalShell } from '@/components/ui'
import type { Product, ProductCategory } from '@kasero/shared/types'
import type { ProductFormData, StockAdjustmentData } from './ProductModal'
import {
  ProductFormProvider,
  useProductForm,
} from '@/contexts/product-form-context'
import { getProductIconUrl } from '@/lib/utils'
import {
  ProductNavRefContext,
  EditProductCallbacksContext,
  type EditProductCallbacks,
} from './steps/ProductNavContext'
import { ReviewStep } from './steps/ReviewStep'
import { AdjustInventoryStep } from './steps/AdjustInventoryStep'

export interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  /** The product to edit. Must be present when the modal opens. */
  editingProduct: Product | null
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<Product | null>
  onDelete: (productId: string) => Promise<boolean>
  onToggleActive: (productId: string, nextActive: boolean) => Promise<boolean>
  onSaveAdjustment: (data: StockAdjustmentData) => Promise<void>
  canDelete: boolean
  /** Default category for resetForm (after modal closes). */
  defaultCategoryId?: string | null
  /** Step the modal opens to. Defaults to 0 (Review). Use 1 to open at "Adjust inventory". */
  initialStep?: number
}

/**
 * Outer wrapper that mounts ProductFormProvider INSIDE the modal so it
 * wraps IonNav directly. See the comment on AddProductModal for the
 * propagation problem this fixes.
 */
export function EditProductModal(props: EditProductModalProps) {
  return (
    <ProductFormProvider defaultCategoryId={props.defaultCategoryId}>
      <EditProductModalInner {...props} />
    </ProductFormProvider>
  )
}

function EditProductModalInner({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  editingProduct,
  onSubmit,
  onDelete,
  onToggleActive,
  onSaveAdjustment,
  canDelete,
  defaultCategoryId,
  initialStep = 0,
}: EditProductModalProps) {
  const navRef = useRef<HTMLIonNavElement>(null)
  const { populateFromProduct, resetForm } = useProductForm()

  // Populate form context when the modal opens with a product.
  useEffect(() => {
    if (isOpen && editingProduct) {
      populateFromProduct(editingProduct, getProductIconUrl)
    }
  }, [isOpen, editingProduct, populateFromProduct])

  // Delayed cleanup — same pattern as AddProductModal's. Mid-animation
  // state mutation breaks the IonRouterOutlet view-stack reference,
  // causing leftward tab switches to fail after modal close.
  useEffect(() => {
    if (isOpen) return
    const timer = window.setTimeout(() => {
      resetForm(defaultCategoryId)
      onExitComplete()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [isOpen, resetForm, defaultCategoryId, onExitComplete])

  const callbacks: EditProductCallbacks = {
    onClose,
    onExitComplete,
    categories,
    onSubmit,
    onDelete,
    onToggleActive,
    onSaveAdjustment,
    canDelete,
  }

  // Stable root thunks — IonNav expects a function returning JSX (not a
  // component reference); passing the constructor directly mounts as
  // undefined. useCallback with empty deps so the thunks stay stable
  // across parent re-renders.
  const adjustStepRoot = useCallback(() => <AdjustInventoryStep />, [])
  const reviewStepRoot = useCallback(() => <ReviewStep />, [])
  const rootComponent = initialStep === 1 ? adjustStepRoot : reviewStepRoot

  return (
    <EditProductCallbacksContext.Provider value={callbacks}>
      <ProductNavRefContext.Provider value={navRef}>
        <ModalShell rawContent isOpen={isOpen} onClose={onClose}>
          <IonNav ref={navRef} root={rootComponent} swipeGesture={false} />
        </ModalShell>
      </ProductNavRefContext.Provider>
    </EditProductCallbacksContext.Provider>
  )
}
