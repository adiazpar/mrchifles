'use client'

import { useContext, useState } from 'react'
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
  IonSpinner,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { ChevronRight, ImagePlus } from 'lucide-react'
import Image from '@/lib/Image'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { useProductForm } from '@/contexts/product-form-context'
import {
  useProductNavRef,
  AddProductCallbacksContext,
  EditProductCallbacksContext,
} from './ProductNavContext'
import { NameStep } from './NameStep'
import { PriceStep } from './PriceStep'
import { CategoryStockStep } from './CategoryStockStep'
import { BarcodeStep } from './BarcodeStep'
import { AddSuccessStep } from './AddSuccessStep'
import { EditSuccessStep } from './EditSuccessStep'
import { AdjustInventoryStep } from './AdjustInventoryStep'

/**
 * Final wizard step + summary surface. Shown:
 *   - At the end of the manual wizard chain (Name → Price → Cat/Stock
 *     → Barcode → Review). The user reviews everything and taps Save.
 *   - At the end of the AI snap-to-add path (Photo → Analyzing →
 *     SuggestedCategory → Review), with all fields pre-filled by the
 *     AI pipeline. Same review-then-save pattern as manual.
 *   - As the root step of EditProductModal, with the existing product
 *     loaded into context. Tap any field row to revise just that
 *     piece.
 *
 * Each row in the field ledger is tappable — pushes the corresponding
 * step in `mode="edit"`, which configures that step's CTA to pop back
 * here instead of pushing forward in the chain.
 */
