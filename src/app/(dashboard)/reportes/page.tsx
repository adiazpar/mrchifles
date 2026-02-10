'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout'
import { Card, CardBody, Badge, Select } from '@/components/ui'
import { IconArrowUp, IconArrowDown, IconCalendar } from '@/components/icons'
import { formatCurrency, formatDate } from '@/lib/utils'

interface SalesSummary {
  totalSales: number
  transactionCount: number
  averageTicket: number
  cashSales: number
  yapeSales: number
  plinSales: number
  topProducts: { name: string; quantity: number; revenue: number }[]
  previousPeriodSales: number
}

// Mock data for demo
const MOCK_SUMMARY: SalesSummary = {
  totalSales: 1250.0,
  transactionCount: 45,
  averageTicket: 27.78,
  cashSales: 650.0,
  yapeSales: 450.0,
  plinSales: 150.0,
  topProducts: [
    { name: 'Chifles Tocino', quantity: 35, revenue: 210.0 },
    { name: 'Combo Familiar', quantity: 12, revenue: 180.0 },
    { name: 'Chifles Mix', quantity: 20, revenue: 160.0 },
    { name: 'Chifles Natural', quantity: 28, revenue: 140.0 },
    { name: 'Chifles BBQ', quantity: 18, revenue: 117.0 },
  ],
  previousPeriodSales: 1100.0,
}

const periodOptions = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
]

export default function ReportesPage() {
  const [period, setPeriod] = useState('today')
  const [summary] = useState<SalesSummary>(MOCK_SUMMARY)

  const today = formatDate(new Date())

  // Calculate change percentage
  const changePercent =
    summary.previousPeriodSales > 0
      ? ((summary.totalSales - summary.previousPeriodSales) /
          summary.previousPeriodSales) *
        100
      : 0

  const isPositiveChange = changePercent >= 0

  // Calculate payment method percentages
  const cashPercent = (summary.cashSales / summary.totalSales) * 100
  const yapePercent = (summary.yapeSales / summary.totalSales) * 100
  const plinPercent = (summary.plinSales / summary.totalSales) * 100

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle={today}
        actions={
          <div className="flex items-center gap-2">
            <IconCalendar className="w-5 h-5 text-text-tertiary" />
            <Select
              options={periodOptions}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-40"
            />
          </div>
        }
      />

      <div className="main-content space-y-6">
        {/* Hero stat - Total Sales */}
        <Card padding="lg" variant="bordered" className="text-center">
          <p className="stats-label">Ventas Totales</p>
          <p className="stats-value">{formatCurrency(summary.totalSales)}</p>
          <div
            className={`stats-change justify-center ${
              isPositiveChange ? 'positive' : 'negative'
            }`}
          >
            {isPositiveChange ? (
              <IconArrowUp className="w-4 h-4" />
            ) : (
              <IconArrowDown className="w-4 h-4" />
            )}
            <span>
              {Math.abs(changePercent).toFixed(1)}% vs periodo anterior
            </span>
          </div>
        </Card>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card padding="md">
            <p className="stats-label">Transacciones</p>
            <p className="text-3xl font-display font-bold">
              {summary.transactionCount}
            </p>
          </Card>

          <Card padding="md">
            <p className="stats-label">Ticket Promedio</p>
            <p className="text-3xl font-display font-bold">
              {formatCurrency(summary.averageTicket)}
            </p>
          </Card>

          <Card padding="md" className="col-span-2 lg:col-span-1">
            <p className="stats-label">Margen Estimado</p>
            <p className="text-3xl font-display font-bold text-success">
              {formatCurrency(summary.totalSales * 0.4)}
            </p>
            <p className="text-sm text-text-tertiary mt-1">~40% del total</p>
          </Card>
        </div>

        {/* Payment breakdown */}
        <Card variant="bordered">
          <div className="card-header">
            <h3 className="font-medium">Ventas por Metodo de Pago</h3>
          </div>
          <CardBody>
            <div className="space-y-4">
              {/* Cash */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="cash">Efectivo</Badge>
                    <span className="text-sm text-text-secondary">
                      {cashPercent.toFixed(0)}%
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(summary.cashSales)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill bg-cash"
                    style={{ width: `${cashPercent}%` }}
                  />
                </div>
              </div>

              {/* Yape */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="yape">Yape</Badge>
                    <span className="text-sm text-text-secondary">
                      {yapePercent.toFixed(0)}%
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(summary.yapeSales)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill bg-yape"
                    style={{ width: `${yapePercent}%` }}
                  />
                </div>
              </div>

              {/* Plin */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="plin">Plin</Badge>
                    <span className="text-sm text-text-secondary">
                      {plinPercent.toFixed(0)}%
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(summary.plinSales)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill bg-plin"
                    style={{ width: `${plinPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Top products */}
        <Card variant="bordered">
          <div className="card-header">
            <h3 className="font-medium">Productos Mas Vendidos</h3>
          </div>
          <div className="divide-y divide-border">
            {summary.topProducts.map((product, index) => (
              <div
                key={product.name}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? 'bg-brand text-white'
                        : index === 1
                        ? 'bg-brand-subtle text-brand'
                        : 'bg-bg-sunken text-text-secondary'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-text-tertiary">
                      {product.quantity} unidades
                    </p>
                  </div>
                </div>
                <span className="font-medium">
                  {formatCurrency(product.revenue)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

