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
import { useProductForm } from '@/contexts/product-form-context'
import { useProductNavRef, useEditProductCallbacks } from './ProductNavContext'
import { DeleteSuccessStep } from './DeleteSuccessStep'

export function DeleteConfirmStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { onDelete } = useEditProductCallbacks()
  const {
    editingProduct,
    isDeleting,
    setProductDeleted,
    setError,
    error,
  } = useProductForm()

  const handleDelete = async () => {
    if (!editingProduct) return
    setError('')
    try {
      const ok = await onDelete(editingProduct.id)
      if (ok) {
        setProductDeleted(true)
        navRef.current?.push(() => <DeleteSuccessStep />)
      } else {
        setError(t.formatMessage({ id: 'productForm.failed_to_delete' }))
        navRef.current?.pop()
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.formatMessage({ id: 'productForm.failed_to_delete' }),
      )
      navRef.current?.pop()
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
            {t.formatMessage({ id: 'productForm.title_delete_product' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p className="text-text-secondary">
          {t.formatMessage(
            { id: 'productForm.delete_confirm_text' },
            { name: editingProduct?.name ?? '' },
          )}
        </p>
        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mt-4">
            {error}
          </div>
        )}
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            <IonButton
              fill="outline"
              onClick={() => navRef.current?.pop()}
              disabled={isDeleting}
            >
              {t.formatMessage({ id: 'common.cancel' })}
            </IonButton>
            <IonButton
              color="danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.delete' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
