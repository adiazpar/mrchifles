'use client'

import { useHeader } from '@/contexts/header-context'

export default function InicioPage() {
  useHeader({
    title: 'Inicio',
    subtitle: 'Panel principal',
  })

  return (
    <main className="page-content">
      <div className="page-body">
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <p className="text-text-secondary">Proximamente</p>
        </div>
      </div>
    </main>
  )
}
