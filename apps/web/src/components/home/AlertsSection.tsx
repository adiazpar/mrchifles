'use client'

import { useIntl } from 'react-intl'
import { IonItem, IonLabel, IonList, IonNote } from '@ionic/react'
import { PackageX, Clock } from 'lucide-react'
import { GroupLabel } from '@/components/ui'

interface AlertsSectionProps {
  lowStockCount: number
  pendingOrdersCount: number
  onLowStockClick: () => void
  onPendingOrdersClick: () => void
}

export function AlertsSection({
  lowStockCount,
  pendingOrdersCount,
  onLowStockClick,
  onPendingOrdersClick,
}: AlertsSectionProps) {
  const intl = useIntl()

  if (lowStockCount === 0 && pendingOrdersCount === 0) {
    return null
  }

  return (
    <>
      <GroupLabel>
        {intl.formatMessage({ id: 'home.section_needs_attention' })}
      </GroupLabel>
      <IonList inset lines="full" className="home-alerts">
        {lowStockCount > 0 ? (
          <IonItem button detail onClick={onLowStockClick}>
            <PackageX slot="start" className="text-text-secondary w-5 h-5" />
            <IonLabel>
              <h3>{intl.formatMessage({ id: 'home.row_low_stock' })}</h3>
            </IonLabel>
            <IonNote slot="end">
              {intl.formatMessage(
                { id: 'home.row_low_stock_count' },
                { count: lowStockCount },
              )}
            </IonNote>
          </IonItem>
        ) : null}
        {pendingOrdersCount > 0 ? (
          <IonItem button detail onClick={onPendingOrdersClick}>
            <Clock slot="start" className="text-text-secondary w-5 h-5" />
            <IonLabel>
              <h3>{intl.formatMessage({ id: 'home.row_pending_orders' })}</h3>
            </IonLabel>
            <IonNote slot="end">
              {intl.formatMessage(
                { id: 'home.row_pending_orders_count' },
                { count: pendingOrdersCount },
              )}
            </IonNote>
          </IonItem>
        ) : null}
      </IonList>
    </>
  )
}
