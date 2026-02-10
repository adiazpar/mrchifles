'use client'

import { useState, useCallback } from 'react'
import { PageHeader } from '@/components/layout'
import { Button, Card, CardBody, Input, Modal, Badge, useToast } from '@/components/ui'
import { IconCashDrawer, IconArrowUp, IconArrowDown, IconCheck } from '@/components/icons'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'

interface CashDrawerState {
  isOpen: boolean
  openingBalance: number
  currentBalance: number
  openedAt: Date | null
  transactions: CashTransaction[]
}

interface CashTransaction {
  id: string
  type: 'sale' | 'adjustment'
  amount: number
  paymentMethod: 'cash' | 'yape' | 'plin'
  timestamp: Date
  note?: string
}

// Mock data for demo
const INITIAL_STATE: CashDrawerState = {
  isOpen: true,
  openingBalance: 100,
  currentBalance: 285,
  openedAt: new Date(new Date().setHours(8, 0, 0, 0)),
  transactions: [
    {
      id: '1',
      type: 'sale',
      amount: 35,
      paymentMethod: 'cash',
      timestamp: new Date(new Date().setHours(9, 15, 0, 0)),
    },
    {
      id: '2',
      type: 'sale',
      amount: 50,
      paymentMethod: 'cash',
      timestamp: new Date(new Date().setHours(10, 30, 0, 0)),
    },
    {
      id: '3',
      type: 'sale',
      amount: 25,
      paymentMethod: 'yape',
      timestamp: new Date(new Date().setHours(11, 45, 0, 0)),
    },
    {
      id: '4',
      type: 'sale',
      amount: 75,
      paymentMethod: 'cash',
      timestamp: new Date(new Date().setHours(12, 20, 0, 0)),
    },
  ],
}

