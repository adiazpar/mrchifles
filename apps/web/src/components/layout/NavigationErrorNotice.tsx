'use client'

import { useIntl } from 'react-intl';
import { usePageTransition } from '@/contexts/page-transition-context'

// Slim banner that surfaces a transient navigation error (e.g. when the
// 5-second safety net in PageTransitionContext fires). The provider stores
// a translation KEY (under the `navigation` namespace), not a translated
// string, so the notice always reflects the user's current language even
// if they switch languages mid-session.
export function NavigationErrorNotice() {
  const t = useIntl()
  const { navigationError } = usePageTransition()

  if (!navigationError) return null

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[160] px-4 py-2 text-sm text-center bg-warning text-text-inverse shadow-md pointer-events-none"
    >
      {/* navigationError is the message id (under the `navigation`
          namespace) stored by the page-transition safety net. We resolve
          it at render time so the notice reflects the user's current
          language even if they switch mid-session. */}
      {t.formatMessage({ id: navigationError })}
    </div>
  )
}
