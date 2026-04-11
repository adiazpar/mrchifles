'use client'

import { Languages, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { SUPPORTED_LOCALES, resolveTranslationLocale, type SupportedLocale } from '@/i18n/config'

/**
 * Language row with an inline native <select>.
 *
 * The row is a <label> wrapping a real <select> element, which means
 * tapping anywhere on the row forwards the click to the select and
 * triggers the OS's native picker (iOS wheel, Android sheet, desktop
 * combobox). The select is visually stripped of its default chrome
 * (arrow, border, background) via `.settings-row-select` so it blends
 * with the row's subtitle styling -- the chevron next to it is what
 * signals interactivity, matching the other settings rows.
 */
export function LanguageRow() {
  const t = useTranslations('account')
  const { user, changeLanguage } = useAuth()

  if (!user) return null

  const currentLanguage = resolveTranslationLocale(user.language)

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as SupportedLocale
    if (next !== currentLanguage) {
      changeLanguage(next)
    }
  }

  return (
    <label className="settings-row cursor-pointer">
      <Languages className="w-5 h-5 flex-shrink-0 text-text-secondary" />
      <span className="flex-1 text-left text-base font-medium text-text-primary">
        {t('row_language')}
      </span>
      <select
        aria-label={t('row_language')}
        className="settings-row-select"
        value={currentLanguage}
        onChange={handleChange}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {locale === 'es' ? 'Español' : 'English'}
          </option>
        ))}
      </select>
      <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
    </label>
  )
}
