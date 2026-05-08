import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
} from '@ionic/react'
import { Trash2, SlidersHorizontal } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { hapticSuccess } from '@/lib/haptics'
import { useProductForm, useProductFormValidation } from '@/contexts/product-form-context'
import { ProductForm } from '../ProductForm'
import { useProductNavRef, useEditProductCallbacks } from './ProductNavContext'
import { EditSuccessStep } from './EditSuccessStep'
import { AdjustInventoryStep } from './AdjustInventoryStep'
import { DeleteConfirmStep } from './DeleteConfirmStep'

export function EditFormStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { onClose, onExitComplete, categories, onSubmit, canDelete } = useEditProductCallbacks()
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
    error,
  } = useProductForm()
  const { isFormValid, hasChanges } = useProductFormValidation()

  function handleCancel() {
    onClose()
    onExitComplete()
  }

  const handleSave = async () => {
    setError('')
    setIsSaving(true)
    setProductSaved(false)

    try {
      const success = await onSubmit(
        {
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
        },
        editingProduct?.id || null,
      )

      if (!success) {
        setError(t.formatMessage({ id: 'productForm.failed_to_save' }))
        return
      }

      setProductSaved(true)
      hapticSuccess()
      navRef.current?.push(() => <EditSuccessStep />)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.formatMessage({ id: 'productForm.failed_to_save' }),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.title_edit' })}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleCancel}>
              {t.formatMessage({ id: 'common.cancel' })}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">
            {error}
          </div>
        )}
        <ProductForm categories={categories} idPrefix="edit" isOpen={true} />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => navRef.current?.push(() => <DeleteConfirmStep />)}
                className="btn btn-secondary btn-icon"
                aria-label={t.formatMessage({ id: 'productForm.title_delete_product' })}
              >
                <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
              </button>
            )}
            <button
              type="button"
              onClick={() => navRef.current?.push(() => <AdjustInventoryStep />)}
              className="btn btn-secondary btn-icon"
              aria-label={t.formatMessage({ id: 'productForm.title_adjust_inventory' })}
            >
              <SlidersHorizontal className="text-brand" style={{ width: 16, height: 16 }} />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary flex-1"
              disabled={isSaving || !isFormValid || !hasChanges}
            >
              {isSaving ? <Spinner /> : t.formatMessage({ id: 'common.save' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
