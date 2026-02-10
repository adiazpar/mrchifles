'use client'

import { PageHeader } from '@/components/layout'

export default function ProductosPage() {
  return (
    <div className="min-h-screen">
      <PageHeader title="Productos" subtitle="Catalogo de productos" />
      <div className="main-content">
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <p className="text-text-secondary">Proximamente</p>
        </div>
      </div>
    </div>
  )
}
