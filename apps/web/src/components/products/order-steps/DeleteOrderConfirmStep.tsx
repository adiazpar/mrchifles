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
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            {openedFromSwipe ? (
              <IonButton fill="outline" onClick={onClose} disabled={isDeleting}>
                {t.formatMessage({ id: 'common.cancel' })}
              </IonButton>
            ) : (
              <IonButton fill="outline" onClick={() => navRef.current?.pop()} disabled={isDeleting}>
                {t.formatMessage({ id: 'common.cancel' })}
              </IonButton>
            )}
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
