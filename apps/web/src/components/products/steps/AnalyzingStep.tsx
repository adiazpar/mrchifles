import { useIntl } from 'react-intl'
import { useEffect, useRef } from 'react'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonSpinner,
} from '@ionic/react'
import { useProductForm } from '@/contexts/product-form-context'
import { useProductNavRef, useAddProductCallbacks } from './ProductNavContext'
import { SuggestedCategoryStepWrapper } from './SuggestedCategoryStepWrapper'
import { FormStep } from './FormStep'

export function AnalyzingStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { onAbortAiProcessing, onClose, onExitComplete, suggestedCategoryName } =
    useAddProductCallbacks()
  const { pipelineStep, isCompressing } = useProductForm()

  // Track whether we've already navigated away from this step to avoid pushing twice.
  const navigatedRef = useRef(false)

  useEffect(() => {
    if (navigatedRef.current) return
    if (pipelineStep === 'complete') {
      navigatedRef.current = true
      if (suggestedCategoryName) {
        navRef.current?.push(() => <SuggestedCategoryStepWrapper />)
      } else {
        navRef.current?.push(() => <FormStep />)
      }
    }
  }, [pipelineStep, suggestedCategoryName, navRef])

  const label = isCompressing
    ? t.formatMessage({ id: 'aiPipeline.preparing_photo' })
    : pipelineStep === 'identifying'
      ? t.formatMessage({ id: 'aiPipeline.identifying' })
      : pipelineStep === 'generating'
        ? t.formatMessage({ id: 'aiPipeline.generating_icon' })
        : pipelineStep === 'removing-bg'
          ? t.formatMessage({ id: 'aiPipeline.removing_bg' })
          : t.formatMessage({ id: 'aiPipeline.analyzing' })

  function handleCancel() {
    onAbortAiProcessing()
    onClose()
    onExitComplete()
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.ai_step_analyzing_title' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="flex flex-col items-center justify-center py-12">
          <IonSpinner name="crescent" className="w-8 h-8 mb-4" />
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="text-xs text-text-tertiary mt-1">
            {t.formatMessage({ id: 'aiPipeline.may_take_seconds' })}
          </p>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary w-full"
          >
            {t.formatMessage({ id: 'common.cancel' })}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
