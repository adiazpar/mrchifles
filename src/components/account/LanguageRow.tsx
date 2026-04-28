'use client'

import { Languages, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { SUPPORTED_LOCALES, resolveTranslationLocale, type SupportedLocale } from '@/i18n/config'

/**
 * Language row with a full-size invisible native <select> overlay.
 *
 * The visible row shows icon + label + current language + chevron (same
 * shape as every other settings row). An absolutely-positioned <select>
 * with opacity: 0 covers the entire row, so ANY click on the row hits
 * the select directly and triggers the OS native picker. This avoids
 * the unreliable <label>-forwarding behavior that doesn't open pickers
 * on all platforms (iOS Safari in particular).
 */
export function LanguageRow() {
  const t = useTranslations('account')
  const { user, changeLanguage } = useAuth()

  if (!user) return null

  const currentLanguage = resolveTranslationLocale(user.language)
  const labelByLocale: Record<SupportedLocale, string> = {
    'en-US': 'English',
    es: 'Español',
    ja: '日本語',
  }
  const currentLabel = labelByLocale[currentLanguage]

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as SupportedLocale
    if (next !== currentLanguage) {
      changeLanguage(next)
    }
  }

  return (
    <div className="settings-row relative cursor-pointer">
      <Languages className="w-5 h-5 flex-shrink-0 text-text-secondary" />
      <span className="flex-1 text-left text-base font-medium text-text-primary">
        {t('row_language')}
      </span>
      <span className="text-sm text-text-tertiary">{currentLabel}</span>
      <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      <select
        aria-label={t('row_language')}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        value={currentLanguage}
        onChange={handleChange}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {labelByLocale[locale]}
          </option>
        ))}
      </select>
    </div>
  )
}
