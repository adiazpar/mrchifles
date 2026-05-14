import { useEffect, useState, useCallback } from 'react'
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonList, IonItem, IonLabel, IonButton, IonButtons, IonIcon, useIonRouter,
} from '@ionic/react'
import { chevronBack } from 'ionicons/icons'
import { useIntl } from 'react-intl'
import { authClient } from '@/lib/auth-client'
import './Sessions.css'

interface SessionRow {
  id: string
  ipAddress?: string | null
  userAgent?: string | null
  current?: boolean
}

/**
 * Account Sessions page. Lists the user's active sessions (one row per
 * device / user-agent) and exposes a single "sign out other devices"
 * action that revokes every session except the current one.
 *
 * Sessions are unchanged by the passwordless refactor — `listSessions` and
 * `revokeOtherSessions` are standard better-auth client calls.
 */
export function Sessions() {
  const intl = useIntl()
  const router = useIonRouter()
  const [sessions, setSessions] = useState<SessionRow[]>([])

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
          <IonTitle>{intl.formatMessage({ id: 'sessions_title' })}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding sessions-page">
        <section className="sessions-section">
          <IonList lines="full">
            {sessions.map((s) => (
              <IonItem key={s.id}>
                <IonLabel className="ion-text-wrap">
                  <p className="sessions-row__device">
                    {s.userAgent ?? intl.formatMessage({ id: 'sessions_unknown_device' })}
                  </p>
                  {s.ipAddress && (
                    <p className="sessions-row__ip">{s.ipAddress}</p>
                  )}
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
          {sessions.length > 1 && (
            <IonButton expand="block" fill="outline" onClick={signOutOthers} className="sessions-signout-others">
              {intl.formatMessage({ id: 'sessions_sign_out_others' })}
            </IonButton>
          )}
        </section>
      </IonContent>
    </IonPage>
  )
}

export default Sessions
