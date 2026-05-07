import { useEffect, useMemo } from 'react'
import { Redirect, useHistory, useLocation } from 'react-router-dom'
import { IonContent, IonPage, IonSpinner } from '@ionic/react'
import { useAuth } from '@/contexts/auth-context'

/**
 * Join page route (`/join`). Thin redirector that supports the QR-code
 * deep link `/join?code=ABCDEF`.
 *
 * Why a route instead of a dedicated UI: the join flow itself is owned
 * by `JoinBusinessProvider` (mounted on the Hub at `/`). That provider
 * watches the URL search params and, when it sees `?code=`, opens the
 * `JoinBusinessModal` pre-filled and auto-validates. So the only job of
 * `/join` is to forward the user — and any `?code=` param — to the Hub.
 *
 * Behavior:
 *   - Unauthenticated -> redirect to /login (matches HubPage / AccountPage)
 *   - With `?code=ABC` -> replace history with `/?code=ABC` so the Hub's
 *     JoinBusinessProvider picks up the deep link
 *   - Without a code   -> replace history with `/`
 *
 * Search-param parsing: this route reads `?code=` via react-router's
 * `useLocation().search` parsed with `URLSearchParams` (NOT via
 * `next/navigation` or the next-navigation-shim). The shim does the
 * same thing under the hood, but doing it inline here makes the
 * deep-link contract explicit at the route boundary.
 *
 * The component is wrapped in `<IonPage>` for compatibility with Ionic's
 * page management (the active page in `IonRouterOutlet` is expected to
 * be an `IonPage`). The body is a centered spinner so the redirect tick
 * doesn't flash blank.
 */
export function JoinPage() {
  const { user, isLoading: authLoading } = useAuth()
  const history = useHistory()
  const { search } = useLocation()

  // Parse the code once per location change. URLSearchParams.get returns
  // `null` for absent keys; we coerce to `undefined` for cleaner handling.
  const code = useMemo(() => {
    const raw = new URLSearchParams(search).get('code')?.trim()
    return raw && raw.length > 0 ? raw : undefined
  }, [search])

  useEffect(() => {
    // Only run the redirect after auth resolves and the user is signed
    // in. The unauthenticated branch below short-circuits to /login.
    if (authLoading || !user) return

    if (code) {
      history.replace(`/?code=${encodeURIComponent(code)}`)
    } else {
      history.replace('/')
    }
  }, [authLoading, user, code, history])

  // Auth gate: matches HubPage / AccountPage so a deep-linked QR scan
  // by a logged-out user lands on /login first, then bounces back here
  // after sign-in (the login redirect carries the original `pathname +
  // search` via the legacy AuthContext flow).
  if (!authLoading && !user) {
    return <Redirect to="/login" />
  }

  return (
    <IonPage>
      <IonContent>
        {/* Full-viewport centered spinner. See HubPage for the
            IonContent + IonSpinner pattern rationale. */}
        <div className="flex h-full items-center justify-center">
          <IonSpinner name="crescent" />
        </div>
      </IonContent>
    </IonPage>
  )
}
