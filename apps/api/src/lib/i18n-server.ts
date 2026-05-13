/**
 * Server-side i18n for transactional emails. Loads the same JSON bundles
 * the SPA uses (apps/web/src/i18n/messages/) so subject lines and body
 * copy stay in lockstep with the in-app translations. The browser path
 * uses react-intl with full ICU; servers only need simple {placeholder}
 * interpolation for these short strings, so this module ships a small
 * dependency-free interpolator instead of pulling react-intl onto the
 * server runtime.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@kasero/shared/locales'

// Resolve the messages directory relative to THIS source file. In dev that's
// apps/api/src/lib -> ../../../web/src/i18n/messages. In a built apps/api
// (which Next.js handles for us), the same relative resolution applies
// because we use import.meta.url, not __dirname tricks. The path is
// computed once at module load.
const HERE = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = join(HERE, '..', '..', '..', 'web', 'src', 'i18n', 'messages')

type MessageBundle = Record<string, string>

function loadBundle(locale: SupportedLocale): MessageBundle {
  return JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), 'utf-8'))
}

const bundles: Record<SupportedLocale, MessageBundle> = Object.fromEntries(
  SUPPORTED_LOCALES.map(l => [l, loadBundle(l)])
) as Record<SupportedLocale, MessageBundle>

const PLACEHOLDER_RE = /\{(\w+)\}/g

function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template
  return template.replace(PLACEHOLDER_RE, (match, key: string) => {
    const v = values[key]
    return v === undefined ? match : String(v)
  })
}

export interface ServerIntl {
  formatMessage(
    descriptor: { id: string },
    values?: Record<string, string | number>,
  ): string
}

export function getMessages(locale: SupportedLocale | string): ServerIntl {
  const resolved = (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as SupportedLocale)
    : DEFAULT_LOCALE
  const primary = bundles[resolved]
  const fallback = bundles[DEFAULT_LOCALE]
  return {
    formatMessage(descriptor, values) {
      const template = primary[descriptor.id] ?? fallback[descriptor.id] ?? descriptor.id
      return interpolate(template, values)
    },
  }
}
