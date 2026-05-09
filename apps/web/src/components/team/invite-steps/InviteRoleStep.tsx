import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { DurationPicker } from '../DurationPicker'
import { RoleSelectionContent } from '../RoleSelectionContent'
import { useInviteNavRef, useInviteCallbacks } from './InviteNavContext'
import { InviteCodeStep } from './InviteCodeStep'
import { InvitePartnerWarningStep } from './InvitePartnerWarningStep'

/**
 * Step 1 of the invite-creation flow.
 *
 * Hero: mono "INVITE · NEW" eyebrow, Fraunces italic title with the
 * em-pivot on "teammate", short subtitle.
 *
 * Body order is Role first (because it gates the next screen — partners
 * route through a warning surface), then Duration. Both rely on
 * supporting components (RoleSelectionContent, DurationPicker) that
 * follow the .tm-invite__* vocabulary defined in
 * styles/team-invite-modal.css.
 *
 * Footer: terracotta primary pill ("Generate code") shared with the
 * order modal family. Spinner appears in the pill while the API
 * request is in flight.
 */
export function InviteRoleStep() {
  const t = useIntl()
  const navRef = useInviteNavRef()
  const {
    onClose,
    selectedRole,
    setSelectedRole,
    selectedDuration,
    setSelectedDuration,
    isGenerating,
    onGenerateCode,
  } = useInviteCallbacks()

  const handleNext = async () => {
    if (selectedRole === 'partner') {
      // Partner promotion gets its own consequence-confirmation surface.
      navRef.current?.push(() => <InvitePartnerWarningStep />)
    } else {
      await onGenerateCode()
      navRef.current?.push(() => <InviteCodeStep />)
    }
  }

  return (
    <IonPage>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={onClose}
              aria-label={t.formatMessage({ id: 'common.close' })}
            >
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'team.invite_v2.eyebrow_step1' })}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: 'team.invite_v2.title_step1' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
            <p className="pm-hero__subtitle">
              {t.formatMessage({ id: 'team.invite_v2.subtitle_step1' })}
            </p>
          </header>

          {/* Role section first — it gates whether a warning is shown
              before the code is generated. */}
          <section>
            <span className="tm-invite__section-label">
              {t.formatMessage({ id: 'team.invite_v2.section_role' })}
            </span>
            <RoleSelectionContent
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
            />
          </section>

          <section>
            <span className="tm-invite__section-label">
              {t.formatMessage({ id: 'team.invite_v2.section_duration' })}
            </span>
            <DurationPicker
              selected={selectedDuration}
              onSelect={setSelectedDuration}
            />
          </section>
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={handleNext}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span
                  className="order-modal__pill-spinner"
                  aria-label={t.formatMessage({ id: 'common.loading' })}
                />
              ) : (
                t.formatMessage({ id: 'team.generate_code_button' })
              )}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
