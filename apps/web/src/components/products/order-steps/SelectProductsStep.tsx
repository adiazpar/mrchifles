import { useCallback, useState } from 'react'
import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { X, ImagePlus, Loader2, ScanLine, Minus, Plus } from 'lucide-react'
import Image from '@/lib/Image'
import { getProductIconUrl } from '@/lib/utils'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { useOrderNavRef, useNewOrderCallbacks } from './OrderNavContext'
import { OrderDetailsStep } from './OrderDetailsStep'

export function SelectProductsStep() {
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
        <IonToolbar>
          <IonTitle>{t.formatMessage({ id: 'orders.step_select_products' })}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} aria-label={t.formatMessage({ id: 'common.close' })}>
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Search bar + scan button */}
        <div className="flex gap-2 items-stretch mb-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t.formatMessage({ id: 'orders.product_search_placeholder' })}
              value={productSearchQuery}
              onChange={e => onProductSearchQueryChange(e.target.value)}
              className="input input-search w-full h-full"
              style={{ paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)', paddingRight: '2.25rem', fontSize: 'var(--text-sm)', minHeight: 'unset' }}
            />
            {productSearchQuery && (
              <button
                type="button"
                onClick={() => onProductSearchQueryChange('')}
                className="absolute inset-y-0 right-3 flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
                aria-label={t.formatMessage({ id: 'orders.search_clear' })}
              >
                <X size={18} />
              </button>
            )}
          </div>
          <IonButton
            fill="outline"
            shape="round"
            onClick={() => { setScanError(''); openScanner() }}
            disabled={scanBusy}
            aria-label={t.formatMessage({ id: 'orders.scan_button_aria' })}
          >
            {scanBusy ? (
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
            ) : (
              <ScanLine size={18} />
            )}
          </IonButton>
        </div>
        {scanHiddenInput}
        {scanError && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-3">{scanError}</div>
        )}

        <button
          type="button"
          disabled
          className="image-upload-zone w-full mb-3"
          title={t.formatMessage({ id: 'orders.import_coming_soon' })}
          aria-label={t.formatMessage({ id: 'orders.import_invoice_button' })}
        >
          <ImagePlus className="w-6 h-6 text-text-tertiary" />
          <span className="text-sm text-text-tertiary mt-2">{t.formatMessage({ id: 'orders.import_invoice_button' })}</span>
          <span className="text-xs text-text-tertiary mt-1">{t.formatMessage({ id: 'orders.import_coming_soon' })}</span>
        </button>

        <p className="text-xs text-text-tertiary mb-3">
          {t.formatMessage({ id: 'orders.products_selected' }, { count: orderItems.length })}
        </p>

        {/* Products list */}
        {filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-text-tertiary">{t.formatMessage({ id: 'orders.no_products_found' })}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map(product => {
              const orderItem = orderItems.find(i => i.product.id === product.id)
              const isSelected = !!orderItem
              const stockValue = product.stock ?? 0
              const isOutOfStock = stockValue === 0
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200"
                  style={{
                    border: `1px solid ${isSelected ? 'var(--color-brand)' : 'var(--color-border)'}`,
                    backgroundColor: isSelected ? 'var(--color-brand-subtle)' : 'var(--color-bg-surface)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onToggleProduct(product)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="product-list-image">
                      {(() => {
                        const iconUrl = getProductIconUrl(product)
                        if (iconUrl && isPresetIcon(iconUrl)) {
                          const p = getPresetIcon(iconUrl)
                          return p ? <p.icon size={24} className="text-text-primary" /> : null
                        }
                        if (iconUrl) {
                          return (
                            <Image
                              src={iconUrl}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="product-list-image-img"
                              unoptimized
                            />
                          )
                        }
                        return <ImagePlus className="w-5 h-5 text-text-tertiary" />
                      })()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-medium truncate block">{product.name}</span>
                      <span className={`text-xs ${isOutOfStock ? 'text-error' : 'text-text-tertiary'}`}>
                        {t.formatMessage({ id: 'orders.item_unit_count' }, { count: stockValue })}
                      </span>
                    </div>
                  </button>
                  {isSelected && orderItem && (
                    <div
                      className="flex-shrink-0 flex rounded-lg overflow-hidden bg-bg-muted"
                      style={{ height: 48 }}
                    >
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
                        className="w-10 text-center text-sm font-semibold bg-bg-muted text-text-primary focus:outline-none"
                      />
                      <div className="flex flex-col" style={{ borderLeft: '1px solid var(--color-border)' }}>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, orderItem.quantity + 1)}
                          className="flex-1 flex items-center justify-center px-2 bg-bg-muted transition-colors active:bg-bg-surface"
                          style={{ borderBottom: '1px solid var(--color-border)' }}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, orderItem.quantity - 1)}
                          disabled={orderItem.quantity <= 1}
                          className="flex-1 flex items-center justify-center px-2 bg-bg-muted transition-colors active:bg-bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <IonButton
            expand="block"
            onClick={() => navRef.current?.push(() => <OrderDetailsStep />)}
            disabled={orderItems.length === 0}
          >
            {t.formatMessage({ id: 'common.continue' })}
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
