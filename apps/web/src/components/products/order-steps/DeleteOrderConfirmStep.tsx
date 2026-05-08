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
import { Spinner } from '@/components/ui'
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
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1" disabled={isDeleting}>
                {t.formatMessage({ id: 'common.cancel' })}
              </button>
            ) : (
              <button type="button" onClick={() => navRef.current?.pop()} className="btn btn-secondary flex-1" disabled={isDeleting}>
                {t.formatMessage({ id: 'common.cancel' })}
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger flex-1"
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner /> : t.formatMessage({ id: 'common.delete' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
