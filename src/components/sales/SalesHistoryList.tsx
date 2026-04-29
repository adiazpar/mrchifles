'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Filter, Receipt } from 'lucide-react'
import { useSales } from '@/contexts/sales-context'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import { SaleDetailModal } from './SaleDetailModal'
import { SalesHistoryFilterSheet, type HistoryFilter } from './SalesHistoryFilterSheet'
import type { Sale } from '@/types/sale'

interface Props {
  hidden: boolean
}

const EMPTY_FILTER: HistoryFilter = { from: null, to: null, paymentMethod: null }

export function SalesHistoryList({ hidden }: Props) {
  const t = useTranslations('sales')
  const tH = useTranslations('sales.history')
  const tEmpty = useTranslations('sales.empty_state')
  const { sales, isLoading, loadMore } = useSales()
  const { formatCurrency, formatTime, formatDate } = useBusinessFormat()
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState<HistoryFilter>(EMPTY_FILTER)

  const visibleSales = useMemo(() => {
    return sales.filter((s) => {
      if (filter.from && new Date(s.date) < new Date(filter.from)) return false
      if (filter.to) {
        const toEnd = new Date(filter.to)
        toEnd.setHours(23, 59, 59, 999)
        if (new Date(s.date) > toEnd) return false
      }
      if (filter.paymentMethod && s.paymentMethod !== filter.paymentMethod) return false
      return true
    })
  }, [sales, filter])

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading) {
        void loadMore()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, isLoading])

  if (hidden) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="text-xs flex items-center gap-1 text-text-secondary"
          onClick={() => setFilterOpen(true)}
        >
          <Filter className="w-3 h-3" />
          {t('filter')}
        </button>
      </div>

      {visibleSales.length === 0 ? (
        (filter.from || filter.to || filter.paymentMethod) ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-secondary">
            {tEmpty('no_results_for_filter')}
          </div>
        ) : (
          <div className="empty-state-fill">
            <Receipt className="empty-state-icon" />
            <h3 className="empty-state-title">{tEmpty('no_sales_yet')}</h3>
            <p className="empty-state-description">{tEmpty('ring_up_first')}</p>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-1">
          {visibleSales.map((sale) => {
            const date = new Date(sale.date)
            const today = new Date()
            const yesterday = new Date()
            yesterday.setDate(today.getDate() - 1)
            const isToday = date.toDateString() === today.toDateString()
            const isYesterday = date.toDateString() === yesterday.toDateString()
            const dateLabel = isToday
              ? tH('rel_today', { time: formatTime(date) })
              : isYesterday
                ? tH('rel_yesterday', { time: formatTime(date) })
                : `${formatDate(date)} ${formatTime(date)}`

            const itemNames = sale.items.slice(0, 2).map((it) => it.productName).join(', ')
            const remaining = sale.items.length - 2
            const itemSummary = remaining > 0
              ? tH('item_summary_with_more', { count: sale.items.length, names: itemNames, remaining })
              : tH('item_summary', { count: sale.items.length, names: itemNames })

            return (
              <button
                key={sale.id}
                type="button"
                className="rounded-xl border border-border bg-bg-elevated p-3 text-left hover:border-brand-300"
                onClick={() => setSelectedSale(sale)}
              >
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>#{sale.saleNumber}</span>
                  <span>{dateLabel}</span>
                </div>
                <div className="text-sm mt-1 truncate">{itemSummary}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-text-secondary uppercase">{sale.paymentMethod}</span>
                  <span className="text-sm font-semibold">{formatCurrency(sale.total)}</span>
                </div>
              </button>
            )
          })}
          <div ref={sentinelRef} className="h-4" />
        </div>
      )}

      <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      <SalesHistoryFilterSheet
        isOpen={filterOpen}
        current={filter}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setFilter(next)
          setFilterOpen(false)
        }}
      />
    </div>
  )
}
