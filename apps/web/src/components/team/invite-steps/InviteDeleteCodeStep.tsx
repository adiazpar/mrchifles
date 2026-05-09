import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonBackButton,
} from '@ionic/react'
import { useInviteNavRef, useInviteCallbacks } from './InviteNavContext'
import { InviteDeletedSuccessStep } from './InviteDeletedSuccessStep'

/**
 * Revoke-confirm surface. Oxblood eyebrow, Fraunces italic title with
 * em-pivot on "invite", then a Fraunces subtitle explaining the
 * consequences. The code being revoked is shown as a dimmed,
 * dashed-frame specimen so the user has the chance to spot a wrong
 * pick before tapping the destructive pill.
 *
 * On confirm: call onDeleteCode(); push the success step only when
 * it returns true. The hook is responsible for surfacing errors back
 * to the parent — this step does not capture them inline.
 */
export function InviteDeleteCodeStep() {
  const t = useIntl()
  const navRef = useInviteNavRef()
  const { newCode, isDeletingCode, onDeleteCode } = useInviteCallbacks()

  const handleDelete = async () => {
    const ok = await onDeleteCode()
    if (ok) {
      navRef.current?.push(() => <InviteDeletedSuccessStep />)
    }
  }

  return (
    <IonPage>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="" />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow pm-hero__eyebrow--danger">
              {t.formatMessage({ id: 'team.invite_v2.eyebrow_delete' })}
            </span>
            <h1 className="pm-hero__title pm-hero__title--danger">
              {t.formatMessage(
                { id: 'team.invite_v2.title_delete' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="pm-hero__subtitle">
              {t.formatMessage({ id: 'team.invite_v2.subtitle_delete' })}
            </p>
          </header>

          {newCode && (
            <div className="tm-invite__specimen">
              <span className="tm-invite__specimen-label">
                {t.formatMessage({ id: 'team.invite_v2.delete_specimen_label' })}
              </span>
              <code className="tm-invite__specimen-value">{newCode}</code>
            </div>
          )}
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="tm-invite__danger-pill"
              onClick={handleDelete}
              disabled={isDeletingCode}
            >
              {isDeletingCode ? (
                <span
                  className="order-modal__pill-spinner"
                  aria-label={t.formatMessage({ id: 'common.loading' })}
                />
              ) : (
                t.formatMessage({ id: 'team.invite_v2.delete_confirm' })
              )}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
