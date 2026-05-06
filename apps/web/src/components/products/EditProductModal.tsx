'use client'

import Image from '@/lib/Image'

import { useTranslations } from 'next-intl'
import { Trash2, SlidersHorizontal, ImagePlus } from 'lucide-react'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { Spinner, Modal, useModal, StockStepper } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { hapticSuccess } from '@/lib/haptics'
import { useProductForm, useProductFormValidation } from '@/contexts/product-form-context'
import { ProductForm } from './ProductForm'
import type { ProductCategory } from '@kasero/shared/types'
import type { ProductFormData, StockAdjustmentData } from './ProductModal'

// ============================================
// PRESET ICONS
// ============================================

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
// DELETE BUTTON
// ============================================

function DeleteButton({ onConfirm, isDeleting }: { onConfirm: () => Promise<boolean>; isDeleting: boolean }) {
  const t = useTranslations('productForm')
  const tCommon = useTranslations('common')
  const { setProductDeleted, setError } = useProductForm()
  const { goToStep } = useModal()

  // Delete can fail with a 409 when the product is in a pending order, so we
  // wait for the response before navigating to the success step. If it fails,
  // go back to the edit step where the error message is visible.
  const handleClick = async () => {
    setError('')
    try {
      const ok = await onConfirm()
      if (ok) {
        setProductDeleted(true)
        goToStep(3)
      } else {
        setError(t('failed_to_delete'))
        goToStep(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed_to_delete'))
      goToStep(0)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-danger flex-1"
      disabled={isDeleting}
    >
      {isDeleting ? <Spinner /> : tCommon('delete')}
    </button>
  )
}

// ============================================
// SAVE BUTTON
// ============================================

function SaveButton({ onSubmit }: { onSubmit: EditProductModalProps['onSubmit'] }) {
  const t = useTranslations('productForm')
  const tCommon = useTranslations('common')
  const {
    name,
    price,
    categoryId,
    active,
    generatedIconBlob,
    iconType,
    presetEmoji: formPresetEmoji,
    barcode,
    barcodeFormat,
    barcodeSource,
    editingProduct,
    isSaving,
    setIsSaving,
    setError,
    setProductSaved,
  } = useProductForm()
  const { isFormValid, hasChanges } = useProductFormValidation()
  const { goToStep } = useModal()

  const handleClick = async () => {
    setError('')
    setIsSaving(true)
    setProductSaved(false)

    try {
      const success = await onSubmit(
        { name, price, categoryId, active, generatedIconBlob, iconType, presetEmoji: formPresetEmoji, barcode, barcodeFormat, barcodeSource },
        editingProduct?.id || null
      )

      if (!success) {
        setError(t('failed_to_save'))
        return
      }

      setProductSaved(true)
      hapticSuccess()
      goToStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed_to_save'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={isSaving || !isFormValid || !hasChanges}
    >
      {isSaving ? <Spinner /> : tCommon('save')}
    </button>
  )
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
  const t = useTranslations('productForm')
  const tCommon = useTranslations('common')
  const {
    iconPreview,
    editingProduct,
    newStockValue,
    setNewStockValue,
    isAdjusting,
    isDeleting,
    error,
    productSaved,
    productDeleted,
  } = useProductForm()

  const handleDelete = async (): Promise<boolean> => {
    if (!editingProduct) return false
    return onDelete(editingProduct.id)
  }

  const handleSaveAdjustment = async (): Promise<void> => {
    if (!editingProduct) return
    return onSaveAdjustment({
      productId: editingProduct.id,
      newStockValue,
      // Snapshot of stock at the moment the modal opened. The server
      // refuses the write if the row changed since (optimistic lock).
      expectedStockValue: editingProduct.stock ?? 0,
    })
  }

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={t('title_edit')}
      initialStep={initialStep}
    >
      {/* Step 0: Edit Form */}
      <Modal.Step title={t('title_edit')}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <ProductForm
            categories={categories}
            idPrefix="edit"
            isOpen={isOpen}
          />
        </Modal.Item>

        <Modal.Footer>
          {canDelete && (
            <Modal.GoToStepButton step={2} className="btn btn-secondary btn-icon">
              <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
            </Modal.GoToStepButton>
          )}
          <Modal.GoToStepButton step={1} className="btn btn-secondary btn-icon">
            <SlidersHorizontal className="text-brand" style={{ width: 16, height: 16 }} />
          </Modal.GoToStepButton>
          <SaveButton onSubmit={onSubmit} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Adjust inventory */}
      <Modal.Step title={t('title_adjust_inventory')} backStep={0}>
        {editingProduct && (
          <Modal.Item>
            <div className="flex flex-col items-center py-6">
              <div className="w-56 h-56 rounded-3xl overflow-hidden flex items-center justify-center bg-bg-muted">
                {iconPreview && isPresetIcon(iconPreview) ? (
                  (() => { const p = getPresetIcon(iconPreview); return p ? <p.icon size={120} className="text-text-primary" /> : null })()
                ) : iconPreview ? (
                  <Image
                    src={iconPreview}
                    alt={editingProduct.name}
                    width={224}
                    height={224}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <ImagePlus className="w-20 h-20 text-text-tertiary" />
                )}
              </div>
              <div className="font-medium text-lg mt-4">{editingProduct.name}</div>
            </div>
          </Modal.Item>
        )}

        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <StockStepper
            value={newStockValue}
            onChange={setNewStockValue}
          />
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton className="btn btn-secondary flex-1" disabled={isAdjusting}>
            {tCommon('cancel')}
          </Modal.CancelBackButton>
          <button
            type="button"
            onClick={handleSaveAdjustment}
            className="btn btn-primary flex-1"
            disabled={isAdjusting || newStockValue === (editingProduct?.stock ?? 0)}
          >
            {isAdjusting ? <Spinner /> : tCommon('save')}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: Delete confirmation */}
      <Modal.Step title={t('title_delete_product')} backStep={0}>
        <Modal.Item>
          <p className="text-text-secondary">
            {t('delete_confirm_text', { name: editingProduct?.name ?? '' })}
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1" disabled={isDeleting}>
            {tCommon('cancel')}
          </Modal.GoToStepButton>
          <DeleteButton onConfirm={handleDelete} isDeleting={isDeleting} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Delete success */}
      <Modal.Step title={t('title_deleted')} hideBackButton className="modal-step--centered">
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {productDeleted && (
                <LottiePlayer
                  src="/animations/error.json"
                  loop={false}
                  autoplay={true}
                  delay={300}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
              style={{ opacity: productDeleted ? 1 : 0 }}
            >
              {t('success_deleted_heading')}
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
              style={{ opacity: productDeleted ? 1 : 0 }}
            >
              {t('success_deleted_description')}
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Save success */}
      <Modal.Step title={t('title_updated')} hideBackButton className="modal-step--centered">
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {productSaved && (
                <LottiePlayer
                  src="/animations/success.json"
                  loop={false}
                  autoplay={true}
                  delay={300}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              {t('success_updated_heading')}
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              {t('success_updated_description')}
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>

  </>
  )
}
