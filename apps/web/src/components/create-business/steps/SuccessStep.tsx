import { useIntl } from 'react-intl'
import { IonButton, IonPage, IonContent } from '@ionic/react'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useCreateBusinessCtx } from '../CreateBusinessModal'

export function SuccessStep() {
  const t = useIntl()
  const { createdBusiness, createSuccess, formData, handleClose, handleExitComplete, error } =
    useCreateBusinessCtx()

  return (
    <IonPage>
      <IonContent>
        <div className="flex flex-col items-center justify-center text-center h-full px-6 py-8">
          <div style={{ width: 160, height: 160 }}>
            {createSuccess && (
              <LottiePlayer
                src="/animations/success.json"
                loop={false}
                autoplay={true}
                delay={500}
                style={{ width: 160, height: 160 }}
              />
            )}
          </div>

          <p
            className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-500"
            style={{ opacity: createSuccess ? 1 : 0 }}
          >
            {t.formatMessage({ id: 'createBusiness.step_success_heading' })}
          </p>
          <p
            className="text-sm text-text-secondary mt-1 transition-opacity duration-500 delay-200"
            style={{ opacity: createSuccess ? 1 : 0 }}
          >
            {formData.icon && <span className="mr-1">{formData.icon}</span>}
            {t.formatMessage(
              { id: 'createBusiness.step_success_description' },
              { name: createdBusiness?.name || 'Your business' },
            )}
          </p>

          {error && (
            <div className="mt-4 p-3 bg-error-subtle text-error text-sm rounded-lg text-center w-full">
              {error}
            </div>
          )}

          <IonButton
            expand="block"
            onClick={() => {
              handleClose()
              handleExitComplete()
            }}
            className="mt-6 w-full"
          >
            {t.formatMessage({ id: 'common.done' })}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  )
}
