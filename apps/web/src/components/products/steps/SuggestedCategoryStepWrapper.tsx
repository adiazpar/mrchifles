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
  IonButton,
} from '@ionic/react'
import { useProductForm } from '@/contexts/product-form-context'
import { SuggestedCategoryStep } from '../SuggestedCategoryStep'
import { useProductNavRef, useAddProductCallbacks } from './ProductNavContext'
import { FormStep } from './FormStep'

export function SuggestedCategoryStepWrapper() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { suggestedCategoryName, categories, onCreateCategory } =
    useAddProductCallbacks()
  const { setCategoryId } = useProductForm()

  function goToForm() {
    navRef.current?.push(() => <FormStep />)
  }

  return (
    <IonPage>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.ai_step_new_category_title' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'productAddEdit.suggested_eyebrow' })}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: 'productAddEdit.suggested_title' },
                {
                  em: (chunks) => <em>{chunks}</em>,
                  name: suggestedCategoryName ?? '',
                },
              )}
            </h1>
          </header>

          <SuggestedCategoryStep
            suggestedName={suggestedCategoryName ?? ''}
            categories={categories}
            onCreate={async (newName) => {
              const newId = await onCreateCategory(newName)
              if (newId) {
                setCategoryId(newId)
                goToForm()
              }
              return newId
            }}
            onPickExisting={(id) => {
              setCategoryId(id)
              goToForm()
            }}
          />
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar className="ion-padding-horizontal">
          <IonButton
            fill="outline"
            expand="block"
            className="pm-ghost-btn"
            onClick={goToForm}
          >
            {t.formatMessage({ id: 'productForm.skip_for_now' })}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
