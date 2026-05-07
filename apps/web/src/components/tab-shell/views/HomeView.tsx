'use client'
import { useIntl } from 'react-intl'

export function HomeView() {
  const intl = useIntl()
  return (
    <div className="px-4 py-6">
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-2xl text-center px-6">
        <p className="text-sm text-text-secondary">
          {intl.formatMessage({ id: 'home.coming_soon' })}
        </p>
      </div>
    </div>
  )
}
