import { useIntl } from 'react-intl'
import { IonPage, IonContent, IonFooter, IonToolbar, IonButton } from '@ionic/react'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useProductForm } from '@/contexts/product-form-context'
import { useEditProductCallbacks } from './ProductNavContext'

export function EditSuccessStep() {
  const t = useIntl()
  const { productSaved } = useProductForm()
  const { onClose, onExitComplete } = useEditProductCallbacks()

  function handleDone() {
    onClose()
    onExitComplete()
  }

  return (
    <IonPage>
      <IonContent>
        <div className="flex flex-col items-center justify-center text-center h-full px-6 py-8">
          <div style={{ width: 160, height: 160 }}>
            {productSaved && (
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
            style={{ opacity: productSaved ? 1 : 0 }}
          >
            {t.formatMessage({ id: 'productForm.success_updated_heading' })}
          </p>
          <p
            className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
            style={{ opacity: productSaved ? 1 : 0 }}
          >
            {t.formatMessage({ id: 'productForm.success_updated_description' })}
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
