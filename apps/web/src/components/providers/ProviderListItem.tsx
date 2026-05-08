'use client'

import { useIntl } from 'react-intl';
import { IonItem, IonLabel } from '@ionic/react'
import type { Provider } from '@kasero/shared/types'

export function getProviderInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export interface ProviderListItemProps {
  provider: Provider
  onClick: () => void
}

export function ProviderListItem({ provider, onClick }: ProviderListItemProps) {
  const t = useIntl()
  return (
    <IonItem button detail onClick={onClick}>
      <div
        slot="start"
        className="avatar"
      >
        {getProviderInitials(provider.name)}
      </div>
      <IonLabel>
        <h3>{provider.name}</h3>
        <p>
          {provider.phone || t.formatMessage({ id: 'providers.no_phone' })}
        </p>
      </IonLabel>
      <div slot="end" className="flex items-center justify-center">
        <span className={`text-xs font-medium ${provider.active ? 'text-success' : 'text-error'}`}>
          {provider.active
            ? t.formatMessage({ id: 'providers.status_active' })
            : t.formatMessage({ id: 'providers.status_inactive' })}
        </span>
      </div>
    </IonItem>
  );
}
