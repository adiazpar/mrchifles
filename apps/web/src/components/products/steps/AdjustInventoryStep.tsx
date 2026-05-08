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
import { useProductNavRef, useEditProductCallbacks } from './ProductNavContext'
import { useApiMessage } from '@/hooks/useApiMessage'
import { ApiError } from '@/lib/api-client'

export function AdjustInventoryStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
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
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.title_adjust_inventory' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {editingProduct && (
          <div className="flex flex-col items-center py-6">
            <div className="w-56 h-56 rounded-3xl overflow-hidden flex items-center justify-center bg-bg-muted">
              {iconPreview && isPresetIcon(iconPreview) ? (
                (() => {
                  const p = getPresetIcon(iconPreview)
                  return p ? <p.icon size={120} className="text-text-primary" /> : null
                })()
              ) : iconPreview ? (
                <Image
                  src={iconPreview}
                  alt={editingProduct.name}
                  width={224}
                  height={224}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <ImagePlus className="w-20 h-20 text-text-tertiary" />
              )}
            </div>
            <div className="font-medium text-lg mt-4">{editingProduct.name}</div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg mb-4">
            {error}
          </div>
        )}

        <StockStepper value={newStockValue} onChange={setNewStockValue} />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            <IonButton
              fill="outline"
              onClick={() => navRef.current?.pop()}
              disabled={isAdjusting}
            >
              {t.formatMessage({ id: 'common.cancel' })}
            </IonButton>
            <IonButton
              onClick={handleSave}
              disabled={isAdjusting || newStockValue === (editingProduct?.stock ?? 0)}
            >
              {isAdjusting ? <IonSpinner name="crescent" /> : t.formatMessage({ id: 'common.save' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
