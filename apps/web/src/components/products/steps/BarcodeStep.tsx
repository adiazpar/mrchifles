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
import { BarcodeFields } from '../BarcodeFields'
import { useProductForm } from '@/contexts/product-form-context'
import { useProductNav } from './ProductNavContext'

interface BarcodeStepProps {
  mode: 'forward' | 'edit'
}

/**
 * Wizard step 4 of 4: barcode (optional). Wraps the existing
 * BarcodeFields component which owns the scan / generate-internal /
 * manual-entry UI. The user can skip this step entirely by tapping
 * Continue with no barcode set.
 */
export function BarcodeStep({ mode }: BarcodeStepProps) {
  const t = useIntl()
  const nav = useProductNav()
  const { barcode, barcodeFormat, barcodeSource, editingProduct } =
    useProductForm()

  const hasFieldChange =
    mode !== 'edit' ||
    !editingProduct ||
    (barcode || '') !== (editingProduct.barcode || '') ||
    (barcodeFormat || null) !== (editingProduct.barcodeFormat || null) ||
    (barcodeSource || null) !== (editingProduct.barcodeSource || null)

  const handleContinue = () => {
    if (!hasFieldChange) return
    if (mode === 'edit') {
      nav.pop()
    } else {
      nav.push('review')
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
            {t.formatMessage({ id: 'productForm.tab_barcode' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'productAddEdit.step_barcode_eyebrow' })}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: 'productAddEdit.step_barcode_title' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="pm-hero__subtitle">
              {t.formatMessage({ id: 'productAddEdit.step_barcode_subtitle' })}
            </p>
          </header>

          <BarcodeFields />
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <IonButton onClick={handleContinue} disabled={!hasFieldChange}>
              {t.formatMessage({
                id: mode === 'edit'
                  ? 'productAddEdit.step_done_cta'
                  : 'productAddEdit.step_review_cta',
              })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </>
  )
}
