'use client'

import { PageHeader } from '@/components/layout'

export default function VentasPage() {
  return (
    <div className="min-h-screen">
      <PageHeader title="Ventas" subtitle="Registrar ventas" />
      <div className="main-content">
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <p className="text-text-secondary">Proximamente</p>
        </div>
      </div>
    </div>
  )
}
