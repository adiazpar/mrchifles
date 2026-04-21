'use client'

import { useTranslations } from 'next-intl'

export default function ManagePage() {
  const t = useTranslations('manage')
  // Header is set optimistically by nav component

  return (
    <main className="page-content">
      <div className="page-body">
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <p className="text-text-secondary">{t('header_title')}</p>
        </div>
      </div>
    </main>
  )
}
