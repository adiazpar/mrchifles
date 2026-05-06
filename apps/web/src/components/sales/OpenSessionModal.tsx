'use client'

import { useIntl } from 'react-intl';
import { useState } from 'react'
import { Modal, PriceInput, Spinner, useModal } from '@/components/ui'
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

export function OpenSessionModal({
  isOpen,
  onClose,
  previousCountedCash,
}: OpenSessionModalProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const { openSession } = useSalesSessions()
  const translateApiMessage = useApiMessage()

  const [startingCashStr, setStartingCashStr] = useState<string>(
    previousCountedCash != null ? previousCountedCash.toString() : '0',
  )
  const [submitting, setSubmitting] = useState(false)
  const [opened, setOpened] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async (goToStep: (n: number) => void) => {
    haptic()
    setError('')
    setSubmitting(true)
    goToStep(1)
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={() => {
        setStartingCashStr(
          previousCountedCash != null ? previousCountedCash.toString() : '0',
        )
        setSubmitting(false)
        setOpened(false)
        setError('')
      }}
      title={t.formatMessage({
        id: 'sales.session.open_modal.title'
      })}
    >
      <Modal.Step title={t.formatMessage({
        id: 'sales.session.open_modal.title'
      })}>
        <Modal.Item>
          <p className="text-sm text-text-secondary">{t.formatMessage({
            id: 'sales.session.open_modal.description'
          })}</p>
        </Modal.Item>
        <Modal.Item>
          <label className="label" htmlFor="open-session-starting-cash">
            {t.formatMessage({
              id: 'sales.session.open_modal.starting_cash'
            })}
          </label>
          <PriceInput
            id="open-session-starting-cash"
            value={startingCashStr}
            onValueChange={setStartingCashStr}
            placeholder="0"
          />
          <p className="text-xs text-text-tertiary mt-2">
            {t.formatMessage({
              id: 'sales.session.open_modal.starting_cash_helper'
            })}
          </p>
        </Modal.Item>
        <Modal.Footer>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
            disabled={submitting}
          >
            {tCommon.formatMessage({
              id: 'common.cancel'
            })}
          </button>
          <ConfirmButton onConfirm={handleConfirm} submitting={submitting} />
        </Modal.Footer>
      </Modal.Step>
      <Modal.Step title={t.formatMessage({
        id: 'sales.session.open_modal.title'
      })} hideBackButton className="modal-step--centered">
        <Modal.Item>
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
                {t.formatMessage({
                  id: 'sales.session.open_modal.success_heading'
                })}
              </p>
            ) : error ? (
              <p className="text-sm text-error mt-4">{error}</p>
            ) : (
              <Spinner />
            )}
          </div>
        </Modal.Item>
        <Modal.Footer>
          {opened ? (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary flex-1"
            >
              {tCommon.formatMessage({
                id: 'common.done'
              })}
            </button>
          ) : error ? (
            <Modal.GoToStepButton step={0} className="btn btn-secondary flex-1">
              {t.formatMessage({
                id: 'sales.session.open_modal.error_back'
              })}
            </Modal.GoToStepButton>
          ) : null}
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}

function ConfirmButton({
  onConfirm,
  submitting,
}: {
  onConfirm: (goToStep: (n: number) => void) => Promise<void>
  submitting: boolean
}) {
  const t = useIntl()
  const { goToStep } = useModal()
  return (
    <button
      type="button"
      onClick={() => onConfirm(goToStep)}
      className="btn btn-primary flex-1"
      disabled={submitting}
    >
      {t.formatMessage({
        id: 'sales.session.open_modal.confirm'
      })}
    </button>
  );
}
