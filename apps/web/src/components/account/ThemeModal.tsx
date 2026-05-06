'use client'

import { useIntl } from 'react-intl';
import { Modal } from '@/components/ui'
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
  const tCommon = useIntl()
  const { theme, setTheme, themeDescription } = useTheme()

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Step title={t.formatMessage({
        id: 'account.theme_label'
      })}>
        <Modal.Item>
          <ThemeSelector
            theme={theme}
            onThemeChange={setTheme}
            description={themeDescription}
          />
        </Modal.Item>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={onClose}
          >
            {tCommon.formatMessage({
              id: 'common.done'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}
