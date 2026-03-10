'use client'

import { PageHeader } from '@/components/layout'

export default function InicioPage() {
  return (
    <div className="page-wrapper">
      <PageHeader title="Inicio" subtitle="Panel principal" />
      <main className="page-content">
        <div className="page-body">
          <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
            <p className="text-text-secondary">Proximamente</p>
          </div>
        </div>
      </main>
    </div>
  )
}
