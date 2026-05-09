import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
} from '@ionic/react'
import { getUserInitials } from '@kasero/shared/auth'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { UserRole } from '@kasero/shared/types'
import { useMemberNavRef, useMemberCallbacks } from './MemberNavContext'
import { MemberRoleChangeStep } from './MemberRoleChangeStep'
import { MemberRemoveStep } from './MemberRemoveStep'

export function MemberDetailsStep() {
  const t = useIntl()
  const navRef = useMemberNavRef()
  const { formatDate } = useBusinessFormat()
  const {
    onClose,
    member,
    currentUser,
    canManageTeam,
    callerRole,
    onToggleStatus,
  } = useMemberCallbacks()

  const isSelf = member.id === currentUser?.id
  const isPartnerOnPartner = callerRole === 'partner' && member.role === 'partner'
  const isManageable =
    canManageTeam && !isSelf && member.role !== 'owner' && !isPartnerOnPartner

  const roleLabels: Record<UserRole, string> = {
    owner: t.formatMessage({ id: 'team.role_owner' }),
    partner: t.formatMessage({ id: 'team.role_partner' }),
    employee: t.formatMessage({ id: 'team.role_employee' }),
  }

  const modalTitle = isSelf
    ? t.formatMessage({ id: 'team.step_your_profile' })
    : t.formatMessage({ id: 'team.step_manage_member' })

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{modalTitle}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t.formatMessage({ id: 'common.close' })}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Member header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="avatar w-11 h-11 text-sm overflow-hidden">
            {member.avatar ? (
              <img
                src={member.avatar}
                alt=""
                className="w-11 h-11 rounded-full object-cover"
              />
            ) : (
              getUserInitials(member.name)
            )}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">{member.name}</h3>
            <div className="text-xs text-text-tertiary mt-0.5">
              {roleLabels[member.role]}
              <span className="mx-1.5">·</span>
              <span className={member.status === 'active' ? 'text-success' : 'text-error'}>
                {member.status === 'active'
                  ? t.formatMessage({ id: 'team.status_active' })
                  : t.formatMessage({ id: 'team.status_disabled' })}
              </span>
            </div>
          </div>
        </div>

        {/* Member details */}
        <div className="space-y-3 p-4 bg-bg-muted rounded-lg mb-4">
          {member.email && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">{t.formatMessage({ id: 'team.email_label' })}</span>
              <span className="text-sm font-medium">
                {isSelf
                  ? member.email
                  : `****${member.email.split('@')[0].slice(-4)}@${member.email.split('@')[1]}`}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-secondary">{t.formatMessage({ id: 'team.member_since_label' })}</span>
            <span className="text-sm font-medium">
              {formatDate(member.createdAt)}
            </span>
          </div>
        </div>

        {isManageable && (
          <div className="space-y-3">
            {/* Change role button */}
            <IonButton
              fill="outline"
              expand="block"
              onClick={() => navRef.current?.push(() => <MemberRoleChangeStep />)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t.formatMessage({ id: 'team.change_role_button' })}</span>
            </IonButton>

            {/* Toggle status button */}
            <IonButton
              fill={member.status === 'active' ? 'clear' : 'outline'}
              color={member.status === 'active' ? 'danger' : undefined}
              expand="block"
              onClick={onToggleStatus}
            >
              {member.status === 'active' ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>{t.formatMessage({ id: 'team.disable_account_button' })}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t.formatMessage({ id: 'team.enable_account_button' })}</span>
                </>
              )}
            </IonButton>

            {/* Remove from business button */}
            <IonButton
              fill="clear"
              color="danger"
              expand="block"
              onClick={() => navRef.current?.push(() => <MemberRemoveStep />)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H22M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t.formatMessage({ id: 'team.remove_member_button' })}</span>
            </IonButton>

            {/* Status explanation */}
            {member.status === 'disabled' && (
              <p className="text-xs text-text-tertiary">
                {t.formatMessage({ id: 'team.disabled_cannot_sign_in' })}
              </p>
            )}
          </div>
        )}

        {/* Self view hint */}
        {isSelf && (
          <p className="text-xs text-text-tertiary text-center mt-4">
            {t.formatMessage({ id: 'team.account_settings_hint' })}{' '}
            <Link to="/account" className="text-brand hover:underline">
              {t.formatMessage({ id: 'team.account_settings_link' })}
            </Link>.
          </p>
        )}
      </IonContent>
    </IonPage>
  )
}
