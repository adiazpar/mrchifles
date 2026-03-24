'use client'

import { useHeader } from '@/contexts/header-context'

export default function VentasPage() {
  useHeader({
    title: 'Sales',
    subtitle: 'Record sales',
  })

  return (
    <main className="page-content">
      <div className="page-body">
        <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl">
          <p className="text-text-secondary">Coming soon</p>
        </div>
      </div>
    </main>
  )
}
