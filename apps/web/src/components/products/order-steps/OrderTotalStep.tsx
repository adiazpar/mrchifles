'use client'

import { useIntl } from 'react-intl'
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { chevronBack } from 'ionicons/icons'
import { PriceKeypadStep } from '@/components/ui'
import { useOrderNav, useOrderCallbacks } from './OrderNavContext'

interface OrderTotalStepProps {
  /**
   * `forward` (manual wizard chain): CTA pushes 'details-forward' so
   * the next surface is OrderDetailsStep.
   * `edit` (jumped here from a review surface to revise the total):
   * CTA pops back to whichever review pushed it.
   */
  mode: 'forward' | 'edit'
}

/**
 * Order wizard step 2 of 4: total paid to supplier. Reuses the
 * <PriceKeypadStep> chrome from the product price step / cash flow
 * for one consistent money-input vocabulary across the app —
 * always-visible numeric pad, no system keyboard pop-up, big
 * Fraunces italic numerals.
 */
export function OrderTotalStep({ mode }: OrderTotalStepProps) {
  const t = useIntl()
  const nav = useOrderNav()
  const { orderTotal, onOrderTotalChange } = useOrderCallbacks()

  const numericTotal = parseFloat(orderTotal)
  const isValid = !isNaN(numericTotal) && numericTotal > 0

  const handleContinue = () => {
    if (!isValid) return
    if (mode === 'edit') {
      nav.pop()
    } else {
      nav.push('details-forward')
    }
  }

  return (
    <>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              onClick={() => nav.pop()}
              aria-label={t.formatMessage({ id: 'common.back' })}
            >
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="wizard-content modal-content--no-scroll">
        <div className="keypad-shell">
          <header className="wizard-hero wizard-hero--keypad">
            <div className="order-modal__eyebrow">
              <span>{t.formatMessage({ id: 'orders.eyebrow_order' })}</span>
              <span className="order-modal__eyebrow-dot">·</span>
              <span className="order-modal__eyebrow-emphasis">
                {t.formatMessage({ id: 'orders.eyebrow_total' })}
              </span>
            </div>
            <h1 className="wizard-hero__title">
              {t.formatMessage(
                { id: 'orders.total_step_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
          </header>
          <PriceKeypadStep
            value={orderTotal}
            onValueChange={onOrderTotalChange}
            amountLabel={t.formatMessage({ id: 'orders.total_label' })}
            helper={t.formatMessage({ id: 'orders.total_step_helper' })}
            ariaLabel={t.formatMessage({ id: 'orders.total_label' })}
          />
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={handleContinue}
              disabled={!isValid}
            >
              {t.formatMessage({
                id: mode === 'edit' ? 'common.done' : 'common.continue',
              })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
  )
}
