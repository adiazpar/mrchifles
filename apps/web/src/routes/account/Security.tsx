import { useEffect, useState, useCallback } from 'react'
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonList, IonItem, IonLabel, IonButton, IonToggle, IonAlert, IonButtons, IonIcon, useIonRouter,
} from '@ionic/react'
import { chevronBack } from 'ionicons/icons'
import { useIntl } from 'react-intl'
import { authClient } from '@/lib/auth-client'
import { useAuth } from '@/contexts/auth-context'
import './Security.css'

interface SessionRow {
  id: string
  ipAddress?: string | null
  userAgent?: string | null
  current?: boolean
}

/**
 * Account Security page. Surfaces two controls:
 *   - 2FA toggle (enrolls or disables) — disable requires password
 *   - Active sessions list with "sign out other devices" button
 *
 * The 2FA enabled flag is read from session.user.twoFactorEnabled. better-
 * auth maintains this on the user row; the local view re-fetches sessions
 * after any mutation so the list stays current.
 */
export function Security() {
  const intl = useIntl()
  const router = useIonRouter()
  const { user, refreshUser } = useAuth()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [disablePromptOpen, setDisablePromptOpen] = useState(false)
  const twoFactorEnabled = user?.twoFactorEnabled ?? false

  const loadSessions = useCallback(async () => {
    try {
      const result = await authClient.listSessions()
      const list = (result.data ?? []) as SessionRow[]
      setSessions(list)
    } catch {
      setSessions([])
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const handleToggle = useCallback((next: boolean) => {
    if (next) {
      router.push('/account/security/2fa-setup', 'forward')
    } else {
      setDisablePromptOpen(true)
    }
  }, [router])

  const confirmDisable = useCallback(async (password: string) => {
    if (!password) {
      setDisablePromptOpen(false)
      return
    }
    try {
      await authClient.twoFactor.disable({ password })
      await refreshUser()
    } catch {
      // Best-effort. Surface a toast in a follow-up if needed.
    }
    setDisablePromptOpen(false)
  }, [refreshUser])

  const signOutOthers = useCallback(async () => {
    try {
      await authClient.revokeOtherSessions()
      await loadSessions()
    } catch {
      // Silent failure — session list will refresh on next mount.
    }
  }, [loadSessions])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => router.push('/account', 'back')} aria-label="Back">
              <IonIcon icon={chevronBack} />
            </IonButton>
          </IonButtons>
          <IonTitle>{intl.formatMessage({ id: 'security_title' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding security-page">
        <section className="security-section">
          <h3 className="security-section__heading">
            {intl.formatMessage({ id: 'security_2fa_section' })}
          </h3>
          <IonItem className="security-toggle-row">
            <IonLabel className="ion-text-wrap">
              {twoFactorEnabled
                ? intl.formatMessage({ id: 'security_2fa_enabled' })
                : intl.formatMessage({ id: 'security_2fa_disabled' })}
            </IonLabel>
            <IonToggle
              checked={twoFactorEnabled}
              onIonChange={(e) => handleToggle(e.detail.checked)}
              slot="end"
              aria-label={intl.formatMessage({ id: 'security_2fa_section' })}
            />
          </IonItem>
        </section>

        <section className="security-section">
          <h3 className="security-section__heading">
            {intl.formatMessage({ id: 'sessions_title' })}
          </h3>
          <IonList lines="full">
            {sessions.map((s) => (
              <IonItem key={s.id}>
                <IonLabel className="ion-text-wrap">
                  <p className="security-session__device">
                    {s.userAgent ?? intl.formatMessage({ id: 'sessions_unknown_device' })}
                  </p>
                  {s.ipAddress && (
                    <p className="security-session__ip">{s.ipAddress}</p>
                  )}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
          {sessions.length > 1 && (
            <IonButton expand="block" fill="outline" onClick={signOutOthers} className="security-signout-others">
              {intl.formatMessage({ id: 'sessions_sign_out_others' })}
            </IonButton>
          )}
        </section>

        <IonAlert
          isOpen={disablePromptOpen}
          header={intl.formatMessage({ id: 'security_2fa_disable_confirm' })}
          inputs={[
            {
              name: 'password',
              type: 'password',
              placeholder: intl.formatMessage({ id: 'security_2fa_password_prompt' }),
              attributes: { autocomplete: 'current-password' },
            },
          ]}
          buttons={[
            { text: intl.formatMessage({ id: 'security_2fa_cancel' }), role: 'cancel', handler: () => setDisablePromptOpen(false) },
            { text: intl.formatMessage({ id: 'security_2fa_disable_action' }), handler: (data) => { void confirmDisable(data.password) } },
          ]}
        />
      </IonContent>
    </IonPage>
  )
}

export default Security
