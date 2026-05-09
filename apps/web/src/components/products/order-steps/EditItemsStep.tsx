'use client'

import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
} from '@ionic/react'
import { Minus, Plus, Package } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useOrderNavRef, useOrderDetailCallbacks } from './OrderNavContext'

/**
 * Edit-flow line-items step. Restricted to the order's original line
 * items — quantities can be adjusted and a line can be removed (toggle
 * off), but new products can't be added (an order's identity is the
 * set of items it shipped with).
 *
 * Pushed from the EditOrderStep review surface in `mode='edit'`. The
 * "Done" CTA pops back to EditOrderStep so the user can keep going
 * down the section list.
 */
export function EditItemsStep() {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const {
    order,
    products,
    orderItems,
    onToggleProduct,
    onUpdateQuantity,
  } = useOrderDetailCallbacks()

  const productsById = new Map(products.map((p) => [p.id, p]))
  const originalItems = order.expand?.['order_items(order)'] || []

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
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
                    <span className="order-product-row__icon">
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
              onClick={() => navRef.current?.pop()}
              disabled={orderItems.length === 0}
            >
              {t.formatMessage({ id: 'common.done' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