export default function CajaPage() {
  const [drawerState, setDrawerState] = useState<CashDrawerState>(INITIAL_STATE)
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false)
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingCount, setClosingCount] = useState('')
  const [closingNote, setClosingNote] = useState('')
  const { addToast } = useToast()

  const today = formatDate(new Date())

  // Calculate totals
  const cashSales = drawerState.transactions
    .filter((t) => t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + t.amount, 0)

  const yapeSales = drawerState.transactions
    .filter((t) => t.paymentMethod === 'yape')
    .reduce((sum, t) => sum + t.amount, 0)

  const plinSales = drawerState.transactions
    .filter((t) => t.paymentMethod === 'plin')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalSales = cashSales + yapeSales + plinSales
  const expectedCash = drawerState.openingBalance + cashSales

  const handleOpenDrawer = useCallback(() => {
    const amount = parseFloat(openingAmount)
    if (isNaN(amount) || amount < 0) {
      addToast('error', 'Ingresa un monto valido')
      return
    }

    setDrawerState({
      isOpen: true,
      openingBalance: amount,
      currentBalance: amount,
      openedAt: new Date(),
      transactions: [],
    })

    setIsOpeningModalOpen(false)
    setOpeningAmount('')
    addToast('success', 'Caja abierta')
  }, [openingAmount, addToast])

  const handleCloseDrawer = useCallback(() => {
    const countedAmount = parseFloat(closingCount)
    if (isNaN(countedAmount) || countedAmount < 0) {
      addToast('error', 'Ingresa el monto contado')
      return
    }

    const difference = countedAmount - expectedCash

    setDrawerState({
      isOpen: false,
      openingBalance: 0,
      currentBalance: 0,
      openedAt: null,
      transactions: [],
    })

    setIsClosingModalOpen(false)
    setClosingCount('')
    setClosingNote('')

    if (difference === 0) {
      addToast('success', 'Caja cerrada - Cuadre perfecto')
    } else if (difference > 0) {
      addToast('warning', `Caja cerrada - Sobrante: ${formatCurrency(difference)}`)
    } else {
      addToast('error', `Caja cerrada - Faltante: ${formatCurrency(Math.abs(difference))}`)
    }
  }, [closingCount, expectedCash, addToast])

  return (
    <>
      <PageHeader
        title="Caja"
        subtitle={today}
        actions={
          <Badge variant={drawerState.isOpen ? 'success' : 'default'}>
            {drawerState.isOpen ? 'Abierta' : 'Cerrada'}
          </Badge>
        }
      />

      <div className="main-content">
        {!drawerState.isOpen ? (
          // Closed state
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-bg-sunken flex items-center justify-center">
              <IconCashDrawer className="w-10 h-10 text-text-tertiary" />
            </div>
            <h2 className="text-xl font-display font-semibold mb-2">
              Caja Cerrada
            </h2>
            <p className="text-text-secondary mb-6">
              Abre la caja para comenzar a registrar ventas del dia
            </p>
            <Button size="lg" onClick={() => setIsOpeningModalOpen(true)}>
              Abrir Caja
            </Button>
          </div>
        ) : (
          // Open state
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card padding="md">
                <p className="stats-label">Apertura</p>
                <p className="text-2xl font-display font-bold">
                  {formatCurrency(drawerState.openingBalance)}
                </p>
                {drawerState.openedAt && (
                  <p className="text-sm text-text-tertiary mt-1">
                    {formatTime(drawerState.openedAt)}
                  </p>
                )}
              </Card>

              <Card padding="md">
                <p className="stats-label">Efectivo</p>
                <p className="text-2xl font-display font-bold text-cash">
                  {formatCurrency(cashSales)}
                </p>
              </Card>

              <Card padding="md">
                <p className="stats-label">Digital</p>
                <p className="text-2xl font-display font-bold text-yape">
                  {formatCurrency(yapeSales + plinSales)}
                </p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-text-tertiary">
                    Yape: {formatCurrency(yapeSales)}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    Plin: {formatCurrency(plinSales)}
                  </span>
                </div>
              </Card>

              <Card padding="md" className="bg-brand-subtle">
                <p className="stats-label">Esperado</p>
                <p className="text-2xl font-display font-bold">
                  {formatCurrency(expectedCash)}
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  En caja
                </p>
              </Card>
            </div>

            {/* Total sales */}
            <Card padding="lg" variant="bordered" className="text-center">
              <p className="stats-label">Ventas del dia</p>
              <p className="stats-value">{formatCurrency(totalSales)}</p>
              <p className="text-sm text-text-secondary mt-2">
                {drawerState.transactions.length} transacciones
              </p>
            </Card>

            {/* Recent transactions */}
            <Card variant="bordered">
              <div className="card-header flex items-center justify-between">
                <h3 className="font-medium">Movimientos Recientes</h3>
              </div>
              <div className="divide-y divide-border">
                {drawerState.transactions.length === 0 ? (
                  <p className="p-4 text-center text-text-tertiary">
                    Sin movimientos
                  </p>
                ) : (
                  drawerState.transactions
                    .slice()
                    .reverse()
                    .map((transaction) => (
                      <div
                        key={transaction.id}
                        className="p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              transaction.type === 'sale'
                                ? 'bg-success-subtle'
                                : 'bg-warning-subtle'
                            }`}
                          >
                            {transaction.type === 'sale' ? (
                              <IconArrowUp className="w-4 h-4 text-success" />
                            ) : (
                              <IconArrowDown className="w-4 h-4 text-warning" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">Venta</p>
                            <p className="text-sm text-text-tertiary">
                              {formatTime(transaction.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-success">
                            +{formatCurrency(transaction.amount)}
                          </p>
                          <Badge variant={transaction.paymentMethod}>
                            {transaction.paymentMethod === 'cash'
                              ? 'Efectivo'
                              : transaction.paymentMethod.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </Card>

            {/* Close drawer button */}
            <div className="flex justify-center pt-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setIsClosingModalOpen(true)}
              >
                <IconCheck className="w-5 h-5" />
                Cerrar Caja
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Opening Modal */}
      <Modal
        isOpen={isOpeningModalOpen}
        onClose={() => setIsOpeningModalOpen(false)}
        title="Abrir Caja"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsOpeningModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleOpenDrawer}>Abrir Caja</Button>
          </>
        }
      >
        <Input
          label="Monto inicial"
          type="number"
          step="0.01"
          min="0"
          value={openingAmount}
          onChange={(e) => setOpeningAmount(e.target.value)}
          placeholder="0.00"
          helper="Cuenta el efectivo en la caja antes de comenzar"
          autoFocus
        />
      </Modal>

      {/* Closing Modal */}
      <Modal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        title="Cerrar Caja"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsClosingModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCloseDrawer}>Cerrar Caja</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-bg-sunken rounded-lg">
            <p className="text-sm text-text-secondary mb-1">
              Efectivo esperado
            </p>
            <p className="text-2xl font-display font-bold">
              {formatCurrency(expectedCash)}
            </p>
          </div>

          <Input
            label="Efectivo contado"
            type="number"
            step="0.01"
            min="0"
            value={closingCount}
            onChange={(e) => setClosingCount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />

          <Input
            label="Notas (opcional)"
            value={closingNote}
            onChange={(e) => setClosingNote(e.target.value)}
            placeholder="Observaciones del cierre..."
          />
        </div>
      </Modal>
    </>
  )
}
