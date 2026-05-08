'use client'

import { useIntl } from 'react-intl';
import { ModalShell } from '@/components/ui/modal-shell'
import { ThemeSelector } from './ThemeSelector'
import { useTheme } from '@/hooks/useTheme'

export interface ThemeModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal wrapper around the existing ThemeSelector component.
 * Tapping a theme tile applies the change immediately via useTheme();
 * the modal stays open so the user can preview the effect before
 * dismissing.
 */
export function ThemeModal({ isOpen, onClose }: ThemeModalProps) {
  const t = useIntl()
  const { theme, setTheme, themeDescription } = useTheme()

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.formatMessage({ id: 'account.theme_label' })}
    >
      <ThemeSelector
        theme={theme}
        onThemeChange={setTheme}
        description={themeDescription}
      />
    </ModalShell>
  )
}
