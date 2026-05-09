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
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNavRef, useOrderDetailCallbacks } from './OrderNavContext'
import { DeleteOrderSuccessStep } from './DeleteOrderSuccessStep'

export function DeleteOrderConfirmStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const { formatDate } = useBusinessFormat()
  const {
    order,
    isDeleting,
    onDeleteOrder,
    onClose,
    openedFromSwipe,
  } = useOrderDetailCallbacks()

  const handleDelete = async () => {
    const success = await onDeleteOrder()
    if (success) {
      navRef.current?.push(() => <DeleteOrderSuccessStep />)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {!openedFromSwipe && (
            <IonButtons slot="start">
              <IonBackButton defaultHref="" />
            </IonButtons>
          )}
          <IonTitle>{t.formatMessage({ id: 'orders.delete_order_title' })}</IonTitle>
          {openedFromSwipe && (
            <IonButtons slot="end">
              <IonButton fill="clear" onClick={onClose} aria-label={t.formatMessage({ id: 'common.close' })}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p className="text-text-secondary">
          {t.formatMessage({ id: 'common.delete' })}{' '}
          <strong>
            {t.formatMessage({ id: 'orders.delete_item_name' }, { date: formatDate(new Date(order.date)) })}
          </strong>?{' '}
          {t.formatMessage({ id: 'orders.delete_cannot_be_undone' })}
        </p>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          {/* Toolbar X (or back) handles dismissal; footer is destructive only. */}
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
