import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
} from '@ionic/react'
import { CheckCircle2 } from 'lucide-react'
import { useInviteCallbacks } from './InviteNavContext'

/**
 * Terminal step: the invite has been revoked. No back button — once
 * here, the user can only return to the team roster.
 *
 * Visual: oxblood-tinted seal circle (a soft confirmation, not a
 * celebration — this is a destructive action), mono "DONE" stamp,
 * Fraunces italic "Revoked." title, short caption, terracotta primary
 * pill that closes the modal.
 */
export function InviteDeletedSuccessStep() {
  const t = useIntl()
  const { onClose } = useInviteCallbacks()

  return (
    <IonPage>
      <IonHeader className="pm-header">
        <IonToolbar />
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <div className="tm-invite__seal">
            <span className="tm-invite__seal-circle" aria-hidden="true">
              <CheckCircle2 size={44} strokeWidth={1.4} />
            </span>

            <span className="tm-invite__seal-stamp">
              {t.formatMessage({ id: 'team.invite_v2.eyebrow_deleted' })}
            </span>

            <h2 className="pm-hero__title pm-hero__title--danger" style={{ textAlign: 'center' }}>
              {t.formatMessage(
                { id: 'team.invite_v2.title_deleted' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h2>

            <p className="pm-hero__subtitle" style={{ textAlign: 'center', margin: 0 }}>
              {t.formatMessage({ id: 'team.invite_v2.subtitle_deleted' })}
            </p>
          </div>
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={onClose}
            >
              {t.formatMessage({ id: 'team.invite_v2.deleted_back' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
