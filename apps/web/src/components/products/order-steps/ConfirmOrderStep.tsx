import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
  IonSpinner,
} from '@ionic/react'
import { ImagePlus } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNavRef, useNewOrderCallbacks } from './OrderNavContext'
import { NewOrderSuccessStep } from './NewOrderSuccessStep'

export function ConfirmOrderStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const {
    providers,
    orderItems,
    orderTotal,
    orderEstimatedArrival,
    orderReceiptFile,
    orderProvider,
    isSaving,
    error,
    onSaveOrder,
  } = useNewOrderCallbacks()

  const handleConfirm = async () => {
    const success = await onSaveOrder()
    if (success) {
      navRef.current?.push(() => <NewOrderSuccessStep />)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>{t.formatMessage({ id: 'orders.step_confirm_order' })}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">{error}</div>
        )}

        {/* Products list */}
        <div className="space-y-1 mb-4">
          {orderItems.map(item => {
            const iconUrl = getProductIconUrl(item.product)
            return (
              <div key={item.product.id} className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-bg-muted flex-shrink-0">
                  {iconUrl && isPresetIcon(iconUrl) ? (
                    (() => {
                      const p = getPresetIcon(iconUrl)
                      return p ? <p.icon size={18} className="text-text-primary" /> : null
                    })()
                  ) : iconUrl ? (
                    <Image
                      src={iconUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <ImagePlus className="w-4 h-4 text-text-tertiary" />
                  )}
                </div>
                <span className="text-text-secondary truncate flex-1 min-w-0">{item.product.name}</span>
                <span className="text-text-secondary flex-shrink-0">{item.quantity}x</span>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-border mb-4" />

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.total_label' })}</span>
            <span className="font-semibold">{orderTotal ? formatCurrency(parseFloat(orderTotal)) : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.provider_label' })}</span>
            <span>{providers.find(p => p.id === orderProvider)?.name || '-'}</span>
          </div>
          {orderEstimatedArrival && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.est_arrival_label' })}</span>
              <span>{formatDate(orderEstimatedArrival)}</span>
            </div>
          )}
          {orderReceiptFile && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.receipt_attached_label' })}</span>
              <span className="text-success">{t.formatMessage({ id: 'orders.receipt_attached_value' })}</span>
            </div>
          )}
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <button
            type="button"
            onClick={handleConfirm}
            className="btn btn-primary w-full"
            disabled={isSaving}
          >
            {isSaving ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.confirm' })}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
