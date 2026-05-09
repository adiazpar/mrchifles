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
  IonButton,
} from '@ionic/react'
import { hapticSuccess } from '@/lib/haptics'
import {
  useProductForm,
  useProductFormValidation,
} from '@/contexts/product-form-context'
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
    setLastSavedProductNumber,
    error,
  } = useProductForm()
  const { isFormValid, hasChanges } = useProductFormValidation()

  const handleSave = async () => {
    setError('')
    setIsSaving(true)
    setProductSaved(false)

    try {
      const saved = await onSubmit(
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

      if (!saved) {
        setError(t.formatMessage({ id: 'productForm.failed_to_save' }))
        return
      }

      setProductSaved(true)
      setLastSavedProductNumber(saved.productNumber ?? null)
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
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.title_add' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'productAddEdit.form_add_eyebrow' })}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: 'productAddEdit.form_add_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
          </header>

          {error && <div className="pm-error">{error}</div>}

          <ProductForm categories={categories} idPrefix="add" isOpen={true} />
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar className="ion-padding-horizontal">
          <IonButton
            expand="block"
            onClick={handleSave}
            disabled={isSaving || !isFormValid || !hasChanges}
          >
            {isSaving ? (
              <IonSpinner name="crescent" />
            ) : (
              t.formatMessage({ id: 'productAddEdit.add_product_cta' })
            )}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
