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
import { close, chevronBack } from 'ionicons/icons'
import { CalendarClock, ChevronDown } from 'lucide-react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNav, useOrderCallbacks } from './OrderNavContext'

interface OrderDetailsStepProps {
  /**
   * Defaults to `forward` (the wizard chain — CTA pushes 'confirm' for
   * the new-order flow). Pass `edit` when this step is opened from a
   * review surface so the CTA pops back to the review.
   */
  mode?: 'forward' | 'edit'
}

export function OrderDetailsStep({ mode = 'forward' }: OrderDetailsStepProps = {}) {
  const t = useIntl()
  const nav = useOrderNav()
  const { formatDate } = useBusinessFormat()
  const {
    providers,
    orderTotal,
    orderEstimatedArrival,
    onOrderEstimatedArrivalChange,
    orderProvider,
    onOrderProviderChange,
    error,
    onClose,
  } = useOrderCallbacks()

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
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={onClose}
              aria-label={t.formatMessage({ id: 'common.close' })}
            >
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="wizard-content">
        <div className="wizard-step">
          <header className="wizard-hero">
            <div className="order-modal__eyebrow">
              <span>{t.formatMessage({ id: 'orders.eyebrow_order' })}</span>
              <span className="order-modal__eyebrow-dot">·</span>
              <span className="order-modal__eyebrow-emphasis">
                {t.formatMessage({ id: 'orders.eyebrow_details' })}
              </span>
            </div>
            <h1 className="wizard-hero__title">
              {t.formatMessage(
                { id: 'orders.details_hero_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'orders.details_hero_subtitle' })}
            </p>
          </header>

          {error && (
            <div className="order-modal__error" role="alert">{error}</div>
          )}

          {/* Provider */}
          <div className="order-details__field">
            <label htmlFor="orderProvider" className="order-details__label">
              {t.formatMessage({ id: 'orders.provider_label' })}
            </label>
            <div className="order-details__select-wrap">
              <select
                id="orderProvider"
                value={orderProvider}
                onChange={e => onOrderProviderChange(e.target.value)}
                className={`input w-full pr-10 ${!orderProvider ? 'text-text-tertiary' : ''}`}
                style={{ backgroundImage: 'none', WebkitAppearance: 'none', appearance: 'none' }}
              >
                <option value="">{t.formatMessage({ id: 'orders.provider_none' })}</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span className="order-details__select-chevron">
                <ChevronDown size={18} strokeWidth={1.8} />
              </span>
            </div>
          </div>

          {/* Estimated Arrival */}
          <div className="order-details__field">
            <label className="order-details__label">
              {t.formatMessage({ id: 'orders.estimated_arrival_label' })}
            </label>
            <div className="order-details__date-wrap">
              <div
                className={`order-details__date-display${
                  orderEstimatedArrival ? '' : ' order-details__date-display--placeholder'
                }`}
              >
                {orderEstimatedArrival
                  ? formatDate(orderEstimatedArrival)
                  : t.formatMessage({ id: 'orders.select_date_placeholder' })}
              </div>
              <span className="order-details__date-display-icon">
                <CalendarClock size={18} strokeWidth={1.8} />
              </span>
              <input
                type="date"
                value={orderEstimatedArrival}
                onChange={e => onOrderEstimatedArrivalChange(e.target.value)}
                className="order-details__date-input"
                aria-label={t.formatMessage({ id: 'orders.estimated_arrival_label' })}
              />
            </div>
          </div>

        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={() =>
                mode === 'edit' ? nav.pop() : nav.push('confirm')
              }
              disabled={!orderTotal || parseFloat(orderTotal) <= 0}
            >
              {t.formatMessage({
                id: mode === 'edit' ? 'common.done' : 'orders.review_button',
              })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
  )
}
