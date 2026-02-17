'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout'
import { Card } from '@/components/ui'

type Theme = 'light' | 'dark' | 'system'

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

  return (
    <>
      <PageHeader title="Configuracion" subtitle="Personaliza tu experiencia" />

      <main className="main-content space-y-6">
        {/* Appearance */}
        <Card padding="lg">
          <h3 className="font-display font-bold text-lg mb-4">Apariencia</h3>

          <div className="space-y-4">
            <div>
              <label className="label">Tema</label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-brand bg-brand-subtle'
                      : 'border-border hover:border-border-hover'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-white border border-border" />
                    <span className="text-sm font-medium">Claro</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-brand bg-brand-subtle'
                      : 'border-border hover:border-border-hover'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-neutral-800 border border-neutral-700" />
                    <span className="text-sm font-medium">Oscuro</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                    theme === 'system'
                      ? 'border-brand bg-brand-subtle'
                      : 'border-border hover:border-border-hover'
                  }`}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-r from-white to-neutral-800 border border-border" />
                    <span className="text-sm font-medium">Sistema</span>
                  </div>
                </button>
              </div>
              <p className="helper-text mt-2">
                {theme === 'system'
                  ? 'Se ajusta automaticamente segun la configuracion de tu dispositivo'
                  : theme === 'dark'
                  ? 'Modo oscuro activado'
                  : 'Modo claro activado'}
              </p>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card padding="lg">
          <h3 className="font-display font-bold text-lg mb-4">Acerca de</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Version</span>
              <span className="font-medium">0.1.0</span>
            </div>
          </div>
        </Card>
      </main>
    </>
  )
}
