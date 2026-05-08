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
} from '@ionic/react'
import { useProductForm } from '@/contexts/product-form-context'
import { SuggestedCategoryStep } from '../SuggestedCategoryStep'
import { useProductNavRef, useAddProductCallbacks } from './ProductNavContext'
import { FormStep } from './FormStep'

export function SuggestedCategoryStepWrapper() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { suggestedCategoryName, categories, onCreateCategory } = useAddProductCallbacks()
  const { setCategoryId } = useProductForm()

  function goToForm() {
    navRef.current?.push(() => <FormStep />)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.ai_step_new_category_title' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
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
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <button
            type="button"
            onClick={goToForm}
            className="btn btn-secondary w-full"
          >
            {t.formatMessage({ id: 'productForm.skip_for_now' })}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
