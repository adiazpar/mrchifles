'use client'

import { useIntl } from 'react-intl'
import { useMemo } from 'react'
import { Sun, Moon, SunMoon } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'
import { useTheme } from '@/hooks/useTheme'

export interface ThemeModalProps {
  isOpen: boolean
  onClose: () => void
}

type Theme = 'light' | 'dark' | 'system'

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: SunMoon,
}

/**
 * Theme picker rendered as three printed paper "swatches". Each swatch
 * is a literal preview of the theme it represents — colors are hardcoded
 * so the previews stay accurate regardless of the user's current mode.
 * Tapping applies immediately via useTheme(); the modal stays open so
 * the user can preview before dismissing.
 */
export function ThemeModal({ isOpen, onClose }: ThemeModalProps) {
  const intl = useIntl()
  const { theme, setTheme, themeDescription } = useTheme()

  const titleNode = useMemo(() => {
    const full = intl.formatMessage({ id: 'account.theme_hero_title' })
    const emphasis = intl.formatMessage({ id: 'account.theme_hero_title_emphasis' })
    const idx = full.indexOf(emphasis)
    if (!emphasis || idx === -1) return full
    return (
      <>
        {full.slice(0, idx)}
        <em>{emphasis}</em>
        {full.slice(idx + emphasis.length)}
      </>
    )
  }, [intl])

  const themes: Theme[] = ['light', 'dark', 'system']

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={intl.formatMessage({ id: 'account.theme_label' })}
      noSwipeDismiss
    >
      <header className="modal-hero theme-modal__intro">
        <div className="modal-hero__eyebrow">
          {intl.formatMessage({ id: 'account.theme_hero_eyebrow' })}
        </div>
        <h1 className="modal-hero__title">{titleNode}</h1>
        <p className="modal-hero__subtitle">
          {intl.formatMessage({ id: 'account.theme_hero_subtitle' })}
        </p>
      </header>

      <div className="theme-modal__grid" role="radiogroup" aria-label={intl.formatMessage({ id: 'account.theme_label' })}>
        {themes.map((key) => {
          const isActive = theme === key
          const Icon = ICONS[key]
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(key)}
              className={`theme-modal__swatch ${isActive ? 'is-active' : ''}`}
            >
              <span className={`theme-modal__preview theme-modal__preview--${key}`} aria-hidden="true">
                <span className="theme-modal__preview-bar" />
                <span className="theme-modal__preview-line" />
                <span className="theme-modal__preview-line theme-modal__preview-line--short" />
                <span className="theme-modal__preview-line" />
                <span className="theme-modal__preview-mark">
                  <Icon />
                </span>
              </span>
              <span className="theme-modal__caption">
                <span>{intl.formatMessage({ id: `account.theme_${key}` })}</span>
                <span className="theme-modal__dot" aria-hidden="true" />
              </span>
            </button>
          )
        })}
      </div>

      <p className="theme-modal__description">{themeDescription}</p>
    </ModalShell>
  )
}
