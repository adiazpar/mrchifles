import { createContext, useContext } from 'react'
import type { Product, ProductCategory } from '@kasero/shared/types'
import type { ProductFormData, StockAdjustmentData } from '../ProductModal'

// ---------------------------------------------------------------------------
// Nav ref context — steps call navRef.current?.push / .pop to navigate.
// ---------------------------------------------------------------------------

export const ProductNavRefContext = createContext<React.RefObject<HTMLIonNavElement | null> | null>(null)

export function useProductNavRef(): React.RefObject<HTMLIonNavElement | null> {
  const ctx = useContext(ProductNavRefContext)
  if (!ctx) throw new Error('useProductNavRef must be used inside AddProductModal or EditProductModal')
  return ctx
}

// ---------------------------------------------------------------------------
// Shared modal callbacks context — steps call close / exitComplete.
// ---------------------------------------------------------------------------

export interface ProductModalCallbacks {
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  /** Returns the saved Product on success (with productNumber, updatedAt,
   *  etc. populated by the server) or null on validation/network failure.
   *  Step components capture the return value so the success step can
   *  render the per-business sequential stamp. */
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<Product | null>
}

export interface AddProductCallbacks extends ProductModalCallbacks {
  onAbortAiProcessing: () => void
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onOpenSettings: () => void
  suggestedCategoryName: string | null
  onCreateCategory: (name: string) => Promise<string | null>
  onStartAiPipeline: () => void
  onClearPendingPhoto: () => void
}

export interface EditProductCallbacks extends ProductModalCallbacks {
  onDelete: (productId: string) => Promise<boolean>
  /** PATCH product.active inline (no review-then-save). Returns true on
   *  success so the toggle step can revert its optimistic flip and surface
   *  an inline error on false. The caller (ProductsView) handles the
   *  optimistic mutation of the shared products array. */
  onToggleActive: (productId: string, nextActive: boolean) => Promise<boolean>
  onSaveAdjustment: (data: StockAdjustmentData) => Promise<void>
  canDelete: boolean
}

export const AddProductCallbacksContext = createContext<AddProductCallbacks | null>(null)

export function useAddProductCallbacks(): AddProductCallbacks {
  const ctx = useContext(AddProductCallbacksContext)
  if (!ctx) throw new Error('useAddProductCallbacks must be used inside AddProductModal')
  return ctx
}

export const EditProductCallbacksContext = createContext<EditProductCallbacks | null>(null)

export function useEditProductCallbacks(): EditProductCallbacks {
  const ctx = useContext(EditProductCallbacksContext)
  if (!ctx) throw new Error('useEditProductCallbacks must be used inside EditProductModal')
  return ctx
}
