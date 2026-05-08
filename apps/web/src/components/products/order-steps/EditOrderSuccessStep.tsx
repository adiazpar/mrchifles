import { useIntl } from 'react-intl'
import { IonPage, IonContent, IonFooter, IonToolbar } from '@ionic/react'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useOrderDetailCallbacks } from './OrderNavContext'

export function EditOrderSuccessStep() {
  const t = useIntl()
  const { editOrderSaved, onClose, onExitComplete } = useOrderDetailCallbacks()

  function handleClose() {
    onClose()
    onExitComplete()
  }

  return (
    <IonPage>
      <IonContent>
        <div className="flex flex-col items-center justify-center text-center h-full px-6 py-8">
          <div style={{ width: 160, height: 160 }}>
            {editOrderSaved && (
              <LottiePlayer
                src="/animations/success.json"
                loop={false}
                autoplay={true}
                delay={300}
                style={{ width: 160, height: 160 }}
              />
            )}
          </div>
          <p
            className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
            style={{ opacity: editOrderSaved ? 1 : 0 }}
          >
            {t.formatMessage({ id: 'orders.edit_order_success_heading' })}
          </p>
          <p
            className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
            style={{ opacity: editOrderSaved ? 1 : 0 }}
          >
            {t.formatMessage({ id: 'orders.edit_order_success_description' })}
          </p>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <button type="button" onClick={handleClose} className="btn btn-primary w-full">
            {t.formatMessage({ id: 'common.close' })}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
