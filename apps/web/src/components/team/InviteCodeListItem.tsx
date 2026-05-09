'use client'

import { useIntl } from 'react-intl'
import { ChevronRight, Mail } from 'lucide-react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { InviteCode, InviteRole } from '@kasero/shared/types'

export interface InviteCodeListItemProps {
  code: InviteCode
  onClick: () => void
}

/**
 * Pending invite row — same primitive as TeamMemberListItem. Avatar slot
 * holds an envelope glyph at 36px (matching the member-row avatar size),
 * the 6-char code takes the primary line in tracked JetBrains Mono, and
 * the secondary mono caption reads `ROLE · EXPIRES MM/DD/YYYY`. Tapping
 * opens the existing InviteModal.
 */
export function InviteCodeListItem({ code, onClick }: InviteCodeListItemProps) {
  const t = useIntl()
  const { formatDate } = useBusinessFormat()

  const roleLabels: Record<InviteRole, string> = {
    partner: t.formatMessage({ id: 'team.role_partner' }),
    employee: t.formatMessage({ id: 'team.role_employee' }),
  }

  return (
    <button type="button" className="tm-roster__row" onClick={onClick}>
      <span className="tm-roster__avatar" aria-hidden="true">
        <Mail />
      </span>

      <span className="tm-roster__row-body">
        <span className="tm-roster__row-code">{code.code}</span>
        <span className="tm-roster__row-meta">
          <span className="tm-roster__row-role">
            {roleLabels[code.role].toUpperCase()}
          </span>
          <span className="tm-roster__row-meta-sep" aria-hidden="true">·</span>
          <span>
            {t.formatMessage(
              { id: 'team.roster.invite_expires_short' },
              { date: formatDate(code.expiresAt) },
            )}
          </span>
        </span>
      </span>

      <ChevronRight size={16} className="tm-roster__row-chev" aria-hidden="true" />
    </button>
  )
}
