/**
 * Type augmentation for next-intl.
 *
 * Registering `en-US.json` as the source of truth lets TypeScript
 * autocomplete and type-check every `useTranslations()` and `t('key')`
 * call in the app. Typos surface at compile time instead of rendering
 * the raw key string at runtime.
 *
 * Spanish translations (`es.json`) are not registered — they're free to
 * be missing keys; `next-intl` falls back to `en-US` when a key isn't
 * found in the active locale.
 */

import type messages from './messages/en-US.json'

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages
  }
}
