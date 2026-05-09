import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonButton,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNavRef, useOrderDetailCallbacks } from './OrderNavContext'
import { DeleteOrderSuccessStep } from './DeleteOrderSuccessStep'

export function DeleteOrderConfirmStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const {
    order,
    isDeleting,
    onDeleteOrder,
    onClose,
    openedFromSwipe,
  } = useOrderDetailCallbacks()

  const orderRef = order.orderNumber != null
    ? `#${String(order.orderNumber).padStart(4, '0')}`
    : `#${order.id.slice(0, 6).toUpperCase()}`

  const items = order.expand?.['order_items(order)'] || []
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleDelete = async () => {
    const success = await onDeleteOrder()
    if (success) {
      navRef.current?.push(() => <DeleteOrderSuccessStep />)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          {!openedFromSwipe && (
            <IonButtons slot="start">
              <IonBackButton defaultHref="" />
            </IonButtons>
          )}
          {openedFromSwipe && (
            <IonButtons slot="end">
              <IonButton fill="clear" onClick={onClose} aria-label={t.formatMessage({ id: 'common.close' })}>
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent className="wizard-content">
        <div className="wizard-step">
          <header className="order-delete__hero">
            <div className="order-delete__hero-eyebrow">
              <span>{t.formatMessage({ id: 'orders.eyebrow_delete' })}</span>
              <span className="order-modal__eyebrow-dot">·</span>
              <span className="order-modal__eyebrow-id">{orderRef}</span>
            </div>
            <h1 className="order-delete__hero-title">
              {t.formatMessage(
                { id: 'orders.delete_hero_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
          </header>

          <div className="order-delete__summary">
            <div className="order-delete__summary-row">
              <span className="order-delete__summary-label">
                {t.formatMessage({ id: 'orders.ordered_on_label' })}
              </span>
              <span className="order-delete__summary-value">
                {formatDate(new Date(order.date))}
              </span>
            </div>
            <div className="order-delete__summary-row">
              <span className="order-delete__summary-label">
                {t.formatMessage({ id: 'orders.eyebrow_line_items' })}
              </span>
              <span className="order-delete__summary-value">
                {t.formatMessage({ id: 'orders.item_unit_count' }, { count: itemCount })}
              </span>
            </div>
            <div className="order-delete__summary-row">
              <span className="order-delete__summary-label">
                {t.formatMessage({ id: 'orders.total_label' })}
              </span>
              <span className="order-delete__summary-value order-delete__summary-value--total">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>

          <div className="order-delete__consequences">
            <p className="order-delete__consequence">
              {t.formatMessage({ id: 'orders.delete_consequence_irreversible' })}
            </p>
            <p className="order-delete__consequence">
              {t.formatMessage({ id: 'orders.delete_consequence_audit' })}
            </p>
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__secondary-pill"
              onClick={() => {
                if (openedFromSwipe) {
                  onClose()
                } else {
                  navRef.current?.pop()
                }
              }}
              disabled={isDeleting}
            >
              {t.formatMessage({ id: 'common.cancel' })}
            </button>
            <button
              type="button"
              className="order-delete__pill"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="order-modal__pill-spinner" aria-label={t.formatMessage({ id: 'common.loading' })} />
              ) : (
                t.formatMessage({ id: 'common.delete' })
              )}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
