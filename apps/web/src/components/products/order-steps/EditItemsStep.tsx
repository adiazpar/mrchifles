import { useIntl } from 'react-intl'
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close, chevronBack } from 'ionicons/icons'
import { Minus, Plus, Package } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useOrderNav, useOrderDetailCallbacks } from './OrderNavContext'

/**
 * Edit-flow line-items step. Restricted to the order's original line
 * items — quantities can be adjusted and a line can be removed (toggle
 * off), but new products can't be added (an order's identity is the
 * set of items it shipped with).
 *
 * Pushed from the EditOrderStep review surface. The "Done" CTA pops
 * back to EditOrderStep so the user can keep going down the section
 * list.
 */
export function EditItemsStep() {
  const t = useIntl()
  const nav = useOrderNav()
  const {
    order,
    products,
    orderItems,
    onToggleProduct,
    onUpdateQuantity,
    onClose,
  } = useOrderDetailCallbacks()

  const productsById = new Map(products.map((p) => [p.id, p]))
  const originalItems = order.expand?.['order_items(order)'] || []

  return (
    <>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              onClick={() => nav.pop()}
              aria-label={t.formatMessage({ id: 'common.back' })}
            >
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
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

      <IonContent className="wizard-content">
        <div className="wizard-step">
          <header className="wizard-hero">
            <div className="order-modal__eyebrow">
              <span>{t.formatMessage({ id: 'orders.eyebrow_edit' })}</span>
              <span className="order-modal__eyebrow-dot">·</span>
              <span className="order-modal__eyebrow-emphasis">
                {t.formatMessage({ id: 'orders.eyebrow_line_items' })}
              </span>
            </div>
            <h1 className="wizard-hero__title">
              {t.formatMessage(
                { id: 'orders.edit_items_hero_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'orders.edit_items_hero_subtitle' })}
            </p>
          </header>

          <div className="order-select__list">
            {originalItems.map((origItem) => {
              const product = productsById.get(origItem.productId ?? '')
              if (!product) return null
              const orderItem = orderItems.find((i) => i.product.id === product.id)
              const isSelected = !!orderItem
              const stockValue = product.stock ?? 0
              const isOutOfStock = stockValue === 0
              const iconUrl = getProductIconUrl(product)
              const presetIcon =
                iconUrl && isPresetIcon(iconUrl) ? getPresetIcon(iconUrl) : null

              return (
                <div
                  key={product.id}
                  className="order-product-row"
                  data-selected={isSelected || undefined}
                >
                  <button
                    type="button"
                    onClick={() => onToggleProduct(product)}
                    className="order-product-row__pick"
                  >
                    <span
                      className={`order-product-row__icon${
                        iconUrl && !presetIcon ? ' order-product-row__icon--photo' : ''
                      }`}
                    >
                      {presetIcon ? (
                        <presetIcon.icon size={22} className="text-text-primary" />
                      ) : iconUrl ? (
                        <Image src={iconUrl} alt={product.name} width={44} height={44} unoptimized />
                      ) : (
                        <Package size={18} strokeWidth={1.6} className="text-text-tertiary" />
                      )}
                    </span>
                    <span className="order-product-row__body">
                      <span className="order-product-row__name">{product.name}</span>
                      <span
                        className={`order-product-row__stock${
                          isOutOfStock ? ' order-product-row__stock--out' : ''
                        }`}
                      >
                        {t.formatMessage(
                          { id: 'orders.item_unit_count' },
                          { count: stockValue },
                        )}
                      </span>
                    </span>
                  </button>
                  {isSelected && orderItem && (
                    <div className="order-product-row__qty">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, orderItem.quantity - 1)}
                        disabled={orderItem.quantity <= 1}
                        className="order-product-row__qty-button order-product-row__qty-button--minus"
                        aria-label={t.formatMessage({ id: 'orders.decrease_qty_aria' })}
                      >
                        <Minus size={14} strokeWidth={2} />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={orderItem.quantity}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value
                          const n = val === '' ? 1 : parseInt(val, 10)
                          if (isNaN(n)) return
                          onUpdateQuantity(product.id, Math.max(1, n))
                        }}
                        aria-label={t.formatMessage({ id: 'orders.qty_aria' })}
                        className="order-product-row__qty-input"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, orderItem.quantity + 1)}
                        className="order-product-row__qty-button order-product-row__qty-button--plus"
                        aria-label={t.formatMessage({ id: 'orders.increase_qty_aria' })}
                      >
                        <Plus size={14} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={() => nav.pop()}
              disabled={orderItems.length === 0}
            >
              {t.formatMessage({ id: 'common.done' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
  )
}
