import { useIntl } from 'react-intl'
import { Link } from 'react-router-dom'
import { ChevronRight, UserCog, Power, UserMinus } from 'lucide-react'
import { getUserInitials } from '@kasero/shared/auth'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { UserRole } from '@kasero/shared/types'
import type { TeamMember } from '@/hooks/useTeamManagement'

interface MemberDetailsBodyProps {
  member: TeamMember
  isSelf: boolean
  isManageable: boolean
  isPromoting: boolean
  onChangeRole: () => void
  onToggleStatus: () => void
  onRemove: () => void
  /** Closes the modal when the user taps the self-footer "/account" link. */
  onCloseSelfFooterLink: () => void
}

/**
 * Root surface body of the MemberModal. Pattern:
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
export function MemberDetailsBody({
  member,
  isSelf,
  isManageable,
  isPromoting,
  onChangeRole,
  onToggleStatus,
  onRemove,
  onCloseSelfFooterLink,
}: MemberDetailsBodyProps) {
  const t = useIntl()
  const { formatDate } = useBusinessFormat()

  const isActive = member.status === 'active'

  const roleLabels: Record<UserRole, string> = {
    owner: t.formatMessage({ id: 'team.role_owner' }),
    partner: t.formatMessage({ id: 'team.role_partner' }),
    employee: t.formatMessage({ id: 'team.role_employee' }),
  }

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

  return (
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
              onClick={onChangeRole}
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
              onClick={onRemove}
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
            onClick={onCloseSelfFooterLink}
          >
            <span>
              {t.formatMessage({ id: 'team.member_v2.self_footer_link' })}
            </span>
            <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  )
}
