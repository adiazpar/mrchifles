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
  IonIcon,
  IonSpinner,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { Trash2, SlidersHorizontal } from 'lucide-react'
import { hapticSuccess } from '@/lib/haptics'
import {
  useProductForm,
  useProductFormValidation,
} from '@/contexts/product-form-context'
import { ProductForm } from '../ProductForm'
import { useProductNavRef, useEditProductCallbacks } from './ProductNavContext'
import { EditSuccessStep } from './EditSuccessStep'
import { AdjustInventoryStep } from './AdjustInventoryStep'
import { DeleteConfirmStep } from './DeleteConfirmStep'

export function EditFormStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { onClose, onExitComplete, categories, onSubmit, canDelete } =
    useEditProductCallbacks()
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
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.title_edit' })}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={handleCancel}
              aria-label={t.formatMessage({ id: 'common.close' })}
            >
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'productAddEdit.form_edit_eyebrow' })}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: 'productAddEdit.form_edit_title' },
                {
                  em: (chunks) => <em>{chunks}</em>,
                  name: editingProduct?.name ?? '',
                },
              )}
            </h1>
          </header>

          {error && <div className="pm-error">{error}</div>}

          <ProductForm categories={categories} idPrefix="edit" isOpen={true} />
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            {canDelete && (
              <IonButton
                fill="outline"
                shape="round"
                className="pm-icon-btn"
                onClick={() =>
                  navRef.current?.push(() => <DeleteConfirmStep />)
                }
                aria-label={t.formatMessage({
                  id: 'productForm.title_delete_product',
                })}
              >
                <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
              </IonButton>
            )}
            <IonButton
              fill="outline"
              shape="round"
              className="pm-icon-btn"
              onClick={() =>
                navRef.current?.push(() => <AdjustInventoryStep />)
              }
              aria-label={t.formatMessage({
                id: 'productForm.title_adjust_inventory',
              })}
            >
              <SlidersHorizontal
                className="text-brand"
                style={{ width: 16, height: 16 }}
              />
            </IonButton>
            <IonButton
              onClick={handleSave}
              disabled={isSaving || !isFormValid || !hasChanges}
            >
              {isSaving ? (
                <IonSpinner name="crescent" />
              ) : (
                t.formatMessage({ id: 'common.save' })
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
