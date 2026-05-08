import { useMemo } from 'react'
import { useIntl } from 'react-intl'
import { useParams } from 'react-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
} from '@ionic/react'
import { Pencil, Trash2, ImagePlus } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { usePageTransition } from '@/contexts/page-transition-context'
import { getOrderDisplayStatus } from '@/lib/products'
import { useOrderNavRef, useOrderDetailCallbacks } from './OrderNavContext'
import { EditOrderStep } from './EditOrderStep'
import { ReceiveOrderStep } from './ReceiveOrderStep'
import { DeleteOrderConfirmStep } from './DeleteOrderConfirmStep'

export function OrderOverviewStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const { formatCurrency, formatDate } = useBusinessFormat()
  const params = useParams<{ businessId: string }>()
  const { navigate } = usePageTransition()
  const {
    order,
    products,
    onClose,
    onExitComplete,
    onInitializeEditForm,
    onInitializeReceiveQuantities,
    getReceiptUrl,
    canDelete,
    canManage,
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
    )
  }

  const headingTitle = order.orderNumber != null
    ? t.formatMessage({ id: 'orders.detail_title_with_ref' }, { number: order.orderNumber })
    : t.formatMessage({ id: 'orders.detail_title' })

  function handleClose() {
    onClose()
    onExitComplete()
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{headingTitle}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleClose}>{t.formatMessage({ id: 'common.close' })}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Products list */}
        <div className="space-y-1 mb-4">
          {order.expand?.['order_items(order)']?.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <OrderItemIconCell productId={item.productId} />
              <span className="text-text-secondary truncate flex-1 min-w-0">{item.productName}</span>
              <span className="text-text-secondary flex-shrink-0 tabular-nums">{item.quantity}x</span>
              {item.unitCost != null && (
                <>
                  <span className="text-text-tertiary flex-shrink-0 tabular-nums w-16 text-right">
                    {formatCurrency(item.unitCost)}
                  </span>
                  <span className="text-text-primary flex-shrink-0 tabular-nums w-20 text-right font-medium">
                    {formatCurrency(item.subtotal ?? item.unitCost * item.quantity)}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Variance — only renders when received AND at least one item differs */}
        {order.status === 'received' && (() => {
          const varianceItems = (order.expand?.['order_items(order)'] || []).filter(
            item => item.receivedQuantity != null && item.receivedQuantity !== item.quantity
          )
          if (varianceItems.length === 0) return null
          return (
            <div className="mb-4">
              <span className="text-xs font-medium uppercase tracking-wide text-warning">
                {t.formatMessage({ id: 'orders.variance_section_title' })}
              </span>
              <div className="space-y-1 mt-1">
                {varianceItems.map(item => (
                  <div key={`variance-${item.id}`} className="flex items-center gap-2 text-sm text-warning">
                    <OrderItemIconCell productId={item.productId} />
                    <span className="truncate flex-1 min-w-0">{item.productName}</span>
                    <span className="flex-shrink-0">
                      {t.formatMessage(
                        { id: 'orders.variance_item_line' },
                        { ordered: item.quantity, received: item.receivedQuantity ?? 0 }
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Divider */}
        <div className="border-t border-dashed border-border mb-4" />

        {/* Total + Status */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.total_label' })}</span>
            <span className="font-semibold">{formatCurrency(order.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.status_label' })}</span>
            {(() => {
              const ds = getOrderDisplayStatus(order)
              const colorMap = { pending: 'text-warning', received: 'text-success', overdue: 'text-error' }
              const labelMap = {
                pending: t.formatMessage({ id: 'orders.status_pending' }),
                received: t.formatMessage({ id: 'orders.status_received' }),
                overdue: t.formatMessage({ id: 'orders.status_overdue' }),
              }
              return <span className={colorMap[ds]}>{labelMap[ds]}</span>
            })()}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-border mb-4" />

        {/* Ordered on / by / to + arrival + receipt */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.ordered_on_label' })}</span>
            <span className="tabular-nums">{formatDate(new Date(order.date))}</span>
          </div>
          {order.expand?.createdByUser && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.ordered_by_label' })}</span>
              <span>{order.expand.createdByUser.name || order.expand.createdByUser.email}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.ordered_to_label' })}</span>
            {order.providerId && order.expand?.provider?.name ? (
              <button
                type="button"
                onClick={() => {
                  if (!params?.businessId || !order.providerId) return
                  const href = `/${params.businessId}/providers/${order.providerId}`
                  onClose()
                  setTimeout(() => {
                    navigate(href)
                  }, 200)
                }}
                className="text-brand hover:underline text-right"
              >
                {order.expand.provider.name}
              </button>
            ) : (
              <span>{order.expand?.provider?.name || '-'}</span>
            )}
          </div>
          {order.estimatedArrival && order.status !== 'received' && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.est_arrival_label' })}</span>
              <span className="tabular-nums">{formatDate(new Date(order.estimatedArrival))}</span>
            </div>
          )}
          {order.receivedDate && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.received_date_label' })}</span>
              <span className="tabular-nums">{formatDate(new Date(order.receivedDate))}</span>
            </div>
          )}
          {order.expand?.receivedByUser && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.received_by_label' })}</span>
              <span>{order.expand.receivedByUser.name || order.expand.receivedByUser.email}</span>
            </div>
          )}
          {order.receipt && (
            <div className="flex justify-between">
              <span className="text-text-tertiary">{t.formatMessage({ id: 'orders.receipt_attached_label' })}</span>
              <a
                href={getReceiptUrl(order) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand"
              >
                {t.formatMessage({ id: 'orders.view_attachment' })}
              </a>
            </div>
          )}
        </div>
      </IonContent>

      {/* Footer: pending vs received */}
      {order.status === 'pending' ? (
        <IonFooter>
          <IonToolbar className="ion-padding-horizontal">
            <div className="flex gap-2">
              {canDelete && (
                <IonButton
                  fill="outline"
                  shape="round"
                  onClick={() => navRef.current?.push(() => <DeleteOrderConfirmStep />)}
                  aria-label={t.formatMessage({ id: 'orders.delete_order_title' })}
                >
                  <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
                </IonButton>
              )}
              {canManage && (
                <IonButton
                  fill="outline"
                  shape="round"
                  onClick={() => {
                    onInitializeEditForm(order)
                    navRef.current?.push(() => <EditOrderStep />)
                  }}
                  aria-label={t.formatMessage({ id: 'orders.edit_order_aria' })}
                >
                  <Pencil className="text-brand" style={{ width: 16, height: 16 }} />
                </IonButton>
              )}
              <IonButton
                onClick={() => {
                  onInitializeReceiveQuantities(order)
                  navRef.current?.push(() => <ReceiveOrderStep />)
                }}
              >
                {t.formatMessage({ id: 'orders.receive_button' })}
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      ) : (
        <IonFooter>
          <IonToolbar className="ion-padding-horizontal">
            <IonButton expand="block" onClick={handleClose}>
              {t.formatMessage({ id: 'common.close' })}
            </IonButton>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  )
}
