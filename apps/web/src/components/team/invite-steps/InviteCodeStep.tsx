import { useIntl } from 'react-intl'
import { Check, Copy, Trash2 } from 'lucide-react'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
} from '@ionic/react'
import { CodeGeneratedContent } from '../CodeGeneratedContent'
import { useInviteNavRef, useInviteCallbacks } from './InviteNavContext'
import { InviteDeleteCodeStep } from './InviteDeleteCodeStep'

export function InviteCodeStep() {
  const t = useIntl()
  const navRef = useInviteNavRef()
  const {
    onClose,
    selectedRole,
    newCode,
    newCodeExpiresAt,
    qrDataUrl,
    isGenerating,
    copyFeedback,
    onRegenerateCode,
    onCopyCode,
  } = useInviteCallbacks()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t.formatMessage({ id: 'team.step_code_generated' })}</IonTitle>
          <IonButtons slot="end">
            {/* intentionally no back button — user can only close or delete */}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {newCode && newCodeExpiresAt && (
          <CodeGeneratedContent
            selectedRole={selectedRole}
            newCode={newCode}
            expiresAt={newCodeExpiresAt}
            qrDataUrl={qrDataUrl}
            isGenerating={isGenerating}
            onRegenerate={onRegenerateCode}
          />
        )}
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding-horizontal">
          <div className="flex gap-2">
            <IonButton
              fill="outline"
              shape="round"
              onClick={() => navRef.current?.push(() => <InviteDeleteCodeStep />)}
              aria-label={t.formatMessage({ id: 'team.step_delete_code' })}
            >
              <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
            </IonButton>
            <IonButton
              fill="outline"
              shape="round"
              onClick={() => newCode && onCopyCode(newCode)}
              aria-label={t.formatMessage({ id: 'common.copy' })}
            >
              {copyFeedback === newCode ? (
                <Check className="text-success" style={{ width: 16, height: 16 }} />
              ) : (
                <Copy style={{ width: 16, height: 16 }} />
              )}
            </IonButton>
            <IonButton onClick={onClose}>
              {t.formatMessage({ id: 'common.done' })}
            </IonButton>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
