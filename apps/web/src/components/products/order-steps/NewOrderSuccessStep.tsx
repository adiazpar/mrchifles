import { useIntl } from 'react-intl'
import { IonContent, IonFooter, IonToolbar } from '@ionic/react'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useNewOrderCallbacks } from './OrderNavContext'

export function NewOrderSuccessStep() {
  const t = useIntl()
  const { orderSaved, onClose } = useNewOrderCallbacks()

  function handleClose() {
    onClose()
  }

  return (
    <>
      <IonContent className="wizard-content">
        <div className="wizard-step wizard-step--centered">
          <div className="order-success">
            <div className="order-success__lottie">
              {orderSaved && (
                <LottiePlayer
                  src="/animations/success.json"
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
              style={{ opacity: orderSaved ? undefined : 0 }}
            >
              <span className="order-success__stamp-noun">
                {t.formatMessage({ id: 'orders.eyebrow_order' })}
              </span>
              <span className="order-success__stamp-dot">·</span>
              <span className="order-success__stamp-verb--created">
                {t.formatMessage({ id: 'orders.stamp_verb_created' })}
              </span>
            </div>
            <h2
              className="order-success__heading"
              style={{ opacity: orderSaved ? 1 : 0 }}
            >
              {t.formatMessage(
                { id: 'orders.new_order_success_heading_v2' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h2>
            <p
              className="order-success__caption"
              style={{ opacity: orderSaved ? 1 : 0 }}
            >
              {t.formatMessage({ id: 'orders.new_order_success_description' })}
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
              onClick={handleClose}
            >
              {t.formatMessage({ id: 'common.done' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
  )
}
