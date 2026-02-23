'use client'

import { PageHeader } from '@/components/layout'

export default function ReportesPage() {
  return (
    <>
      <PageHeader title="Reportes" subtitle="Analisis de ventas" />
      <main className="main-content">
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <p className="text-text-secondary">Proximamente</p>
        </div>
      </main>
    </>
  )
}
