'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import type { ApiMessageCode, ApiMessageEnvelope } from '@/lib/api-messages'

/**
 * Translate a server-emitted API message envelope into a localized string.
 *
 * The returned function takes an ApiMessageEnvelope (shape:
 * `{ messageCode, messageVars? }`) and returns the appropriate string
 * from the `apiMessages` i18n namespace. ICU interpolation happens here,
 * on the client, because pluralization depends on the user's locale.
 *
 * @example
 * ```tsx
 * const translateApiMessage = useApiMessage()
 *
 * try {
 *   await apiPost('/api/.../products', data)
 * } catch (err) {
 *   if (err instanceof ApiError && err.envelope) {
 *     setError(translateApiMessage(err.envelope))
 *   }
 * }
 * ```
 */
export function useApiMessage() {
  const t = useTranslations('apiMessages')

  return useCallback(
    (envelope: ApiMessageEnvelope): string => {
      // The enum values are UPPER_SNAKE; i18n keys are lower_snake for
      // consistency with the rest of en-US.json.
      const key = envelope.messageCode.toLowerCase()
      // next-intl's `t` is typed against the full AppConfig messages, so
      // we narrow to a runtime lookup here. The apiMessages namespace is
      // guaranteed to have a key per ApiMessageCode by convention and is
      // enforced by the test suite and the typecheck step.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (t as any)(key, envelope.messageVars ?? {})
    },
    [t],
  )
}

export type TranslateApiMessage = (envelope: ApiMessageEnvelope) => string
export type { ApiMessageCode }
