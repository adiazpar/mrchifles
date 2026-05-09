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
  IonButton,
} from '@ionic/react'
import { ImagePlus } from 'lucide-react'
import Image from '@/lib/Image'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { StockStepper } from '@/components/ui'
import { useProductForm } from '@/contexts/product-form-context'
import { useEditProductCallbacks } from './ProductNavContext'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError } from '@/lib/api-client'

export function AdjustInventoryStep() {
  const t = useIntl()
  const { onSaveAdjustment } = useEditProductCallbacks()
  const translateApiMessage = useApiMessage()
  const {
    editingProduct,
    iconPreview,
    newStockValue,
    setNewStockValue,
    isAdjusting,
    error,
    setError,
  } = useProductForm()

  const currentStock = editingProduct?.stock ?? 0
  const delta = newStockValue - currentStock
  const isDirty = delta !== 0

  const deltaClass = isDirty
    ? delta > 0
      ? 'pm-adjust__preview-delta--up'
      : 'pm-adjust__preview-delta--down'
    : 'pm-adjust__preview-delta--zero'

  const handleSave = async () => {
    if (!editingProduct) return
    setError('')
    try {
      await onSaveAdjustment({
        productId: editingProduct.id,
        newStockValue,
        expectedStockValue: editingProduct.stock ?? 0,
      })
    } catch (err) {
      if (err instanceof ApiError && err.envelope) {
        setError(translateApiMessage(err.envelope))
      } else {
        setError(
          err instanceof Error
            ? err.message
            : t.formatMessage({ id: 'productForm.failed_to_save' }),
        )
      }
    }
  }

  return (
    <IonPage>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.title_adjust_inventory' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'productAddEdit.adjust_eyebrow' })}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: 'productAddEdit.adjust_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
          </header>

          {error && <div className="pm-error">{error}</div>}

          {editingProduct && (
            <div className="pm-adjust">
              <div className="pm-adjust__hero">
                <div className="pm-adjust__icon">
                  {iconPreview && isPresetIcon(iconPreview) ? (
                    (() => {
                      const p = getPresetIcon(iconPreview)
                      return p ? (
                        <p.icon size={32} className="text-text-primary" />
                      ) : null
                    })()
                  ) : iconPreview ? (
                    <Image
                      src={iconPreview}
                      alt={editingProduct.name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <ImagePlus size={26} />
                  )}
                </div>
                <div className="pm-adjust__head">
                  <h2 className="pm-adjust__name">{editingProduct.name}</h2>
                  <span className="pm-adjust__current">
                    <span>
                      {t.formatMessage({
                        id: 'productAddEdit.adjust_current_label',
                      })}
                    </span>
                    <span className="pm-adjust__current-num">
                      {currentStock}
                    </span>
                  </span>
                </div>
              </div>

              <div className="pm-field">
                <span className="pm-field-label">
                  {t.formatMessage({ id: 'productAddEdit.adjust_set_to_label' })}
                </span>
                <StockStepper
                  value={newStockValue}
                  onChange={setNewStockValue}
                />
              </div>

              <div className="pm-adjust__preview">
                <span className="pm-adjust__preview-label">
                  {t.formatMessage({ id: 'productAddEdit.adjust_change_label' })}
                </span>
                <span className={`pm-adjust__preview-delta ${deltaClass}`}>
                  <span>
                    {isDirty
                      ? `${delta > 0 ? '+' : ''}${delta}`
                      : t.formatMessage({
                          id: 'productAddEdit.adjust_no_change',
                        })}
                  </span>
                  {isDirty && (
                    <>
                      <span className="pm-adjust__preview-arrow">{'->'}</span>
                      <span>{newStockValue}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <IonButton
              onClick={handleSave}
              disabled={isAdjusting || !isDirty}
            >
              {isAdjusting ? (
                <IonSpinner name="crescent" />
              ) : (
                t.formatMessage({ id: 'common.save' })
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
