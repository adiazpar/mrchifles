'use client'

import { useIntl } from 'react-intl';
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
// z-[160] keeps the offline indicator visible above the layer stack
// (top layer sits at calc(--z-overlay + n) where --z-overlay is 150).
// The transient navigation-error notice sits at the same layer so the
// most-recent banner wins for stack order.
export function OfflineBadge() {
  const t = useIntl()
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[160] px-4 py-1.5 text-xs text-center bg-neutral-800 text-text-inverse shadow-sm pointer-events-none"
    >
      {t.formatMessage({
        id: 'network.offline_banner'
      })}
    </div>
  );
}
