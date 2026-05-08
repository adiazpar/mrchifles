import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonSpinner,
} from '@ionic/react'
import { hapticSuccess } from '@/lib/haptics'
import { useProductForm, useProductFormValidation } from '@/contexts/product-form-context'
import { ProductForm } from '../ProductForm'
import { useProductNavRef, useAddProductCallbacks } from './ProductNavContext'
import { AddSuccessStep } from './AddSuccessStep'

/**
 * Form step for AddProductModal.
 * Pushed from AddEntryStep (manual path) or AnalyzingStep / SuggestedCategoryStepWrapper (AI path).
 */
export function FormStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { categories, onSubmit } = useAddProductCallbacks()
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
    isSaving,
    setIsSaving,
    setError,
    setProductSaved,
    error,
  } = useProductForm()
  const { isFormValid, hasChanges } = useProductFormValidation()

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
        null,
      )

      if (!success) {
        setError(t.formatMessage({ id: 'productForm.failed_to_save' }))
        return
      }

      setProductSaved(true)
      hapticSuccess()
      navRef.current?.push(() => <AddSuccessStep />)
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
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.title_add' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">
            {error}
          </div>
        )}
        <ProductForm categories={categories} idPrefix="add" isOpen={true} />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary w-full"
            disabled={isSaving || !isFormValid || !hasChanges}
          >
            {isSaving ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.save' })}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
