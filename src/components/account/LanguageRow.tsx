'use client'

import { Languages } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/auth-context'
import { SUPPORTED_LOCALES, resolveTranslationLocale, type SupportedLocale } from '@/i18n/config'

/**
 * Language row with a native <select> overlay.
 *
 * The row looks and behaves like a regular SettingsRow (icon, label,
 * current value, no chevron), but the entire surface is a <label>
 * wrapping an invisible native <select>. Tapping anywhere on the row
 * triggers the OS's native picker -- iOS wheel, Android sheet, desktop
 * combobox.
 *
 * This is the only settings row that uses the native picker instead of
 * opening a modal. The user specifically asked for a native dropdown
 * here rather than a custom React component.
 */
export function LanguageRow() {
  const t = useTranslations('account')
  const { user, changeLanguage } = useAuth()

  if (!user) return null

  const currentLanguage = resolveTranslationLocale(user.language)

  const currentLabel =
    currentLanguage === 'es' ? 'Español' : 'English'

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as SupportedLocale
    if (next !== currentLanguage) {
      changeLanguage(next)
    }
  }

  return (
    <label className="list-item-clickable list-item-flat w-full relative cursor-pointer">
      <Languages className="w-5 h-5 flex-shrink-0 text-text-secondary" />
      <span className="flex-1 text-left text-base font-medium text-text-primary">
        {t('row_language')}
      </span>
      <span className="text-sm text-text-tertiary">{currentLabel}</span>
      <select
        aria-label={t('row_language')}
        className="settings-row-native-select"
        value={currentLanguage}
        onChange={handleChange}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {locale === 'es' ? 'Español' : 'English'}
          </option>
        ))}
      </select>
    </label>
  )
}
