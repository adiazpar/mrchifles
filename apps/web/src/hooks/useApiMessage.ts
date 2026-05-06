'use client'

import { useIntl } from 'react-intl';
import { useCallback } from 'react'
import type { ApiMessageEnvelope } from '@kasero/shared/api-messages'

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
  const t = useIntl()

  return useCallback(
    (envelope: ApiMessageEnvelope): string => {
      // The enum values are UPPER_SNAKE; i18n keys are lower_snake for
      // consistency with the rest of en-US.json. After Phase 6.1 the JSON
      // bundles are flat dot-keys, so the apiMessages.* namespace prefix
      // is part of the id.
      const key = `apiMessages.${envelope.messageCode.toLowerCase()}`
      return t.formatMessage({ id: key }, envelope.messageVars ?? {})
    },
    [t],
  )
}