export function ReviewStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { formatCurrency } = useBusinessFormat()

  // Pull from whichever callbacks context is mounted (Add or Edit).
  // Both surfaces share this component.
  const addCtx = useContext(AddProductCallbacksContext)
  const editCtx = useContext(EditProductCallbacksContext)
  const isEdit = editCtx != null
  const onSubmit = (addCtx?.onSubmit ?? editCtx?.onSubmit) as
    | NonNullable<typeof addCtx>['onSubmit']
    | undefined
  const categories = addCtx?.categories ?? editCtx?.categories ?? []

  const {
    name,
    price,
    categoryId,
    active,
    iconPreview,
    presetEmoji,
    iconType,
    generatedIconBlob,
    barcode,
    barcodeFormat,
    barcodeSource,
    editingProduct,
    newStockValue,
    isSaving,
    setIsSaving,
    setError,
    setProductSaved,
    setLastSavedProductNumber,
    error,
  } = useProductForm()

  const [savingLocal, setSavingLocal] = useState(false)

  const isFormValid =
    name.trim().length > 0 && parseFloat(price) > 0 && !isNaN(parseFloat(price))

  const categoryName =
    categories.find((c) => c.id === categoryId)?.name ??
    t.formatMessage({ id: 'productForm.category_none' })

  // Add path: stock is the user's just-entered initial value via
  // CategoryStockStep (lives on form context as newStockValue).
  // Edit path: stock is the existing product's stock (CategoryStockStep
  // doesn't expose stock editing in edit mode — that's
  // AdjustInventoryStep).
  const stockValue = isEdit ? (editingProduct?.stock ?? 0) : newStockValue

  const handleSave = async () => {
    if (!isFormValid || !onSubmit || savingLocal) return
    setError('')
    setIsSaving(true)
    setSavingLocal(true)
    setProductSaved(false)
    try {
      const saved = await onSubmit(
        {
          name,
          price,
          categoryId,
          active,
          generatedIconBlob,
          iconType,
          presetEmoji,
          barcode,
          barcodeFormat,
          barcodeSource,
          // Edit path uses AdjustInventoryStep for stock changes
          // (different endpoint), so initialStock only matters on Add.
          initialStock: isEdit ? undefined : newStockValue,
        },
        editingProduct?.id ?? null,
      )
      if (!saved) {
        setError(t.formatMessage({ id: 'productForm.failed_to_save' }))
        return
      }
      setProductSaved(true)
      setLastSavedProductNumber(
        saved.productNumber ?? editingProduct?.productNumber ?? null,
      )
      navRef.current?.push(() =>
        isEdit ? <EditSuccessStep /> : <AddSuccessStep />,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t.formatMessage({ id: 'productForm.failed_to_save' }),
      )
    } finally {
      setIsSaving(false)
      setSavingLocal(false)
    }
  }

  const handleClose = () => {
    const cb = addCtx ?? editCtx
    cb?.onClose()
  }

  // Push a step in edit mode — that step's "Done" CTA will pop back to
  // this Review surface, preserving the user's place.
  const editName = () =>
    navRef.current?.push(() => <NameStep mode="edit" />)
  const editPrice = () =>
    navRef.current?.push(() => <PriceStep mode="edit" />)
  const editCategory = () =>
    navRef.current?.push(() => <CategoryStockStep mode="edit" />)
  const editBarcode = () =>
    navRef.current?.push(() => <BarcodeStep mode="edit" />)
  // Edit-only: stock on hand routes to the dedicated adjust step
  // (different endpoint, optimistic-locking, +/- delta UI). On Add the
  // stock value is just an initial value collected by CategoryStockStep,
  // so tapping the row there returns to that step.
  const editStock = () =>
    navRef.current?.push(() => <AdjustInventoryStep />)

  return (
    <IonPage>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonTitle>
            {t.formatMessage({
              id: isEdit
                ? 'productAddEdit.review_title_edit'
                : 'productAddEdit.review_title_add',
            })}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={handleClose}
              aria-label={t.formatMessage({ id: 'common.close' })}
            >
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell pm-review">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'productAddEdit.review_eyebrow' })}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: 'productAddEdit.review_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
          </header>

          {error && <div className="pm-error">{error}</div>}

          {/* Visual identity preview — large icon tile + Fraunces italic
              name. Tapping it jumps to NameStep in edit mode. */}
          <button
            type="button"
            className="pm-review__hero-card"
            onClick={editName}
            aria-label={t.formatMessage({ id: 'productAddEdit.review_edit_name_aria' })}
          >
            <div className="pm-review__icon">
              {iconPreview && isPresetIcon(iconPreview) ? (
                (() => {
                  const p = getPresetIcon(iconPreview)
                  return p ? (
                    <p.icon size={36} className="text-text-primary" />
                  ) : null
                })()
              ) : iconPreview ? (
                <Image
                  src={iconPreview}
                  alt=""
                  width={72}
                  height={72}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <ImagePlus size={28} className="text-text-tertiary" />
              )}
            </div>
            <div className="pm-review__hero-text">
              <span className="pm-review__name">
                {name.trim() ||
                  t.formatMessage({ id: 'productAddEdit.review_name_placeholder' })}
              </span>
              <span className="pm-review__category">{categoryName}</span>
            </div>
            <span className="pm-review__chev" aria-hidden="true">
              <ChevronRight size={18} />
            </span>
          </button>

          {/* Field ledger — each row is a tappable button with a
              dotted-leader rhythm. Tap pushes the matching step in
              edit mode. */}
          <div className="pm-review__ledger">
            <ReviewRow
              label={t.formatMessage({ id: 'productForm.price_label' })}
              value={
                parseFloat(price) > 0
                  ? formatCurrency(parseFloat(price))
                  : t.formatMessage({ id: 'productAddEdit.review_value_unset' })
              }
              valueIsSet={parseFloat(price) > 0}
              onClick={editPrice}
            />
            <ReviewRow
              label={t.formatMessage({ id: 'productForm.category_label' })}
              value={categoryName}
              valueIsSet={!!categoryId}
              onClick={editCategory}
            />
            <ReviewRow
              label={t.formatMessage({
                id: 'productAddEdit.step_initial_stock_label',
              })}
              value={t.formatMessage(
                { id: 'products.units_count' },
                { count: stockValue },
              )}
              valueIsSet={true}
              onClick={isEdit ? editStock : editCategory}
            />
            <ReviewRow
              label={t.formatMessage({ id: 'productForm.tab_barcode' })}
              value={
                barcode
                  ? barcode
                  : t.formatMessage({ id: 'productAddEdit.review_value_unset' })
              }
              valueIsSet={!!barcode}
              onClick={editBarcode}
              valueIsMono
            />
          </div>
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <IonButton
              onClick={handleSave}
              disabled={!isFormValid || savingLocal || isSaving}
              data-haptic
            >
              {savingLocal || isSaving ? (
                <IonSpinner name="crescent" />
              ) : (
                t.formatMessage({
                  id: isEdit
                    ? 'productAddEdit.review_save_edit'
                    : 'productAddEdit.review_save_add',
                })
              )}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}

interface ReviewRowProps {
  label: string
  value: string
  valueIsSet: boolean
  onClick: () => void
  valueIsMono?: boolean
}

function ReviewRow({ label, value, valueIsSet, onClick, valueIsMono }: ReviewRowProps) {
  const valueClass = [
    'pm-review-row__value',
    valueIsMono ? 'pm-review-row__value--mono' : '',
    !valueIsSet ? 'pm-review-row__value--unset' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className="pm-review-row" onClick={onClick}>
      <span className="pm-review-row__label">{label}</span>
      <span className="pm-review-row__leader" aria-hidden="true" />
      <span className={valueClass}>{value}</span>
      <ChevronRight className="pm-review-row__chev" size={14} />
    </button>
  )
}
