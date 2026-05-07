'use client'

import { useIntl } from 'react-intl';
import { Languages } from 'lucide-react'
import { IonItem, IonLabel, IonNote } from '@ionic/react'
import { useAuth } from '@/contexts/auth-context'
import { LOCALES, SUPPORTED_LOCALES, resolveTranslationLocale, type SupportedLocale } from '@/i18n/config'

/**
 * Language row with a full-size invisible native <select> overlay.
 *
 * The visible row shows icon + label + current language (via IonNote slot="end").
 * An absolutely-positioned <select> with opacity: 0 covers the entire row, so
 * ANY click on the row hits the select directly and triggers the OS native
 * picker. This avoids the unreliable <label>-forwarding behavior that doesn't
 * open pickers on all platforms (iOS Safari in particular).
 *
 * Renders as an IonItem so it fits naturally inside an IonList alongside
 * other settings rows.
 */
export function LanguageRow() {
  const intl = useIntl()
  const { user, changeLanguage } = useAuth()

  if (!user) return null

  const currentLanguage = resolveTranslationLocale(user.language)
  const currentLabel = LOCALES[currentLanguage].label

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as SupportedLocale
    if (next !== currentLanguage) {
      changeLanguage(next)
    }
  }

  return (
    <IonItem className="relative">
      <Languages slot="start" className="w-5 h-5 text-text-secondary" />
      <IonLabel>
        <h3>{intl.formatMessage({ id: 'account.row_language' })}</h3>
      </IonLabel>
      <IonNote slot="end">{currentLabel}</IonNote>
      <select
        aria-label={intl.formatMessage({ id: 'account.row_language' })}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        value={currentLanguage}
        onChange={handleChange}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALES[locale].label}
          </option>
        ))}
      </select>
    </IonItem>
  )
}
