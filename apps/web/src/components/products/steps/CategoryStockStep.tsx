'use client'

import { useIntl } from 'react-intl'
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { chevronBack } from 'ionicons/icons'
import { Check, Minus, Plus } from 'lucide-react'
import { useProductForm } from '@/contexts/product-form-context'
import { useContext } from 'react'
import {
  useProductNav,
  AddProductCallbacksContext,
  EditProductCallbacksContext,
} from './ProductNavContext'

interface CategoryStockStepProps {
  mode: 'forward' | 'edit'
}

/**
 * Wizard step 3 of 4: category + initial stock. The category picker
 * uses the same .sort-sheet-row vocabulary as the Products tab sort
 * sheet so users see one consistent list-row pattern across the
 * surface. Stock is a simple number input with +/- steppers — only
 * surfaced on Add (edit path uses AdjustInventoryStep instead).
 */
export function CategoryStockStep({ mode }: CategoryStockStepProps) {
  const t = useIntl()
  const nav = useProductNav()
  // The wizard runs under either AddProductCallbacks or
  // EditProductCallbacks. Both expose `categories`. Read from whichever
  // is mounted — this component is shared across both modal flows.
  const addCtx = useContext(AddProductCallbacksContext)
  const editCtx = useContext(EditProductCallbacksContext)
  const categories = addCtx?.categories ?? editCtx?.categories ?? []
  const isEditFlow = editCtx != null

  const { categoryId, setCategoryId, editingProduct } = useProductForm()

  const hasFieldChange =
    mode !== 'edit' ||
    !editingProduct ||
    (categoryId || null) !== (editingProduct.categoryId || null)

  const handleContinue = () => {
    if (!hasFieldChange) return
    if (mode === 'edit') {
      nav.pop()
    } else {
      nav.push('barcode-forward')
    }
  }

  return (
    <>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              fill="clear"
              onClick={() => nav.pop()}
              aria-label={t.formatMessage({ id: 'common.back' })}
            >
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'productAddEdit.step_category_title_short' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'productAddEdit.step_category_eyebrow' })}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: 'productAddEdit.step_category_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
          </header>

          {/* Category picker — radio rows */}
          <section className="pm-field">
            <span className="pm-field-label">
              {t.formatMessage({ id: 'productForm.category_label' })}
            </span>
            <div className="pm-category-list">
              <button
                type="button"
                className={`sort-sheet-row${categoryId === '' ? ' sort-sheet-row--selected' : ''}`}
                onClick={() => setCategoryId('')}
              >
                <span className="sort-sheet-row__label">
                  {t.formatMessage({ id: 'productForm.category_none' })}
                </span>
                {categoryId === '' && (
                  <span className="sort-sheet-row__check" aria-hidden="true">
                    <Check size={18} strokeWidth={2.4} />
                  </span>
                )}
              </button>
              {[...categories]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((cat) => {
                  const selected = cat.id === categoryId
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`sort-sheet-row${selected ? ' sort-sheet-row--selected' : ''}`}
                      onClick={() => setCategoryId(cat.id)}
                    >
                      <span className="sort-sheet-row__label">{cat.name}</span>
                      {selected && (
                        <span className="sort-sheet-row__check" aria-hidden="true">
                          <Check size={18} strokeWidth={2.4} />
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
          </section>

          {/* Initial stock — only shown on Add (edit uses AdjustInventoryStep).
              When editing an existing product, the stock value is fixed in
              context but we don't expose it here; the user has a separate
              "Adjust inventory" affordance from the row swipe. */}
          {!isEditFlow && (
            <section className="pm-field">
              <label htmlFor="wizard-initial-stock" className="pm-field-label">
                {t.formatMessage({ id: 'productAddEdit.step_initial_stock_label' })}
              </label>
              <InitialStockInput />
              <p className="pm-field-helper">
                {t.formatMessage({ id: 'productAddEdit.step_initial_stock_helper' })}
              </p>
            </section>
          )}

          {isEditFlow && editingProduct && (
            <p className="pm-field-helper">
              {t.formatMessage(
                { id: 'productAddEdit.step_stock_edit_hint' },
                { count: editingProduct.stock ?? 0 },
              )}
            </p>
          )}
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <IonButton onClick={handleContinue} disabled={!hasFieldChange}>
              {t.formatMessage({
                id: mode === 'edit'
                  ? 'productAddEdit.step_done_cta'
                  : 'productAddEdit.step_continue_cta',
              })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
  )
}

/**
 * Tiny stock-stepper for the wizard's initial-stock row. Backs the
 * `newStockValue` field in the form context (already there for the
 * AdjustInventoryStep path; we reuse it here for new-product creation
 * so the on-submit handler picks up a single source of truth).
 *
 * The actual API insert sets stock: 0 today (handled in the products
 * route); this control is forward-looking — when the route accepts an
 * `initialStock` form field, this hook-up is already in place.
 */
function InitialStockInput() {
  const t = useIntl()
  const { newStockValue, setNewStockValue } = useProductForm()
  const value = newStockValue || 0

  return (
    <div className="pm-stock-stepper">
      <button
        type="button"
        className="pm-stock-stepper__button"
        onClick={() => setNewStockValue(Math.max(0, value - 1))}
        aria-label={t.formatMessage({ id: 'productForm.price_decrease_aria' })}
        disabled={value <= 0}
      >
        <Minus size={16} strokeWidth={2} />
      </button>
      <input
        id="wizard-initial-stock"
        type="number"
        min={0}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          setNewStockValue(isNaN(n) ? 0 : Math.max(0, n))
        }}
        className="pm-stock-stepper__input"
      />
      <button
        type="button"
        className="pm-stock-stepper__button"
        onClick={() => setNewStockValue(value + 1)}
        aria-label={t.formatMessage({ id: 'productForm.price_increase_aria' })}
      >
        <Plus size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
