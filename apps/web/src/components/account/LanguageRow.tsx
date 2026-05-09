'use client'

import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Languages } from 'lucide-react'
import { IonItem, IonLabel, IonNote } from '@ionic/react'
import { useAuth } from '@/contexts/auth-context'
import { LOCALES, resolveTranslationLocale } from '@/i18n/config'
import { LanguageModal } from '@/components/account/LanguageModal'

/**
 * Language settings row. Renders the same `IonItem` shape as the Theme row
 * directly above it (icon slot="start" + IonLabel + IonNote slot="end") so
 * the Preferences list reads as one coherent block. Tapping opens
 * `LanguageModal` — the OS-native `<select>` overlay used previously is
 * gone; the picker is fully styled in-app now.
 */
export function LanguageRow() {
  const intl = useIntl()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  const currentLanguage = resolveTranslationLocale(user.language)
  const currentLabel = LOCALES[currentLanguage].label

  return (
    <>
      <IonItem button detail onClick={() => setIsOpen(true)}>
        <Languages slot="start" className="w-5 h-5 text-text-secondary" />
        <IonLabel>
          <h3>{intl.formatMessage({ id: 'account.row_language' })}</h3>
        </IonLabel>
        <IonNote slot="end">{currentLabel}</IonNote>
      </IonItem>
      <LanguageModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
