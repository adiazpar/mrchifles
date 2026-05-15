import { useMemo } from 'react'
import { useIntl } from 'react-intl'
import { IonButton, IonContent } from '@ionic/react'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useCreateBusinessCtx } from '../CreateBusinessModal'

export function SuccessStep() {
  const t = useIntl()
  const { createdBusiness, createSuccess, formData, handleClose, handleExitComplete, error } =
    useCreateBusinessCtx()

  // Title with one italic-terracotta emphasis word (e.g. "ready").
  const titleNode = useMemo(() => {
    const full = t.formatMessage({ id: 'createBusiness.success_title' })
    const emphasis = t.formatMessage({ id: 'createBusiness.success_title_emphasis' })
    const idx = emphasis ? full.indexOf(emphasis) : -1
    if (!emphasis || idx === -1) return full
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [t])

  const businessName = createdBusiness?.name || formData.name || ''

  return (
    <>
      <IonContent className="wizard-content">
        <div className="create-business__success">
          <div className="create-business__success-lottie">
            {createSuccess && (
              <LottiePlayer
                src="/animations/success.json"
                loop={false}
                autoplay={true}
                delay={500}
                style={{ width: '100%', height: '100%' }}
              />
            )}
          </div>

          <span
            className="create-business__success-eyebrow"
            data-ready={createSuccess}
          >
            {t.formatMessage({ id: 'createBusiness.success_eyebrow' })}
          </span>

          <h1
            className="create-business__success-title"
            data-ready={createSuccess}
          >
            {titleNode}
          </h1>

          {businessName ? (
            <span
              className="create-business__success-name"
              data-ready={createSuccess}
              title={businessName}
            >
              {/* User content — verbatim. icon is optional emoji. */}
              {formData.icon ? <span aria-hidden="true">{formData.icon}</span> : null}
              <span>{businessName}</span>
            </span>
          ) : null}

          {error && (
            <div className="create-business__success-error">
              {error}
            </div>
          )}

          <div
            className="create-business__success-action"
            data-ready={createSuccess}
          >
            <IonButton
              expand="block"
              onClick={() => {
                handleClose()
                handleExitComplete()
              }}
            >
              {t.formatMessage({ id: 'common.done' })}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </>
  )
}
