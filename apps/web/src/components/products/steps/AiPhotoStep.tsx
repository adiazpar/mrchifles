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
  IonCard,
  IonCardContent,
} from '@ionic/react'
import { Camera, ChevronRight } from 'lucide-react'
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
        <IonCard button onClick={() => photoInputRef.current?.click()} className="m-0">
          <IonCardContent className="flex items-start gap-4 py-5">
            <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
              <Camera className="w-6 h-6 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-text-primary">{t.formatMessage({ id: 'productForm.choose_photo_button' })}</div>
              <div className="text-sm text-text-secondary mt-1">{t.formatMessage({ id: 'productForm.choose_photo_desc' })}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 self-center" />
          </IonCardContent>
        </IonCard>
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
