'use client'

import { useTranslations } from 'next-intl'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

// Slim banner pinned to the top of the screen when the browser reports
// no network. The service worker still serves cached HTML and cached GET
// responses, so the app remains browsable; mutations fail with the
// translated OFFLINE_MUTATION_BLOCKED envelope (see api-client.ts).
//
// Visual intent: subtle informative bar (NOT red/warning). Uses
// neutral-800 (dark slate) + text-inverse (off-white). The neutral
// palette is theme-stable (not swapped in dark mode), so the banner
// looks consistent in both themes.
//
// z-40 sits one layer below NavigationErrorNotice (z-50) so a transient
// navigation error overlays this persistent connectivity indicator.
export function OfflineBadge() {
  const t = useTranslations('network')
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-40 px-4 py-1.5 text-xs text-center bg-neutral-800 text-text-inverse shadow-sm pointer-events-none"
    >
      {t('offline_banner')}
    </div>
  )
}
