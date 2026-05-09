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
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { ChevronRight, UserCog, Power, UserMinus } from 'lucide-react'
import { getUserInitials } from '@kasero/shared/auth'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { UserRole } from '@kasero/shared/types'
import { useMemberNavRef, useMemberCallbacks } from './MemberNavContext'
import { MemberRoleChangeStep } from './MemberRoleChangeStep'
import { MemberPartnerWarningStep } from './MemberPartnerWarningStep'
import { MemberRemoveStep } from './MemberRemoveStep'

/**
 * Root of the MemberModal IonNav stack. Pattern:
 *   - Hero zone: avatar tile, mono uppercase eyebrow ("MEMBER · ACTIVE"),
 *     Fraunces italic name with the name itself emphasized via <em>, and a
 *     mono caption beneath ("ROLE · JOINED 04/12/2024 · YOU").
 *   - Identifier ledger: dotted-leader rows for email, member-since, status.
 *     Status row's value is preceded by a brand/dim status dot.
 *   - Action ladder (only when isManageable): primary "CHANGE ROLE" with a
 *     mono direction stamp showing where this tap leads, secondary status
 *     toggle with a colored pill on the right ("WILL DISABLE" / "WILL
 *     ENABLE"), and a demoted oxblood-bordered "REMOVE FROM TEAM" link
 *     well-separated by a hairline rule with a clarifying caption.
 *   - Self view footer: italic Fraunces caption pointing to /account.
 */
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
    setNewRole,
  } = useMemberCallbacks()

  const isSelf = member.id === currentUser?.id
  const isPartnerOnPartner = callerRole === 'partner' && member.role === 'partner'
  const isManageable =
    canManageTeam && !isSelf && member.role !== 'owner' && !isPartnerOnPartner

  const isActive = member.status === 'active'

  const roleLabels: Record<UserRole, string> = {
    owner: t.formatMessage({ id: 'team.role_owner' }),
    partner: t.formatMessage({ id: 'team.role_partner' }),
    employee: t.formatMessage({ id: 'team.role_employee' }),
  }

  const modalTitleId = isSelf
    ? 'team.member_v2.step_title_self'
    : 'team.member_v2.step_title_other'

  // Direction the role-change tap will move toward. Employees → Partner
  // (which routes through the warning step), Partners → Employee (direct
  // role-change step). Owners aren't manageable; this only renders when
  // isManageable is true so we know we're looking at employee or partner.
  const isPromoting = member.role === 'employee'
  const targetRoleLabel = isPromoting
    ? t.formatMessage({ id: 'team.role_partner' })
    : t.formatMessage({ id: 'team.role_employee' })

  // Email mask: full address for the current user, partial mask otherwise
  // so a manager can identify which inbox got the invite without leaking
  // the rest of the team's contact details.
  const maskedEmail = (() => {
    if (!member.email) return ''
    if (isSelf) return member.email
    const [local, domain] = member.email.split('@')
    if (!domain) return member.email
    return `****${local.slice(-4)}@${domain}`
  })()

  const handleChangeRole = () => {
    // Pre-set the proposed direction on the form so the role-change /
    // warning step opens with the right radio selected, then push.
    setNewRole(isPromoting ? 'partner' : 'employee')
    if (isPromoting) {
      navRef.current?.push(() => <MemberPartnerWarningStep />)
    } else {
      navRef.current?.push(() => <MemberRoleChangeStep />)
    }
  }

  const handleRemove = () => {
    navRef.current?.push(() => <MemberRemoveStep />)
  }

  return (
    <IonPage>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonTitle>{t.formatMessage({ id: modalTitleId })}</IonTitle>
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

      <IonContent className="pm-content">
        <div className="pm-shell">
          {/* Hero — avatar + eyebrow + Fraunces italic name + mono caption. */}
          <header className="tm-member__hero">
            <div className="tm-member__avatar">
              {member.avatar ? (
                <img src={member.avatar} alt="" />
              ) : (
                getUserInitials(member.name)
              )}
            </div>
            <div className="tm-member__hero-text">
              <span
                className={
                  isActive
                    ? 'tm-member__hero-eyebrow'
                    : 'tm-member__hero-eyebrow tm-member__hero-eyebrow--inactive'
                }
              >
                <span>{t.formatMessage({ id: 'team.member_v2.eyebrow_member' })}</span>
                <span className="tm-member__hero-eyebrow-mark">·</span>
                <span className="tm-member__hero-eyebrow-state">
                  {t.formatMessage({
                    id: isActive
                      ? 'team.member_v2.eyebrow_state_active'
                      : 'team.member_v2.eyebrow_state_inactive',
                  })}
                </span>
              </span>
              <h1 className="tm-member__hero-name">
                {/* User-entered content — never translated. The italic
                    word in the headline IS the member's name. */}
                <em>{member.name}</em>
              </h1>
              <span className="tm-member__hero-meta">
                <span className="tm-member__hero-meta-role">
                  {roleLabels[member.role]}
                </span>
                <span className="tm-member__hero-meta-dot">·</span>
                <span>
                  {t.formatMessage(
                    { id: 'team.member_v2.joined_caption' },
                    { date: formatDate(member.createdAt) },
                  )}
                </span>
                {isSelf && (
                  <>
                    <span className="tm-member__hero-meta-dot">·</span>
                    <span className="tm-member__hero-meta-self">
                      {t.formatMessage({ id: 'team.member_v2.you_marker' })}
                    </span>
                  </>
                )}
              </span>
            </div>
          </header>

          {/* Identifier ledger — dotted-leader rows for the contact card. */}
          <div className="pm-review__ledger" role="list">
            {member.email && (
              <div className="pm-review-row" role="listitem">
                <span className="pm-review-row__label">
                  {t.formatMessage({ id: 'team.email_label' })}
                </span>
                <span className="pm-review-row__leader" aria-hidden="true" />
                <span className="pm-review-row__value pm-review-row__value--mono">
                  {maskedEmail}
                </span>
              </div>
            )}
            <div className="pm-review-row" role="listitem">
              <span className="pm-review-row__label">
                {t.formatMessage({ id: 'team.member_since_label' })}
              </span>
              <span className="pm-review-row__leader" aria-hidden="true" />
              <span className="pm-review-row__value pm-review-row__value--mono">
                {formatDate(member.createdAt)}
              </span>
            </div>
            <div className="pm-review-row" role="listitem">
              <span className="pm-review-row__label">
                {t.formatMessage({ id: 'team.member_v2.status_label' })}
              </span>
              <span className="pm-review-row__leader" aria-hidden="true" />
              <span className="pm-review-row__value pm-review-row__value--mono">
                <span className="tm-member__status-value">
                  <span
                    className={
                      isActive
                        ? 'tm-member__status-dot'
                        : 'tm-member__status-dot tm-member__status-dot--inactive'
                    }
                    aria-hidden="true"
                  />
                  {t.formatMessage({
                    id: isActive
                      ? 'team.status_active'
                      : 'team.status_disabled',
                  })}
                </span>
              </span>
            </div>
          </div>

          {/* Action ladder — only when this user can be managed. */}
          {isManageable && (
            <>
              <div className="tm-member__rule" aria-hidden="true">
                <span className="tm-member__rule-line" />
                <span className="tm-member__rule-caption">
                  {t.formatMessage({ id: 'team.member_v2.actions_caption' })}
                </span>
                <span className="tm-member__rule-line" />
              </div>

              <div className="tm-member__actions">
                {/* Primary — Change role. Mono direction stamp + chevron. */}
                <button
                  type="button"
                  className="tm-member__action tm-member__action--brand"
                  onClick={handleChangeRole}
                >
                  <span className="tm-member__action-icon">
                    <UserCog size={18} strokeWidth={1.7} />
                  </span>
                  <span className="tm-member__action-body">
                    <span className="tm-member__action-label">
                      {t.formatMessage({ id: 'team.member_v2.action_change_role' })}
                    </span>
                    <span className="tm-member__action-direction">
                      <span className="tm-member__action-direction-arrow">{'->'}</span>
                      <span>{targetRoleLabel.toUpperCase()}</span>
                    </span>
                  </span>
                  <ChevronRight
                    size={16}
                    className="tm-member__action-chev"
                    aria-hidden="true"
                  />
                </button>

                {/* Secondary — Disable / Enable. Pill on the right edge. */}
                <button
                  type="button"
                  className={
                    isActive
                      ? 'tm-member__action tm-member__action--warning'
                      : 'tm-member__action tm-member__action--success'
                  }
                  onClick={onToggleStatus}
                >
                  <span className="tm-member__action-icon">
                    <Power size={18} strokeWidth={1.7} />
                  </span>
                  <span className="tm-member__action-body">
                    <span className="tm-member__action-label">
                      {t.formatMessage({
                        id: isActive
                          ? 'team.member_v2.action_disable_label'
                          : 'team.member_v2.action_enable_label',
                      })}
                    </span>
                    <span className="tm-member__action-value">
                      {t.formatMessage({
                        id: isActive
                          ? 'team.member_v2.action_disable_value'
                          : 'team.member_v2.action_enable_value',
                      })}
                    </span>
                  </span>
                  <span
                    className={
                      isActive
                        ? 'tm-member__action-pill tm-member__action-pill--warn'
                        : 'tm-member__action-pill tm-member__action-pill--restore'
                    }
                  >
                    {t.formatMessage({
                      id: isActive
                        ? 'team.member_v2.action_disable_pill'
                        : 'team.member_v2.action_enable_pill',
                    })}
                  </span>
                </button>
              </div>

              {/* Disabled-account explanatory note. */}
              {!isActive && (
                <div className="tm-member__disabled-note" role="note">
                  <span className="tm-member__disabled-note-mark">
                    {t.formatMessage({ id: 'team.member_v2.note_marker' })}
                  </span>
                  <span className="tm-member__disabled-note-body">
                    {t.formatMessage({ id: 'team.disabled_cannot_sign_in' })}
                  </span>
                </div>
              )}

              {/* Demoted destructive link — well-separated, intentionally subdued. */}
              <div className="tm-member__danger">
                <button
                  type="button"
                  className="tm-member__danger-link"
                  onClick={handleRemove}
                >
                  <UserMinus size={14} strokeWidth={1.8} aria-hidden="true" />
                  <span>{t.formatMessage({ id: 'team.member_v2.remove_link' })}</span>
                </button>
                <p className="tm-member__danger-caption">
                  {t.formatMessage({ id: 'team.member_v2.remove_link_caption' })}
                </p>
              </div>
            </>
          )}

          {/* Self view footer — point to /account for self-management. */}
          {isSelf && (
            <div className="tm-member__self-footer">
              <p className="tm-member__self-footer-text">
                {t.formatMessage({ id: 'team.member_v2.self_footer_prose' })}
              </p>
              <Link
                to="/account"
                className="tm-member__self-footer-link"
                onClick={onClose}
              >
                <span>
                  {t.formatMessage({ id: 'team.member_v2.self_footer_link' })}
                </span>
                <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}
