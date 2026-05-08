'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { IonButton, IonSpinner } from '@ionic/react'
import { ModalShell, PriceInput } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useSalesSessions } from '@/contexts/sales-sessions-context'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError } from '@/lib/api-client'
import { haptic } from '@/lib/haptics'
import { ApiMessageCode } from '@kasero/shared/api-messages'

interface OpenSessionModalProps {
  isOpen: boolean
  onClose: () => void
  previousCountedCash: number | null
}

type Step = 0 | 1

export function OpenSessionModal({
  isOpen,
  onClose,
  previousCountedCash,
}: OpenSessionModalProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const { openSession } = useSalesSessions()
  const translateApiMessage = useApiMessage()

  const [step, setStep] = useState<Step>(0)
  const [startingCashStr, setStartingCashStr] = useState<string>(
    previousCountedCash != null ? previousCountedCash.toString() : '0',
  )
  const [submitting, setSubmitting] = useState(false)
  const [opened, setOpened] = useState(false)
  const [error, setError] = useState('')

  // Reset state after the modal closes.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep(0)
        setStartingCashStr(
          previousCountedCash != null ? previousCountedCash.toString() : '0',
        )
        setSubmitting(false)
        setOpened(false)
        setError('')
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isOpen, previousCountedCash])

  const handleConfirm = async () => {
    haptic()
    setError('')
    setSubmitting(true)
    setStep(1)
    try {
      const value = parseFloat(startingCashStr) || 0
      await openSession(value)
      setOpened(true)
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.messageCode === ApiMessageCode.SESSION_ALREADY_OPEN
      ) {
        setError(t.formatMessage({
          id: 'sales.session.open_modal.error_already_open'
        }))
      } else if (err instanceof ApiError && err.envelope) {
        setError(translateApiMessage(err.envelope))
      } else {
        setError(tCommon.formatMessage({
          id: 'common.error'
        }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const title = t.formatMessage({ id: 'sales.session.open_modal.title' })

  // Step 0 footer — enter starting cash
  const step0Footer = (
    <>
      <IonButton fill="outline" onClick={onClose} disabled={submitting}>
        {tCommon.formatMessage({ id: 'common.cancel' })}
      </IonButton>
      <IonButton onClick={handleConfirm} disabled={submitting}>
        {t.formatMessage({ id: 'sales.session.open_modal.confirm' })}
      </IonButton>
    </>
  )

  // Step 1 footer — success or error
  const step1Footer = opened ? (
    <IonButton onClick={onClose}>
      {tCommon.formatMessage({ id: 'common.done' })}
    </IonButton>
  ) : error ? (
    <IonButton fill="outline" onClick={() => setStep(0)}>
      {t.formatMessage({ id: 'sales.session.open_modal.error_back' })}
    </IonButton>
  ) : null

  const footer = step === 0 ? step0Footer : step1Footer

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onBack={step === 1 && error ? () => setStep(0) : undefined}
      footer={footer}
      noSwipeDismiss
    >
      {/* Step 0 — enter starting cash */}
      {step === 0 && (
        <>
          <p className="text-sm text-text-secondary mb-4">
            {t.formatMessage({ id: 'sales.session.open_modal.description' })}
          </p>
          <label className="label" htmlFor="open-session-starting-cash">
            {t.formatMessage({ id: 'sales.session.open_modal.starting_cash' })}
          </label>
          <PriceInput
            id="open-session-starting-cash"
            value={startingCashStr}
            onValueChange={setStartingCashStr}
            placeholder="0"
          />
          <p className="text-xs text-text-tertiary mt-2">
            {t.formatMessage({ id: 'sales.session.open_modal.starting_cash_helper' })}
          </p>
        </>
      )}

      {/* Step 1 — loading / success / error */}
      {step === 1 && (
        <div className="flex flex-col items-center text-center py-4">
          <div style={{ width: 160, height: 160 }}>
            {opened && (
              <LottiePlayer
                src="/animations/success.json"
                loop={false}
                autoplay={true}
                delay={300}
                style={{ width: 160, height: 160 }}
              />
            )}
          </div>
          {opened ? (
            <p className="text-lg font-semibold text-text-primary mt-4">
              {t.formatMessage({ id: 'sales.session.open_modal.success_heading' })}
            </p>
          ) : error ? (
            <p className="text-sm text-error mt-4">{error}</p>
          ) : (
            <IonSpinner name="crescent" />
          )}
        </div>
      )}
    </ModalShell>
  )
}
