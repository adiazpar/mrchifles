'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui'
import {
  Sparkline,
  DonutChart,
  HorizontalBarChart,
} from '@/components/ui/charts'
import {
  IconSales,
  IconProducts,
  IconCashDrawer,
  IconReports,
  IconArrowUp,
  IconArrowDown,
} from '@/components/icons'
import { formatCurrency } from '@/lib/utils'

// Mock user data - will be replaced with auth context
const currentUser = {
  name: 'Arturo Diaz',
  initials: 'AD',
}

// Mock data for demo
const MOCK_STATS = {
  todaySales: 1250.0,
  previousDaySales: 1100.0,
  transactionCount: 45,
  cashDrawerStatus: 'open' as const,
  cashBalance: 650.0,
  dailyGoal: 1500.0,
}

// Weekly sales trend (last 7 days)
const WEEKLY_SALES = [820, 950, 1100, 890, 1200, 1100, 1250]

// Payment method breakdown
const PAYMENT_BREAKDOWN = [
  { value: 750, color: 'var(--color-cash)', label: 'Efectivo' },
  { value: 420, color: 'var(--color-yape)', label: 'Yape' },
  { value: 80, color: 'var(--color-plin)', label: 'Plin' },
]

// Top products
const TOP_PRODUCTS = [
  { label: 'Tocino', value: 28, color: 'var(--color-brand)' },
  { label: 'Natural', value: 22, color: 'var(--brand-400)' },
  { label: 'Picante', value: 15, color: 'var(--brand-300)' },
  { label: 'Dulce', value: 10, color: 'var(--brand-200)' },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos dias'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function InicioPage() {
  const [greeting, setGreeting] = useState(getGreeting())
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Lima',
        })
      )
      setGreeting(getGreeting())
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  const salesChange =
    MOCK_STATS.previousDaySales > 0
      ? ((MOCK_STATS.todaySales - MOCK_STATS.previousDaySales) /
          MOCK_STATS.previousDaySales) *
        100
      : 0
  const isPositiveChange = salesChange >= 0
  const goalProgress = (MOCK_STATS.todaySales / MOCK_STATS.dailyGoal) * 100
  const averageTicket = MOCK_STATS.transactionCount > 0
    ? MOCK_STATS.todaySales / MOCK_STATS.transactionCount
    : 0

  return (
    <div className="min-h-screen">
      {/* Header - NO card, just typography */}
      <div className="home-header">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-text-secondary">{currentTime}</p>
            <h1 className="home-greeting">{greeting}</h1>
          </div>
          {/* User avatar - visible on mobile */}
          <div className="lg:hidden w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
            {currentUser.initials}
          </div>
        </div>

        {/* Hero stat - big typography, no card wrapper */}
        <div className="hero-stat">
          <div className="hero-stat-label">Ventas de Hoy</div>
          <div className="hero-stat-value">{formatCurrency(MOCK_STATS.todaySales)}</div>
          <div className={`hero-stat-change ${isPositiveChange ? 'positive' : 'negative'}`}>
            {isPositiveChange ? (
              <IconArrowUp className="w-4 h-4" />
            ) : (
              <IconArrowDown className="w-4 h-4" />
            )}
            <span>
              {Math.abs(salesChange).toFixed(1)}% vs ayer
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link href="/ventas" className="quick-action quick-action-primary">
            <div className="quick-action-icon">
              <IconSales className="w-6 h-6" />
            </div>
            <span className="quick-action-label">Nueva Venta</span>
          </Link>

          <Link href="/caja" className="quick-action">
            <div className="quick-action-icon">
              <IconCashDrawer className="w-5 h-5" />
            </div>
            <span className="quick-action-label">Ver Caja</span>
          </Link>

          <Link href="/productos" className="quick-action">
            <div className="quick-action-icon">
              <IconProducts className="w-5 h-5" />
            </div>
            <span className="quick-action-label">Productos</span>
          </Link>

          <Link href="/reportes" className="quick-action">
            <div className="quick-action-icon">
              <IconReports className="w-5 h-5" />
            </div>
            <span className="quick-action-label">Reportes</span>
          </Link>
        </div>

        {/* Inline stats row - NO cards, just numbers with separators */}
        <div className="flex items-center justify-between py-4 mb-6 border-y border-border">
          <div className="text-center flex-1">
            <p className="text-2xl font-display font-bold text-text-primary">
              {MOCK_STATS.transactionCount}
            </p>
            <p className="text-xs text-text-secondary uppercase tracking-wide">Ventas</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center flex-1">
            <p className="text-2xl font-display font-bold text-text-primary">
              {formatCurrency(averageTicket)}
            </p>
            <p className="text-xs text-text-secondary uppercase tracking-wide">Promedio</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center flex-1">
            <p className="text-2xl font-display font-bold text-text-primary">
              {Math.round(goalProgress)}%
            </p>
            <p className="text-xs text-text-secondary uppercase tracking-wide">Meta</p>
          </div>
        </div>

        {/* Summary section */}
        <div className="space-y-4">
          <h2 className="text-lg font-display font-semibold text-text-primary">
            Resumen del Dia
          </h2>

          {/* Payment Methods - card with donut */}
          <Card variant="bordered">
            <div className="p-4">
              <p className="stats-label mb-4">Metodos de Pago</p>
              <div className="flex items-center gap-8">
                <DonutChart
                  segments={PAYMENT_BREAKDOWN}
                  size={120}
                  strokeWidth={18}
                >
                  <div className="text-center">
                    <p className="text-[10px] text-text-tertiary">Total</p>
                    <p className="text-xs font-bold text-text-primary">
                      {formatCurrency(MOCK_STATS.todaySales)}
                    </p>
                  </div>
                </DonutChart>
                <div className="flex-1 space-y-3">
                  {PAYMENT_BREAKDOWN.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-text-secondary">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Top Products - horizontal bars */}
          <Card variant="bordered">
            <div className="p-4">
              <p className="stats-label mb-4">Productos Mas Vendidos</p>
              <HorizontalBarChart
                data={TOP_PRODUCTS}
                showValues={true}
                formatValue={(v) => `${v} uds`}
                barHeight={20}
                gap={10}
              />
            </div>
          </Card>

          {/* Cash drawer status - minimal, no heavy card */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-bg-surface">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                MOCK_STATS.cashDrawerStatus === 'open'
                  ? 'bg-success-subtle text-success'
                  : 'bg-error-subtle text-error'
              }`}
            >
              <IconCashDrawer className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-text-primary">Estado de Caja</p>
              <p className="text-sm text-text-secondary">
                {MOCK_STATS.cashDrawerStatus === 'open' ? (
                  <>
                    <span className="text-success font-medium">Abierta</span>
                    {' - '}
                    {formatCurrency(MOCK_STATS.cashBalance)} en efectivo
                  </>
                ) : (
                  <span className="text-error font-medium">Cerrada</span>
                )}
              </p>
            </div>
          </div>

          {/* Weekly trend - full width chart with axis labels */}
          <div className="p-4 rounded-xl border border-border bg-bg-surface">
            <div className="flex items-center justify-between mb-4">
              <p className="stats-label">Tendencia Semanal</p>
              <span className="text-xs text-text-tertiary">Ultimos 7 dias</span>
            </div>
            <Sparkline
              data={WEEKLY_SALES}
              width={300}
              height={60}
              strokeColor="var(--color-brand)"
              fillColor="var(--color-brand)"
              strokeWidth={2}
              showFill={true}
            />
            <div className="flex justify-between mt-3 text-xs text-text-tertiary">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mie</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sab</span>
              <span>Hoy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
