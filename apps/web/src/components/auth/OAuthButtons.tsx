import { useState } from 'react'
import { IonButton, IonIcon, IonSpinner } from '@ionic/react'
import { logoGoogle } from 'ionicons/icons'
import { useIntl } from 'react-intl'
import { authClient } from '@/lib/auth-client'
import './OAuthButtons.css'

interface OAuthButtonsProps {
  /**
   * Path the OAuth provider redirects back to on success. Must be a
   * same-origin absolute path. Default = "/" (the hub).
   */
  callbackURL?: string
  /** Optional shared callback when an OAuth round-trip is initiated. */
  onInitiate?: () => void
  /** Disable while another part of the flow is mid-submit. */
  disabled?: boolean
}

export function OAuthButtons({ callbackURL = '/', onInitiate, disabled }: OAuthButtonsProps) {
  const intl = useIntl()
  const [pending, setPending] = useState(false)

  async function signInWithGoogle() {
    if (disabled || pending) return
    setPending(true)
    onInitiate?.()
    try {
      // The call triggers a full-page redirect to Google; the SPA won't
      // get a chance to resolve the promise. We don't await — we let the
      // browser navigate away. If the call rejects synchronously (e.g.
      // provider misconfigured), the button re-enables.
      await authClient.signIn.social({ provider: 'google', callbackURL })
    } catch {
      setPending(false)
    }
  }

  return (
    <div className="oauth-buttons">
      <IonButton
        expand="block"
        fill="outline"
        onClick={signInWithGoogle}
        disabled={disabled || pending}
        className="oauth-button"
      >
        {pending ? (
          <IonSpinner name="crescent" />
        ) : (
          <>
            <IonIcon slot="start" icon={logoGoogle} aria-hidden="true" />
            {intl.formatMessage({ id: 'oauth_google_continue' })}
          </>
        )}
      </IonButton>
    </div>
  )
}
