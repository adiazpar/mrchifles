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
  IonIcon,
  IonSpinner,
  IonButton,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { useProductForm } from '@/contexts/product-form-context'
import { useProductNavRef, useEditProductCallbacks } from './ProductNavContext'
import { DeleteSuccessStep } from './DeleteSuccessStep'

export function DeleteConfirmStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { onDelete, onClose } = useEditProductCallbacks()
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
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={onClose} aria-label={t.formatMessage({ id: 'common.close' })}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
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
        <IonToolbar>
          {/* Toolbar back returns to the previous step; toolbar X (when
              this step is the only one in the stack) dismisses. Footer
              is the destructive primary only. */}
          <div className="modal-footer">
            <IonButton color="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.delete' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
