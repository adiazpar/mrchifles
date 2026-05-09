import { useCallback, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { X, Loader2, ScanLine, Minus, Plus, Package } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { useOrderNavRef, useNewOrderCallbacks } from './OrderNavContext'
import { OrderTotalStep } from './OrderTotalStep'

interface SelectProductsStepProps {
  /**
   * Defaults to `forward` (the wizard chain). Pass `edit` when this
   * step is pushed from ConfirmOrderStep so the CTA pops back to
   * Confirm instead of pushing OrderTotalStep.
   */
  mode?: 'forward' | 'edit'
}

export function SelectProductsStep({ mode = 'forward' }: SelectProductsStepProps = {}) {
  const t = useIntl()
  const navRef = useOrderNavRef()
  const {
    products,
    filteredProducts,
    orderItems,
    onToggleProduct,
    onUpdateQuantity,
    setOrderItems,
    productSearchQuery,
    onProductSearchQueryChange,
    onClose,
  } = useNewOrderCallbacks()

  const [scanError, setScanError] = useState('')

  const handleScanResult = useCallback(({ value }: { value: string }) => {
    setScanError('')
    const match = products.find(p => p.barcode === value)
    if (match) {
      if (!orderItems.some(i => i.product.id === match.id)) {
        onToggleProduct(match)
      }
    } else {
      setScanError(t.formatMessage({ id: 'orders.scan_no_match' }))
    }
  }, [products, orderItems, onToggleProduct, t])

  const { open: openScanner, busy: scanBusy, hiddenInput: scanHiddenInput } = useBarcodeScan({
    onResult: handleScanResult,
    onError: (message) => setScanError(message),
  })

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="wizard-toolbar">
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={onClose} aria-label={t.formatMessage({ id: 'common.close' })}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="wizard-content">
        <div className="wizard-step">
          <header className="wizard-hero">
            <div className="order-modal__eyebrow">
              <span>{t.formatMessage({ id: 'orders.eyebrow_order' })}</span>
              <span className="order-modal__eyebrow-dot">·</span>
              <span className="order-modal__eyebrow-emphasis">
                {t.formatMessage({ id: 'orders.eyebrow_new' })}
              </span>
            </div>
            <h1 className="wizard-hero__title">
              {t.formatMessage(
                { id: 'orders.select_hero_title' },
                {
                  em: (chunks) => <em>{chunks}</em>,
                },
              )}
            </h1>
            <p className="wizard-hero__subtitle">
              {t.formatMessage({ id: 'orders.select_hero_subtitle' })}
            </p>
          </header>

          {/* Search bar + scan button */}
          <div>
            <div className="order-select__tools">
              <div className="order-select__search">
                <input
                  type="text"
                  placeholder={t.formatMessage({ id: 'orders.product_search_placeholder' })}
                  value={productSearchQuery}
                  onChange={e => onProductSearchQueryChange(e.target.value)}
                  className="order-select__search-input"
                />
                {productSearchQuery && (
                  <button
                    type="button"
                    onClick={() => onProductSearchQueryChange('')}
                    className="order-select__search-clear"
                    aria-label={t.formatMessage({ id: 'orders.search_clear' })}
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
              <button
                type="button"
                className="order-select__scan-button"
                onClick={() => { setScanError(''); openScanner() }}
                disabled={scanBusy}
                aria-label={t.formatMessage({ id: 'orders.scan_button_aria' })}
              >
                {scanBusy ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ScanLine size={18} strokeWidth={1.8} />
                )}
              </button>
            </div>
            {scanHiddenInput}
            {scanError && (
              <div className="order-select__scan-error" role="alert">{scanError}</div>
            )}
          </div>

          {/* Disabled "Import from invoice" tile — future surface. */}
          <div
            className="order-select__import-tile"
            role="note"
            aria-label={t.formatMessage({ id: 'orders.import_invoice_button' })}
          >
            <span className="order-select__import-tile-label">
              {t.formatMessage({ id: 'orders.import_invoice_button' })}
            </span>
            <span className="order-select__import-tile-meta">
              {t.formatMessage({ id: 'orders.import_coming_soon' })}
            </span>
          </div>

          {/* Section eyebrow + count of selected products */}
          <div className="order-select__section-eyebrow">
            <span>{t.formatMessage({ id: 'orders.eyebrow_catalog' })}</span>
            <span className="order-select__section-count">
              {t.formatMessage(
                { id: 'orders.products_selected_short' },
                { count: orderItems.length },
              )}
            </span>
          </div>

          {/* Products list */}
          {filteredProducts.length === 0 ? (
            <div className="order-select__empty">
              {t.formatMessage({ id: 'orders.no_products_found' })}
            </div>
          ) : (
            <div className="order-select__list">
              {filteredProducts.map(product => {
                const orderItem = orderItems.find(i => i.product.id === product.id)
                const isSelected = !!orderItem
                const stockValue = product.stock ?? 0
                const isOutOfStock = stockValue === 0
                const iconUrl = getProductIconUrl(product)
                const presetIcon = iconUrl && isPresetIcon(iconUrl) ? getPresetIcon(iconUrl) : null
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
                          <Image
                            src={iconUrl}
                            alt={product.name}
                            width={44}
                            height={44}
                            unoptimized
                          />
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
                            if (val === '') {
                              setOrderItems(prev => prev.map(i =>
                                i.product.id === product.id
                                  ? { ...i, quantity: '' as unknown as number }
                                  : i
                              ))
                            } else {
                              const num = parseInt(val, 10)
                              if (!isNaN(num)) {
                                onUpdateQuantity(product.id, Math.max(1, num))
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10)
                            if (isNaN(val) || val < 1) {
                              onUpdateQuantity(product.id, 1)
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          className="order-product-row__qty-input"
                          aria-label={t.formatMessage({ id: 'orders.qty_aria' })}
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
          )}
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={() =>
                mode === 'edit'
                  ? navRef.current?.pop()
                  : navRef.current?.push(() => <OrderTotalStep mode="forward" />)
              }
              disabled={orderItems.length === 0}
            >
              {t.formatMessage({ id: 'common.continue' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
