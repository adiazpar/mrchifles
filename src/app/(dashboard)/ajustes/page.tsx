'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout'
import { IconPalette, IconInfo, IconSun, IconMoon, IconMonitor } from '@/components/icons'

type Theme = 'light' | 'dark' | 'system'

const THEME_CONFIG = {
  light: {
    label: 'Claro',
    icon: IconSun,
    preview: 'theme-option-preview-light',
    description: 'Modo claro activado',
  },
  dark: {
    label: 'Oscuro',
    icon: IconMoon,
    preview: 'theme-option-preview-dark',
    description: 'Modo oscuro activado',
  },
  system: {
    label: 'Sistema',
    icon: IconMonitor,
    preview: 'theme-option-preview-system',
    description: 'Se ajusta automaticamente segun tu dispositivo',
  },
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>('system')

  // Load theme preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved) {
      setTheme(saved)
    }
  }, [])

  // Apply theme changes
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
      localStorage.removeItem('theme')
    } else {
      root.classList.toggle('dark', theme === 'dark')
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const currentConfig = THEME_CONFIG[theme]

  return (
    <>
      <PageHeader title="Configuracion" />

      <main className="settings-container">
        {/* Appearance Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <IconPalette width={20} height={20} />
            </div>
            <h2 className="settings-section-title">Apariencia</h2>
          </div>
          <div className="settings-section-body">
            <span className="settings-label">Tema</span>
            <div className="theme-options">
              {(Object.keys(THEME_CONFIG) as Theme[]).map((key) => {
                const config = THEME_CONFIG[key]
                const Icon = config.icon
                const isActive = theme === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`theme-option ${isActive ? 'theme-option-active' : ''}`}
                    aria-pressed={isActive}
                  >
                    <div className={`theme-option-preview ${config.preview}`}>
                      <Icon
                        width={20}
                        height={20}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: key === 'dark' ? '#F8FAFC' : key === 'system' ? '#64748B' : '#334155',
                        }}
                      />
                    </div>
                    <span className="theme-option-label">{config.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="settings-hint">{currentConfig.description}</p>
          </div>
        </section>

        {/* About Section */}
        <section className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <IconInfo width={20} height={20} />
            </div>
            <h2 className="settings-section-title">Acerca de</h2>
          </div>
          <div className="settings-section-body">
            <div className="settings-info-row">
              <span className="settings-info-label">Version</span>
              <span className="settings-info-value">0.1.0</span>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">Desarrollado por</span>
              <span className="settings-info-value">Mr. Chifles</span>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
