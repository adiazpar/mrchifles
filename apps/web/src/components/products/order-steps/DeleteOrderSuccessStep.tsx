import { useIntl } from 'react-intl'
import { IonPage, IonContent, IonFooter, IonToolbar } from '@ionic/react'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useOrderDetailCallbacks } from './OrderNavContext'

export function DeleteOrderSuccessStep() {
  const t = useIntl()
  const { orderDeleted, order, onClose } = useOrderDetailCallbacks()

  const orderRef = order.orderNumber != null
    ? `#${String(order.orderNumber).padStart(4, '0')}`
    : `#${order.id.slice(0, 6).toUpperCase()}`

  function handleDone() {
    onClose()
  }

  return (
    <IonPage>
      <IonContent className="wizard-content">
        <div className="wizard-step wizard-step--centered">
          <div className="order-success">
            <div className="order-success__lottie">
              {orderDeleted && (
                <LottiePlayer
                  src="/animations/error.json"
                  loop={false}
                  autoplay={true}
                  delay={300}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <div
              className="order-success__stamp"
              aria-hidden="true"
              style={{ opacity: orderDeleted ? undefined : 0 }}
            >
              <span className="order-success__stamp-noun">
                {t.formatMessage({ id: 'orders.eyebrow_order' })}
              </span>
              <span className="order-success__stamp-dot">·</span>
              <span className="order-success__stamp-verb--deleted">
                {t.formatMessage({ id: 'orders.stamp_verb_deleted' })}
              </span>
              <span className="order-success__stamp-dot">·</span>
              <span className="order-success__stamp-id">{orderRef}</span>
            </div>
            <h2
              className="order-success__heading"
              style={{ opacity: orderDeleted ? 1 : 0 }}
            >
              {t.formatMessage(
                { id: 'orders.delete_success_heading_v2' },
                {
                  em: (chunks) => (
                    <em className="order-success__heading-em--danger">{chunks}</em>
                  ),
                },
              )}
            </h2>
            <p
              className="order-success__caption"
              style={{ opacity: orderDeleted ? 1 : 0 }}
            >
              {t.formatMessage({ id: 'orders.delete_success_description' })}
            </p>
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={handleDone}
            >
              {t.formatMessage({ id: 'common.done' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
