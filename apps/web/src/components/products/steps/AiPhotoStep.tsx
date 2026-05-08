import { useIntl } from 'react-intl'
import { useRef, useEffect } from 'react'
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
import { Camera } from 'lucide-react'
import { useProductNavRef, useAddProductCallbacks } from './ProductNavContext'
import { AiBarcodeStep } from './AiBarcodeStep'

export function AiPhotoStep() {
  const t = useIntl()
  const navRef = useProductNavRef()
  const { onAiPhotoCapture, onClearPendingPhoto } = useAddProductCallbacks()
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Clear any previously stashed photo when this step mounts so the user
  // starts fresh each time they land here.
  useEffect(() => {
    onClearPendingPhoto()
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    onAiPhotoCapture(e).then(() => {
      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }
      navRef.current?.push(() => <AiBarcodeStep />)
    })
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
          <IonTitle>
            {t.formatMessage({ id: 'productForm.ai_step_photo_title' })}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
          {t.formatMessage({ id: 'productForm.ai_step_photo_indicator' })}
        </div>
        <p className="text-sm text-text-secondary mb-4 text-center">
          {t.formatMessage({ id: 'productForm.ai_step_photo_instructions' })}
        </p>
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="caja-action-btn caja-action-btn--large w-full"
        >
          <Camera className="caja-action-btn__icon text-brand" />
          <div className="caja-action-btn__text">
            <span className="caja-action-btn__title">{t.formatMessage({ id: 'productForm.choose_photo_button' })}</span>
            <span className="caja-action-btn__desc">{t.formatMessage({ id: 'productForm.choose_photo_desc' })}</span>
          </div>
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handlePhotoSelected}
          className="hidden"
        />
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal" />
      </IonFooter>
    </IonPage>
  )
}
