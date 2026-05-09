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
import { getUserInitials } from '@kasero/shared/auth'
import type { UserRole } from '@kasero/shared/types'
import { useMemberCallbacks } from './MemberNavContext'

/**
 * Step 2c — Confirm member removal. Oxblood-tinted hero (eyebrow + title),
 * a small specimen card showing exactly which member the action targets
 * (avatar + name + role chip), and a destructive primary pill in the
 * footer with a low-key back link beneath.
 *
 * After successful removal the modal closes; on failure the user remains
 * on this surface and the parent's error toast handles messaging.
 */
export function MemberRemoveStep() {
  const t = useIntl()
  const { member, removeLoading, onRemoveMember, onClose } = useMemberCallbacks()

  const roleLabels: Record<UserRole, string> = {
    owner: t.formatMessage({ id: 'team.role_owner' }),
    partner: t.formatMessage({ id: 'team.role_partner' }),
    employee: t.formatMessage({ id: 'team.role_employee' }),
  }

  const handleRemove = async () => {
    const ok = await onRemoveMember()
    if (ok) onClose()
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
              {t.formatMessage({ id: 'team.member_v2.eyebrow_remove' })}
            </span>
            <h1 className="pm-hero__title pm-hero__title--danger">
              {t.formatMessage(
                { id: 'team.member_v2.title_remove' },
                {
                  // User-entered content — interpolate verbatim.
                  name: member.name,
                  em: (chunks) => <em>{chunks}</em>,
                },
              )}
            </h1>
            <p className="pm-hero__subtitle">
              {t.formatMessage(
                { id: 'team.member_v2.subtitle_remove' },
                { name: member.name },
              )}
            </p>
          </header>

          {/* Specimen — small avatar + name + role chip making the
              destructive action target unambiguous. */}
          <div className="tm-member__specimen">
            <div className="tm-member__specimen-avatar">
              {member.avatar ? (
                <img src={member.avatar} alt="" />
              ) : (
                getUserInitials(member.name)
              )}
            </div>
            <div className="tm-member__specimen-body">
              <span className="tm-member__specimen-name">{member.name}</span>
              <span className="tm-member__specimen-role">
                {roleLabels[member.role]}
              </span>
            </div>
          </div>
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <IonButton
              color="danger"
              onClick={handleRemove}
              disabled={removeLoading}
            >
              {removeLoading ? (
                <IonSpinner name="crescent" />
              ) : (
                t.formatMessage({ id: 'team.member_v2.remove_confirm' })
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
