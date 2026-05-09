import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
} from '@ionic/react'
import { useInviteNavRef, useInviteCallbacks } from './InviteNavContext'
import { InviteCodeStep } from './InviteCodeStep'

/**
 * Partner-promotion consequence screen. Shown only when the user picks
 * "partner" on InviteRoleStep, before the code is generated. Lays out
 * exactly what a partner can — and cannot — do, in a small ledger
 * styled with oxblood/danger tokens so the gravity reads.
 *
 * The "off-limits" final row is intentionally rendered as Fraunces
 * italic so it stands out as the reassurance line in an otherwise
 * cautionary list.
 *
 * Confirm pushes InviteCodeStep after the API generates the code, same
 * as the non-partner path.
 */
export function InvitePartnerWarningStep() {
  const t = useIntl()
  const navRef = useInviteNavRef()
  const { isGenerating, onGenerateCode } = useInviteCallbacks()

  const handleConfirm = async () => {
    await onGenerateCode()
    navRef.current?.push(() => <InviteCodeStep />)
  }

  return (
    <IonPage>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow pm-hero__eyebrow--danger">
              {t.formatMessage({ id: 'team.invite_v2.eyebrow_partner_warning' })}
            </span>
            <h1 className="pm-hero__title pm-hero__title--danger">
              {t.formatMessage(
                { id: 'team.invite_v2.title_partner_warning' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="pm-hero__subtitle">
              {t.formatMessage({ id: 'team.invite_v2.subtitle_partner_warning' })}
            </p>
          </header>

          <ul className="tm-invite__warning-list">
            <li className="tm-invite__warning-row">
              <span className="tm-invite__warning-tick" aria-hidden="true" />
              <span className="tm-invite__warning-text">
                {t.formatMessage({ id: 'team.invite_v2.partner_bullet_products' })}
              </span>
            </li>
            <li className="tm-invite__warning-row">
              <span className="tm-invite__warning-tick" aria-hidden="true" />
              <span className="tm-invite__warning-text">
                {t.formatMessage({ id: 'team.invite_v2.partner_bullet_team' })}
              </span>
            </li>
            <li className="tm-invite__warning-row">
              <span className="tm-invite__warning-tick" aria-hidden="true" />
              <span className="tm-invite__warning-text">
                {t.formatMessage({ id: 'team.invite_v2.partner_bullet_sessions' })}
              </span>
            </li>
            <li className="tm-invite__warning-row tm-invite__warning-row--off-limits">
              <span className="tm-invite__warning-tick" aria-hidden="true" />
              <span className="tm-invite__warning-text">
                {t.formatMessage({ id: 'team.invite_v2.partner_bullet_off_limits' })}
              </span>
            </li>
          </ul>
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={handleConfirm}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span
                  className="order-modal__pill-spinner"
                  aria-label={t.formatMessage({ id: 'common.loading' })}
                />
              ) : (
                t.formatMessage({ id: 'team.invite_v2.partner_warning_confirm' })
              )}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
