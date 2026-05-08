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
            <button
              type="button"
              onClick={() => navRef.current?.push(() => <InviteDeleteCodeStep />)}
              className="btn btn-secondary btn-icon"
              aria-label={t.formatMessage({ id: 'team.step_delete_code' })}
            >
              <Trash2 className="text-error" style={{ width: 16, height: 16 }} />
            </button>
            <button
              type="button"
              onClick={() => newCode && onCopyCode(newCode)}
              className="btn btn-secondary btn-icon"
              aria-label={t.formatMessage({ id: 'common.copy' })}
            >
              {copyFeedback === newCode ? (
                <Check className="text-success" style={{ width: 16, height: 16 }} />
              ) : (
                <Copy style={{ width: 16, height: 16 }} />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary flex-1"
            >
              {t.formatMessage({ id: 'common.done' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
