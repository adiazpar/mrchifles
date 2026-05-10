'use client'

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
  IonButton,
} from '@ionic/react'
import { PriceKeypadStep } from '@/components/ui'
import { useProductForm } from '@/contexts/product-form-context'
import { useProductNavRef } from './ProductNavContext'
import { CategoryStockStep } from './CategoryStockStep'

interface PriceStepProps {
  mode: 'forward' | 'edit'
}

/**
 * Wizard step 2 of 4: price. Reuses the cash-counting keypad from the
 * Open Session / Close Session flow so the price field gets the same
 * always-visible-keypad ergonomics. No system keyboard pop-up, no
 * jumpy layout when the keyboard dismisses, big display-serif glyphs
 * the user can read at counter distance.
 */
export function PriceStep({ mode }: PriceStepProps) {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { price, setPrice } = useProductForm()

  const numericPrice = parseFloat(price)
  const isValid = !isNaN(numericPrice) && numericPrice > 0

  const handleContinue = () => {
    if (!isValid) return
    if (mode === 'edit') {
      navRef.current?.pop()
    } else {
      navRef.current?.push(() => <CategoryStockStep mode="forward" />)
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
            {t.formatMessage({ id: 'productForm.price_label' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content modal-content--no-scroll">
        <PriceKeypadStep
          value={price}
          onValueChange={setPrice}
          eyebrow={t.formatMessage({ id: 'productAddEdit.step_price_eyebrow' })}
          title={t.formatMessage(
            { id: 'productAddEdit.step_price_title' },
            { em: (chunks) => <em>{chunks}</em> },
          )}
          amountLabel={t.formatMessage({ id: 'productForm.price_label' })}
          helper={t.formatMessage({ id: 'productAddEdit.step_price_helper' })}
          ariaLabel={t.formatMessage({ id: 'productForm.price_label' })}
        />
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <IonButton
              onClick={handleContinue}
              disabled={!isValid}
            >
              {t.formatMessage({
                id: mode === 'edit'
                  ? 'productAddEdit.step_done_cta'
                  : 'productAddEdit.step_continue_cta',
              })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
