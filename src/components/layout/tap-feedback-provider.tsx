'use client'

import { useEffect } from 'react'
import { mount, unmount } from '@/lib/tap-feedback'

/**
 * Mounts the global tap-feedback mechanism once for the app. Renders nothing.
 * See src/lib/tap-feedback.ts and the design spec for details.
 */
export function TapFeedbackProvider() {
  useEffect(() => {
    mount()
    return () => unmount()
  }, [])
  return null
}
