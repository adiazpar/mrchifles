'use client'

import { useHeader } from '@/contexts/header-context'

export default function ReportesPage() {
  useHeader({
    title: 'Reportes',
    subtitle: 'Analisis de ventas',
  })

  return (
    <main className="page-content">
      <div className="page-body">
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <p className="text-text-secondary">Proximamente</p>
        </div>
      </div>
    </main>
  )
}
