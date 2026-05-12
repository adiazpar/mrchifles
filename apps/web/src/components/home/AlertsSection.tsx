'use client'

import { useIntl } from 'react-intl'
import { IonItem, IonLabel, IonList, IonNote } from '@ionic/react'
import { PackageX, AlertTriangle, Clock } from 'lucide-react'
import { GroupLabel } from '@/components/ui'

interface AlertsSectionProps {
  lowStockCount: number
  overdueCount?: number
  pendingOrdersCount: number
  onLowStockClick: () => void
  onOverdueClick?: () => void
  onPendingOrdersClick: () => void
}

export function AlertsSection({
  lowStockCount,
  overdueCount = 0,
  pendingOrdersCount,
  onLowStockClick,
  onOverdueClick,
  onPendingOrdersClick,
}: AlertsSectionProps) {
  const intl = useIntl()

  if (lowStockCount === 0 && overdueCount === 0 && pendingOrdersCount === 0) {
    return null
  }

  return (
    <>
      <GroupLabel>
        {intl.formatMessage({ id: 'home.section_needs_attention' })}
      </GroupLabel>
      <IonList inset lines="full" className="account-list home-alerts">
        {lowStockCount > 0 ? (
          <IonItem button detail onClick={onLowStockClick}>
            <PackageX slot="start" className="home-alerts__icon home-alerts__icon--warn w-5 h-5" />
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
        {overdueCount > 0 && onOverdueClick ? (
          <IonItem button detail onClick={onOverdueClick}>
            <AlertTriangle slot="start" className="home-alerts__icon home-alerts__icon--overdue w-5 h-5" />
            <IonLabel>
              <h3>{intl.formatMessage({ id: 'home.row_overdue' })}</h3>
            </IonLabel>
            <IonNote slot="end">
              {intl.formatMessage(
                { id: 'home.row_overdue_count' },
                { count: overdueCount },
              )}
            </IonNote>
          </IonItem>
        ) : null}
        {pendingOrdersCount > 0 ? (
          <IonItem button detail onClick={onPendingOrdersClick}>
            <Clock slot="start" className="home-alerts__icon w-5 h-5" />
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
