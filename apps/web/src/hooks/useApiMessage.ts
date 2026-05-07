import { useCallback } from 'react'
import { useIntl } from 'react-intl'
import type { ApiMessageEnvelope } from '@kasero/shared/api-messages'

/**
 * Translate a server-emitted API message envelope into a localized string.
 *
 * The returned function takes an `ApiMessageEnvelope` (shape:
 * `{ messageCode, messageVars? }`) and returns the appropriate string
 * from the `apiMessages.*` namespace. ICU interpolation (placeholders,
 * pluralization) happens here on the client so it picks up the active
 * user's locale.
 *
 * `ApiMessageCode` values are UPPER_SNAKE; the matching translation keys
 * are `apiMessages.lower_snake` for consistency with the rest of the JSON
 * bundle. The lowercasing happens here so callers don't have to think
 * about it.
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
  const intl = useIntl()

  return useCallback(
    (envelope: ApiMessageEnvelope): string => {
      const id = `apiMessages.${envelope.messageCode.toLowerCase()}`
      return intl.formatMessage({ id }, envelope.messageVars ?? {})
    },
    [intl],
  )
}
