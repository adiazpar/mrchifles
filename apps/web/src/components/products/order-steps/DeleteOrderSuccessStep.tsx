import { useIntl } from 'react-intl'
import { IonPage, IonContent, IonFooter, IonToolbar, IonButton } from '@ionic/react'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useOrderDetailCallbacks } from './OrderNavContext'

export function DeleteOrderSuccessStep() {
  const t = useIntl()
  const { orderDeleted, onClose, onExitComplete } = useOrderDetailCallbacks()

  function handleDone() {
    onClose()
    onExitComplete()
  }

  return (
    <IonPage>
      <IonContent>
        <div className="flex flex-col items-center justify-center text-center h-full px-6 py-8">
          <div style={{ width: 160, height: 160 }}>
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
          <p
            className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
            style={{ opacity: orderDeleted ? 1 : 0 }}
          >
            {t.formatMessage({ id: 'orders.delete_success_heading' })}
          </p>
          <p
            className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
            style={{ opacity: orderDeleted ? 1 : 0 }}
          >
            {t.formatMessage({ id: 'orders.delete_success_description' })}
          </p>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <IonButton expand="block" onClick={handleDone}>
            {t.formatMessage({ id: 'common.done' })}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
