'use client'

export function SalesStatsCard({ compact }: { compact: boolean }) {
  return <div data-testid="sales-stats-card">Stats {compact ? '(compact)' : '(full)'}</div>
}
