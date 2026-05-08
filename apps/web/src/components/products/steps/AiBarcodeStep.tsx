import { useIntl } from 'react-intl'
import { useCallback, useEffect } from 'react'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
} from '@ionic/react'
import { Plus, ScanLine } from 'lucide-react'
import { useProductForm } from '@/contexts/product-form-context'
import { useBarcodeScan } from '@/hooks/useBarcodeScan'
import { generateInternalProductBarcode, getBarcodeFormatLabel } from '@kasero/shared/barcodes'
import { BarcodeDisplay } from '../BarcodeDisplay'
import type { BarcodeSource } from '@kasero/shared/types'
import { useProductNavRef, useAddProductCallbacks } from './ProductNavContext'
import { AnalyzingStep } from './AnalyzingStep'

export function AiBarcodeStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { onStartAiPipeline } = useAddProductCallbacks()
  const {
    barcode,
    barcodeFormat,
    barcodeSource,
    setBarcode,
    setBarcodeFormat,
    setBarcodeSource,
    setError,
  } = useProductForm()

  const getBarcodeSourceLabel = (source: BarcodeSource | null): string => {
    switch (source) {
      case 'scanned': return t.formatMessage({ id: 'barcode.source_scanned' })
      case 'generated': return t.formatMessage({ id: 'barcode.source_generated' })
      case 'manual': return t.formatMessage({ id: 'barcode.source_manual' })
      default: return t.formatMessage({ id: 'barcode.source_na' })
    }
  }

  // Clear barcode state when this step mounts so user starts fresh.
  useEffect(() => {
    setBarcode('')
    setBarcodeFormat(null)
    setBarcodeSource(null)
    setError('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClear = useCallback(() => {
    setBarcode('')
    setBarcodeFormat(null)
    setBarcodeSource(null)
  }, [setBarcode, setBarcodeFormat, setBarcodeSource])

  const { open: openScanner, busy: scanBusy, hiddenInput: scanHiddenInput } = useBarcodeScan({
    onResult: ({ value, format }) => {
      setBarcode(value)
      setBarcodeFormat(format)
      setBarcodeSource('scanned')
    },
    onError: (message) => {
      setError(message)
    },
  })

  const handleScanClick = useCallback(() => {
    setError('')
    openScanner()
  }, [openScanner, setError])

  const handleGenerate = useCallback(() => {
    setBarcode(generateInternalProductBarcode())
    setBarcodeFormat('CODE_128')
    setBarcodeSource('generated')
  }, [setBarcode, setBarcodeFormat, setBarcodeSource])

  const hasBarcode = Boolean(barcode.trim())

  function handleContinue() {
    onStartAiPipeline()
    navRef.current?.push(() => <AnalyzingStep />)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.ai_step_barcode_title' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-3 text-center">
          {t.formatMessage({ id: 'productForm.ai_step_barcode_indicator' })}
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary text-center">
            {t.formatMessage({ id: 'barcode.ai_barcode_intro' })}
          </p>
          <div className="rounded-xl border border-border bg-bg-muted p-4 h-44 flex items-center justify-center text-center overflow-hidden">
            <BarcodeDisplay value={barcode} format={barcodeFormat} />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {barcode ? (
                <div className="text-sm text-text-secondary">
                  {`${barcodeFormat ? getBarcodeFormatLabel(barcodeFormat) : t.formatMessage({ id: 'barcode.source_na' })} · ${getBarcodeSourceLabel(barcodeSource)}`}
                </div>
              ) : (
                <div className="text-sm text-text-tertiary">{t.formatMessage({ id: 'barcode.no_barcode' })}</div>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={!barcode}
              className="text-sm text-error hover:text-error transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {t.formatMessage({ id: 'barcode.reset_button' })}
            </button>
          </div>
          {scanHiddenInput}
          <div className="flex gap-4 justify-center">
            <button
              type="button"
              onClick={handleScanClick}
              disabled={scanBusy}
              className="icon-stack-btn icon-stack-btn--lg icon-stack-btn--info"
            >
              <span className="icon-stack-btn__icon"><ScanLine size={28} /></span>
              <span className="icon-stack-btn__label">
                {scanBusy
                  ? t.formatMessage({ id: 'barcode.scan_reading' })
                  : t.formatMessage({ id: 'barcode.scan_button' })}
              </span>
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="icon-stack-btn icon-stack-btn--lg icon-stack-btn--success"
            >
              <span className="icon-stack-btn__icon"><Plus size={28} /></span>
              <span className="icon-stack-btn__label">{t.formatMessage({ id: 'barcode.generate_button' })}</span>
            </button>
          </div>
        </div>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <button
            type="button"
            onClick={handleContinue}
            className={`${hasBarcode ? 'btn btn-primary' : 'btn btn-secondary'} w-full`}
          >
            {hasBarcode
              ? t.formatMessage({ id: 'productForm.continue_button' })
              : t.formatMessage({ id: 'productForm.skip_for_now' })}
          </button>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
