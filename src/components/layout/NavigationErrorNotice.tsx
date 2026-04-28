'use client'

import { useTranslations } from 'next-intl'
import { usePageTransition } from '@/contexts/page-transition-context'

// Slim banner that surfaces a transient navigation error (e.g. when the
// 5-second safety net in PageTransitionContext fires). The provider stores
// a translation KEY (under the `navigation` namespace), not a translated
// string, so the notice always reflects the user's current language even
// if they switch languages mid-session.
export function NavigationErrorNotice() {
  const t = useTranslations('navigation')
  const { navigationError } = usePageTransition()

  if (!navigationError) return null

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-50 px-4 py-2 text-sm text-center bg-warning text-text-inverse shadow-md pointer-events-none"
    >
      {/* next-intl's `t` is typed against the full AppConfig messages, so
          we narrow to a runtime lookup here. The provider only ever stores
          known keys under the `navigation` namespace. */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(t as any)(navigationError)}
    </div>
  )
}
