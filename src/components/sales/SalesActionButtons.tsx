'use client'

import { useTranslations } from 'next-intl'
import { BarChart3, History, Power, PowerOff } from 'lucide-react'

interface SalesActionButtonsProps {
  sessionOpen: boolean
  onToggleSession: () => void
}

export function SalesActionButtons({
  sessionOpen,
  onToggleSession,
}: SalesActionButtonsProps) {
  const t = useTranslations('sales.action')
  const SessionIcon = sessionOpen ? PowerOff : Power

  return (
    <div className="flex flex-col gap-2 mt-4">
      <button
        type="button"
        className="btn-primary w-full flex items-center justify-center gap-2"
        onClick={onToggleSession}
      >
        <SessionIcon className="w-4 h-4" />
        <span>{sessionOpen ? t('close_session') : t('open_session')}</span>
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-secondary w-full flex items-center justify-center gap-2"
          onClick={() => {
            /* placeholder — wired up when history is rebuilt under the
               cash-session model */
          }}
        >
          <History className="w-4 h-4" />
          <span>{t('history')}</span>
        </button>
        <button
          type="button"
          className="btn-secondary w-full flex items-center justify-center gap-2"
          onClick={() => {
            /* placeholder — daily/weekly aggregates live here */
          }}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t('reports')}</span>
        </button>
      </div>
    </div>
  )
}
