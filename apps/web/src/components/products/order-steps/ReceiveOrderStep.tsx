import { useMemo } from 'react'
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
} from '@ionic/react'
import { ImagePlus } from 'lucide-react'
import Image from '@/lib/Image'
import { Spinner } from '@/components/ui'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { useOrderNavRef, useOrderDetailCallbacks } from './OrderNavContext'
import { ReceiveOrderSuccessStep } from './ReceiveOrderSuccessStep'

export function ReceiveOrderStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const {
    order,
    products,
    isReceiving,
    onReceiveOrder,
    onClose,
    openedFromSwipe,
  } = useOrderDetailCallbacks()

  const productsById = useMemo(() => new Map(products.map(p => [p.id, p])), [products])

  const OrderItemIconCell = ({ productId }: { productId: string | null | undefined }) => {
    const product = productId ? productsById.get(productId) : null
    const iconUrl = product ? getProductIconUrl(product) : null
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-bg-muted flex-shrink-0">
        {iconUrl && isPresetIcon(iconUrl) ? (
          (() => {
            const p = getPresetIcon(iconUrl)
            return p ? <p.icon size={18} className="text-text-primary" /> : null
          })()
        ) : iconUrl ? (
          <Image src={iconUrl} alt="" width={32} height={32} className="object-cover w-full h-full" unoptimized />
        ) : (
          <ImagePlus className="w-4 h-4 text-text-tertiary" />
        )}
      </div>
    )
  }

  const handleReceive = async () => {
    const success = await onReceiveOrder()
    if (success) {
      navRef.current?.push(() => <ReceiveOrderSuccessStep />)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {!openedFromSwipe && (
            <IonButtons slot="start">
              <IonBackButton defaultHref="" />
            </IonButtons>
          )}
          <IonTitle>{t.formatMessage({ id: 'orders.receive_order_title' })}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Products list */}
        <div className="space-y-1 mb-4">
          {order.expand?.['order_items(order)']?.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <OrderItemIconCell productId={item.productId} />
              <span className="text-text-secondary truncate flex-1 min-w-0">{item.productName}</span>
              <span className="text-text-secondary flex-shrink-0">{item.quantity}x</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-border mb-4" />

        {/* Order details */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.total_label' })}</span>
            <span className="font-semibold">{formatCurrency(order.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.provider_label' })}</span>
            <span>{order.expand?.provider?.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.arrival_date_label' })}</span>
            <span>{formatDate(new Date())}</span>
          </div>
        </div>

        {/* Confirmation hint */}
        <p className="text-sm text-text-tertiary">{t.formatMessage({ id: 'orders.receive_confirm_description' })}</p>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            {openedFromSwipe ? (
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                {t.formatMessage({ id: 'common.cancel' })}
              </button>
            ) : (
              <button type="button" onClick={() => navRef.current?.pop()} className="btn btn-secondary flex-1">
                {t.formatMessage({ id: 'common.cancel' })}
              </button>
            )}
            <button
              type="button"
              onClick={handleReceive}
              className="btn btn-primary flex-1"
              disabled={isReceiving}
            >
              {isReceiving ? <Spinner /> : t.formatMessage({ id: 'common.confirm' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
