import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButton,
  IonButtons,
  IonBackButton,
  IonSpinner,
} from '@ionic/react'
import { useMemberNavRef, useMemberCallbacks } from './MemberNavContext'

/**
 * Step 2a — Promotion warning, shown only when the proposed direction is
 * employee → partner (the destructive direction since partners gain
 * manager-level powers). Mirrors the cream paper hero but tints the
 * eyebrow + emphasized name in oxblood so the user knows this is the
 * loud branch of the role-change flow.
 *
 * The CTA fires the role change directly (the parent has already set
 * newRole='partner' on the form when the details-step button was tapped),
 * then pops back to the root details surface.
 */
export function MemberPartnerWarningStep() {
  const t = useIntl()
  const navRef = useMemberNavRef()
  const {
    member,
    roleChangeLoading,
    onSubmitRoleChange,
  } = useMemberCallbacks()

  const handleConfirm = async () => {
    void onSubmitRoleChange()
    navRef.current?.popToRoot()
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
              {t.formatMessage({ id: 'team.member_v2.eyebrow_partner_warning' })}
            </span>
            <h1 className="pm-hero__title pm-hero__title--danger">
              {t.formatMessage(
                { id: 'team.member_v2.title_partner_warning' },
                {
                  // User-entered content — interpolate verbatim.
                  name: member.name,
                  em: (chunks) => <em>{chunks}</em>,
                },
              )}
            </h1>
            <p className="pm-hero__subtitle">
              {t.formatMessage({ id: 'team.member_v2.subtitle_partner_warning' })}
            </p>
          </header>

          {/* Consequence ledger — partners gain X, Y, Z; cannot do W. */}
          <div className="tm-member__consequences">
            <span className="tm-member__consequences-eyebrow">
              {t.formatMessage({ id: 'team.member_v2.partner_grants_eyebrow' })}
            </span>
            <ul className="tm-member__consequences-list">
              <li className="tm-member__consequences-bullet">
                {t.formatMessage({ id: 'team.member_v2.partner_grant_products' })}
              </li>
              <li className="tm-member__consequences-bullet">
                {t.formatMessage({ id: 'team.member_v2.partner_grant_team' })}
              </li>
              <li className="tm-member__consequences-bullet">
                {t.formatMessage({ id: 'team.member_v2.partner_grant_cash' })}
              </li>
              <li className="tm-member__consequences-bullet tm-member__consequences-bullet--exception">
                {t.formatMessage({ id: 'team.member_v2.partner_grant_exception' })}
              </li>
            </ul>
          </div>
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <IonButton
              color="danger"
              onClick={handleConfirm}
              disabled={roleChangeLoading}
            >
              {roleChangeLoading ? (
                <IonSpinner name="crescent" />
              ) : (
                t.formatMessage({ id: 'team.member_v2.partner_warning_confirm' })
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
