'use client'

import { useIntl } from 'react-intl';
import { IonItem, IonLabel } from '@ionic/react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { InviteCode, InviteRole } from '@kasero/shared/types'

export interface InviteCodeListItemProps {
  code: InviteCode
  onClick: () => void
}

export function InviteCodeListItem({ code, onClick }: InviteCodeListItemProps) {
  const intl = useIntl()
  const { formatDate } = useBusinessFormat()

  const roleLabels: Record<InviteRole, string> = {
    partner: intl.formatMessage({ id: 'team.role_partner' }),
    employee: intl.formatMessage({ id: 'team.role_employee' }),
  }

  return (
    <IonItem button detail onClick={onClick}>
      <IonLabel>
        <h3 className="font-display font-bold tracking-widest">{code.code}</h3>
        <p>
          {roleLabels[code.role]} &middot;{' '}
          {intl.formatMessage({ id: 'team.invite_expires' }, { date: formatDate(code.expiresAt) })}
        </p>
      </IonLabel>
    </IonItem>
  );
}
