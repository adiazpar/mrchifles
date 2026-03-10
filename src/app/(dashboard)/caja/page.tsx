'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { IconClose, IconAdd, IconTime, IconCashDrawer, IconArrowUp, IconArrowDown, IconCheck, IconClock } from '@/components/icons'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CashSession, CashMovement, CashMovementType, CashMovementCategory, User } from '@/types'

// ============================================
// CONSTANTS
// ============================================

type PageTab = 'caja' | 'historial'

const CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  apertura: 'Apertura',
  venta: 'Venta',
  prestamo_empleado: 'Prestamo empleado',
  retiro_banco: 'Retiro de banco',
  cambio: 'Sencillo/Cambio',
  devolucion_prestamo: 'Devolucion prestamo',
  deposito_banco: 'Deposito a banco',
  gastos: 'Gastos operativos',
  devolucion_cliente: 'Devolucion cliente',
  cambio_billetes: 'Cambio de billetes',
  otro: 'Otro',
}

const INGRESO_CATEGORIES: CashMovementCategory[] = [
  'prestamo_empleado',
  'retiro_banco',
  'cambio',
  'otro'
]

const EGRESO_CATEGORIES: CashMovementCategory[] = [
  'devolucion_prestamo',
  'deposito_banco',
  'gastos',
  'devolucion_cliente',
  'cambio_billetes',
  'otro'
]

// ============================================
// MODAL COMPONENT
// ============================================

function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Cerrar"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CajaPage() {
  const { user, pb } = useAuth()

  // Tab state
  const [activeTab, setActiveTab] = useState<PageTab>('caja')

  // Session state
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [isOpenDrawerModalOpen, setIsOpenDrawerModalOpen] = useState(false)
  const [isCloseDrawerModalOpen, setIsCloseDrawerModalOpen] = useState(false)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const [isSessionDetailModalOpen, setIsSessionDetailModalOpen] = useState(false)
  const [viewingSession, setViewingSession] = useState<CashSession | null>(null)
  const [viewingSessionMovements, setViewingSessionMovements] = useState<CashMovement[]>([])

  // Form states
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [discrepancyNote, setDiscrepancyNote] = useState('')
  const [movementType, setMovementType] = useState<CashMovementType>('ingreso')
  const [movementCategory, setMovementCategory] = useState<CashMovementCategory | ''>('')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementNote, setMovementNote] = useState('')

  // Loading states
  const [isOpening, setIsOpening] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isSavingMovement, setIsSavingMovement] = useState(false)
  const [isLoadingSessionDetail, setIsLoadingSessionDetail] = useState(false)

  // ============================================
  // CALCULATED VALUES
  // ============================================

  const expectedBalance = useMemo(() => {
    if (!currentSession) return 0

    let balance = currentSession.openingBalance

    for (const mov of movements) {
      if (mov.type === 'ingreso') {
        balance += mov.amount
      } else {
        balance -= mov.amount
      }
    }

    return balance
  }, [currentSession, movements])

  const outstandingLoans = useMemo(() => {
    const loans = new Map<string, { name: string; amount: number }>()

    for (const mov of movements) {
      if (mov.category === 'prestamo_empleado' && mov.employee) {
        const current = loans.get(mov.employee) || { name: mov.expand?.employee?.name || 'Empleado', amount: 0 }
        current.amount += mov.amount
        loans.set(mov.employee, current)
      } else if (mov.category === 'devolucion_prestamo' && mov.employee) {
        const current = loans.get(mov.employee) || { name: mov.expand?.employee?.name || 'Empleado', amount: 0 }
        current.amount -= mov.amount
        loans.set(mov.employee, current)
      }
    }

    // Filter out zero balances
    for (const [key, value] of loans) {
      if (value.amount <= 0) {
        loans.delete(key)
      }
    }

    return loans
  }, [movements])

  const closingDiscrepancy = useMemo(() => {
    const actualBalance = parseFloat(closingBalance) || 0
    return actualBalance - expectedBalance
  }, [closingBalance, expectedBalance])

  // ============================================
  // DATA LOADING
  // ============================================

  const loadCurrentSession = useCallback(async () => {
    try {
      // Find open session (closedAt is null)
      const openSessions = await pb.collection('cash_sessions').getList<CashSession>(1, 1, {
        filter: 'closedAt = null',
        sort: '-openedAt',
        expand: 'openedBy',
        requestKey: null,
      })

      if (openSessions.items.length > 0) {
        setCurrentSession(openSessions.items[0])
        return openSessions.items[0].id
      } else {
        setCurrentSession(null)
        return null
      }
    } catch (err) {
      console.error('Error loading current session:', err)
      return null
    }
  }, [pb])

  const loadMovements = useCallback(async (sessionId: string) => {
    try {
      console.log('loadMovements called with sessionId:', sessionId)

      // Try the simplest possible query - just getList with no options
      const result = await pb.collection('cash_movements').getList(1, 50)
      console.log('Got result:', result)

      const movs = result.items.filter(m => m.session === sessionId) as CashMovement[]
      setMovements(movs)
    } catch (err: unknown) {
      console.error('Error loading movements:', err)
      // Log the full error object
      console.error('Full error:', JSON.stringify(err, null, 2))
    }
  }, [pb])

  const loadSessions = useCallback(async () => {
    try {
      const sess = await pb.collection('cash_sessions').getFullList<CashSession>({
        sort: '-openedAt',
        expand: 'openedBy,closedBy',
        requestKey: null,
      })
      setSessions(sess)
    } catch (err) {
      console.error('Error loading sessions:', err)
    }
  }, [pb])

  // Initial load
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)
      try {
        const sessionId = await loadCurrentSession()
        if (sessionId && !cancelled) {
          await loadMovements(sessionId)
        }
        if (!cancelled) {
          await loadSessions()
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading data:', err)
          setError('Error al cargar los datos')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [loadCurrentSession, loadMovements, loadSessions])

  // ============================================
  // ACTIONS
  // ============================================

  const handleOpenDrawer = async () => {
    if (!user) return

    const balance = parseFloat(openingBalance)
    if (isNaN(balance) || balance < 0) {
      return
    }

    setIsOpening(true)
    try {
      const now = new Date().toISOString()

      // Create session
      const session = await pb.collection('cash_sessions').create<CashSession>({
        openedAt: now,
        openedBy: user.id,
        openingBalance: balance,
      })

      // Create apertura movement
      await pb.collection('cash_movements').create({
        session: session.id,
        type: 'ingreso',
        category: 'apertura',
        amount: balance,
        createdBy: user.id,
      })

      // Refresh data
      setCurrentSession(session)
      await loadMovements(session.id)
      await loadSessions()

      // Close modal and reset form
      setIsOpenDrawerModalOpen(false)
      setOpeningBalance('')
    } catch (err) {
      console.error('Error opening drawer:', err)
      setError('Error al abrir la caja')
    } finally {
      setIsOpening(false)
    }
  }

  const handleCloseDrawer = async () => {
    if (!user || !currentSession) return

    const actualBalance = parseFloat(closingBalance)
    if (isNaN(actualBalance) || actualBalance < 0) {
      return
    }

    setIsClosing(true)
    try {
      const now = new Date().toISOString()

      // Update session with closing info
      await pb.collection('cash_sessions').update(currentSession.id, {
        closedAt: now,
        closedBy: user.id,
        closingBalance: actualBalance,
        expectedBalance: expectedBalance,
        discrepancy: closingDiscrepancy,
        discrepancyNote: discrepancyNote.trim() || null,
      })

      // Refresh data
      setCurrentSession(null)
      setMovements([])
      await loadSessions()

      // Close modal and reset form
      setIsCloseDrawerModalOpen(false)
      setClosingBalance('')
      setDiscrepancyNote('')
    } catch (err) {
      console.error('Error closing drawer:', err)
      setError('Error al cerrar la caja')
    } finally {
      setIsClosing(false)
    }
  }

  const handleRecordMovement = async () => {
    if (!user || !currentSession || !movementCategory) return

    const amount = parseFloat(movementAmount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    setIsSavingMovement(true)
    try {
      await pb.collection('cash_movements').create({
        session: currentSession.id,
        type: movementType,
        category: movementCategory,
        amount: amount,
        note: movementNote.trim() || null,
        createdBy: user.id,
        // For employee loans, use current user as employee (can be enhanced later)
        employee: (movementCategory === 'prestamo_empleado' || movementCategory === 'devolucion_prestamo') ? user.id : null,
      })

      // Refresh movements
      await loadMovements(currentSession.id)

      // Close modal and reset form
      setIsMovementModalOpen(false)
      setMovementType('ingreso')
      setMovementCategory('')
      setMovementAmount('')
      setMovementNote('')
    } catch (err) {
      console.error('Error recording movement:', err)
      setError('Error al registrar el movimiento')
    } finally {
      setIsSavingMovement(false)
    }
  }

  const handleViewSessionDetail = async (session: CashSession) => {
    setViewingSession(session)
    setIsSessionDetailModalOpen(true)
    setIsLoadingSessionDetail(true)

    try {
      // Use simple getList with client-side filtering (same fix as loadMovements)
      const result = await pb.collection('cash_movements').getList(1, 50)
      const movs = result.items.filter(m => m.session === session.id) as CashMovement[]
      // Sort by created descending (newest first)
      movs.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      setViewingSessionMovements(movs)
    } catch (err) {
      console.error('Error loading session movements:', err)
    } finally {
      setIsLoadingSessionDetail(false)
    }
  }

  // ============================================
  // FORMAT HELPERS
  // ============================================

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    }).replace(/a\.\s*m\./gi, 'a.m.').replace(/p\.\s*m\./gi, 'p.m.')
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    }).replace(/a\.\s*m\./gi, 'a.m.').replace(/p\.\s*m\./gi, 'p.m.')
  }

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <PageHeader title="Caja" subtitle="Control de caja" />
        <main className="page-content">
          <div className="page-body">
            <div className="flex items-center justify-center h-64">
              <Spinner />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <PageHeader title="Caja" subtitle="Control de caja" />
      <main className="page-content space-y-4">
        {/* Section Tabs */}
        <div className="section-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('caja')}
            className={`section-tab ${activeTab === 'caja' ? 'section-tab-active' : ''}`}
          >
            Caja
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className={`section-tab ${activeTab === 'historial' ? 'section-tab-active' : ''}`}
          >
            Historial
          </button>
        </div>

        {activeTab === 'caja' ? (
          <div className="page-body space-y-4">
            {error && (
              <div className="p-4 bg-error-subtle text-error rounded-lg">
                {error}
              </div>
            )}

            {currentSession ? (
              // Open drawer view
              <div className="space-y-4">
                {/* Balance Card */}
                <div className="card p-4" style={{ background: 'var(--color-success-light)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                      Caja abierta
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatDateTime(currentSession.openedAt)}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-text-primary mb-1">
                    {formatCurrency(expectedBalance)}
                  </div>
                  <div className="text-sm text-text-secondary">
                    Saldo esperado
                  </div>
                </div>

                {/* Outstanding Loans */}
                {outstandingLoans.size > 0 && (
                  <div className="card p-4">
                    <h3 className="text-sm font-medium text-text-secondary mb-3">
                      Prestamos pendientes
                    </h3>
                    <div className="space-y-2">
                      {Array.from(outstandingLoans.entries()).map(([id, loan]) => (
                        <div key={id} className="flex items-center justify-between">
                          <span className="text-text-primary">{loan.name}</span>
                          <span className="font-medium" style={{ color: 'var(--color-warning)' }}>
                            {formatCurrency(loan.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsMovementModalOpen(true)}
                    className="btn btn-primary flex-1"
                  >
                    <IconAdd className="w-5 h-5" />
                    Registrar movimiento
                  </button>
                  <button
                    onClick={() => setIsCloseDrawerModalOpen(true)}
                    className="btn btn-secondary"
                  >
                    Cerrar caja
                  </button>
                </div>

                {/* Movements List */}
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-3">
                    Movimientos de hoy
                  </h3>
                  {movements.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary">
                      No hay movimientos registrados
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {movements.map((mov) => (
                        <div
                          key={mov.id}
                          className="card p-3 flex items-center gap-3"
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{
                              background: mov.type === 'ingreso'
                                ? 'var(--color-success-light)'
                                : 'var(--color-error-light)',
                            }}
                          >
                            {mov.type === 'ingreso' ? (
                              <IconArrowDown className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                            ) : (
                              <IconArrowUp className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-text-primary">
                              {CATEGORY_LABELS[mov.category]}
                            </div>
                            {mov.note && (
                              <div className="text-xs text-text-secondary truncate">
                                {mov.note}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div
                              className="font-medium"
                              style={{
                                color: mov.type === 'ingreso'
                                  ? 'var(--color-success)'
                                  : 'var(--color-error)',
                              }}
                            >
                              {mov.type === 'ingreso' ? '+' : '-'}{formatCurrency(mov.amount)}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {formatTime(mov.created)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Closed drawer view
              <div className="empty-state-fill">
                <IconCashDrawer className="empty-state-icon" />
                <h3 className="empty-state-title">Caja cerrada</h3>
                <p className="empty-state-description">
                  Abre la caja para comenzar a registrar movimientos
                </p>
                <button
                  type="button"
                  onClick={() => setIsOpenDrawerModalOpen(true)}
                  className="btn btn-primary mt-4"
                >
                  Abrir Caja
                </button>
              </div>
            )}
          </div>
        ) : (
          // Historial tab
          <div className="page-body space-y-4">
            {sessions.length === 0 ? (
              <div className="empty-state-fill">
                <IconTime className="empty-state-icon" />
                <h3 className="empty-state-title">No hay sesiones</h3>
                <p className="empty-state-description">
                  Las sesiones de caja apareceran aqui
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleViewSessionDetail(session)}
                    className="card p-4 w-full text-left hover:border-brand transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {session.closedAt ? (
                          <IconCheck className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <IconClock className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />
                        )}
                        <span className="font-medium text-text-primary">
                          {formatDate(session.openedAt)}
                        </span>
                      </div>
                      <span className="text-sm text-text-secondary">
                        {session.closedAt ? 'Cerrada' : 'Abierta'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-text-secondary">
                        Apertura: {formatCurrency(session.openingBalance)}
                      </div>
                      {session.closedAt && session.closingBalance !== undefined && (
                        <div className="text-text-secondary">
                          Cierre: {formatCurrency(session.closingBalance)}
                        </div>
                      )}
                    </div>
                    {session.discrepancy !== undefined && session.discrepancy !== 0 && (
                      <div className="mt-2 text-sm">
                        <span className="text-text-secondary">Diferencia: </span>
                        <span
                          className="font-medium"
                          style={{
                            color: session.discrepancy > 0
                              ? 'var(--color-success)'
                              : 'var(--color-error)',
                          }}
                        >
                          {session.discrepancy > 0 ? '+' : ''}{formatCurrency(session.discrepancy)}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Open Drawer Modal */}
      <Modal
        isOpen={isOpenDrawerModalOpen}
        onClose={() => !isOpening && setIsOpenDrawerModalOpen(false)}
        title="Abrir Caja"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsOpenDrawerModalOpen(false)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={isOpening}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleOpenDrawer}
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={isOpening || !openingBalance || parseFloat(openingBalance) < 0}
            >
              {isOpening ? <Spinner /> : 'Abrir'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Saldo inicial (S/)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="input w-full text-lg"
              placeholder="0.00"
              min="0"
              step="0.01"
              autoFocus
            />
          </div>
          <p className="text-sm text-text-secondary">
            Ingresa la cantidad de efectivo con la que inicias la caja
          </p>
        </div>
      </Modal>

      {/* Close Drawer Modal */}
      <Modal
        isOpen={isCloseDrawerModalOpen}
        onClose={() => !isClosing && setIsCloseDrawerModalOpen(false)}
        title="Cerrar Caja"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCloseDrawerModalOpen(false)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={isClosing}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={isClosing || !closingBalance || parseFloat(closingBalance) < 0}
            >
              {isClosing ? <Spinner /> : 'Cerrar caja'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-raised)' }}>
            <div className="text-sm text-text-secondary mb-1">Saldo esperado</div>
            <div className="text-xl font-bold text-text-primary">
              {formatCurrency(expectedBalance)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Saldo real (S/)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              className="input w-full text-lg"
              placeholder="0.00"
              min="0"
              step="0.01"
              autoFocus
            />
          </div>

          {closingBalance && (
            <div
              className="p-3 rounded-lg"
              style={{
                background: closingDiscrepancy === 0
                  ? 'var(--color-success-light)'
                  : closingDiscrepancy > 0
                    ? 'var(--color-warning-light, var(--color-surface-raised))'
                    : 'var(--color-error-light)',
              }}
            >
              <div className="text-sm text-text-secondary mb-1">Diferencia</div>
              <div
                className="text-xl font-bold"
                style={{
                  color: closingDiscrepancy === 0
                    ? 'var(--color-success)'
                    : closingDiscrepancy > 0
                      ? 'var(--color-warning, var(--color-text-primary))'
                      : 'var(--color-error)',
                }}
              >
                {closingDiscrepancy > 0 ? '+' : ''}{formatCurrency(closingDiscrepancy)}
              </div>
            </div>
          )}

          {closingBalance && closingDiscrepancy !== 0 && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Nota (opcional)
              </label>
              <textarea
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                className="input w-full"
                placeholder="Explica la diferencia..."
                rows={2}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Movement Modal */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => !isSavingMovement && setIsMovementModalOpen(false)}
        title="Registrar movimiento"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={isSavingMovement}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRecordMovement}
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={isSavingMovement || !movementCategory || !movementAmount || parseFloat(movementAmount) <= 0}
            >
              {isSavingMovement ? <Spinner /> : 'Registrar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMovementType('ingreso')
                setMovementCategory('')
              }}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                movementType === 'ingreso'
                  ? 'text-white'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary'
              }`}
              style={movementType === 'ingreso' ? { background: 'var(--color-success)' } : undefined}
            >
              <IconArrowDown className="w-5 h-5 inline-block mr-2" />
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => {
                setMovementType('egreso')
                setMovementCategory('')
              }}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                movementType === 'egreso'
                  ? 'text-white'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary'
              }`}
              style={movementType === 'egreso' ? { background: 'var(--color-error)' } : undefined}
            >
              <IconArrowUp className="w-5 h-5 inline-block mr-2" />
              Egreso
            </button>
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Categoria
            </label>
            <select
              value={movementCategory}
              onChange={(e) => setMovementCategory(e.target.value as CashMovementCategory)}
              className="input w-full"
            >
              <option value="">Seleccionar...</option>
              {(movementType === 'ingreso' ? INGRESO_CATEGORIES : EGRESO_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Monto (S/)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              className="input w-full text-lg"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Nota (opcional)
            </label>
            <textarea
              value={movementNote}
              onChange={(e) => setMovementNote(e.target.value)}
              className="input w-full"
              placeholder="Descripcion del movimiento..."
              rows={2}
            />
          </div>
        </div>
      </Modal>

      {/* Session Detail Modal */}
      <Modal
        isOpen={isSessionDetailModalOpen}
        onClose={() => setIsSessionDetailModalOpen(false)}
        title={viewingSession ? formatDate(viewingSession.openedAt) : 'Detalle de sesion'}
      >
        {isLoadingSessionDetail ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : viewingSession ? (
          <div className="space-y-4">
            {/* Session Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Apertura</span>
                <span className="text-text-primary">
                  {formatTime(viewingSession.openedAt)} - {formatCurrency(viewingSession.openingBalance)}
                </span>
              </div>
              {viewingSession.closedAt && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Cierre</span>
                    <span className="text-text-primary">
                      {formatTime(viewingSession.closedAt)} - {formatCurrency(viewingSession.closingBalance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Esperado</span>
                    <span className="text-text-primary">
                      {formatCurrency(viewingSession.expectedBalance || 0)}
                    </span>
                  </div>
                  {viewingSession.discrepancy !== undefined && viewingSession.discrepancy !== 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Diferencia</span>
                      <span
                        className="font-medium"
                        style={{
                          color: viewingSession.discrepancy > 0
                            ? 'var(--color-success)'
                            : 'var(--color-error)',
                        }}
                      >
                        {viewingSession.discrepancy > 0 ? '+' : ''}{formatCurrency(viewingSession.discrepancy)}
                      </span>
                    </div>
                  )}
                  {viewingSession.discrepancyNote && (
                    <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-raised)' }}>
                      <div className="text-sm text-text-secondary mb-1">Nota</div>
                      <div className="text-text-primary">{viewingSession.discrepancyNote}</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Movements */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3">
                Movimientos
              </h4>
              {viewingSessionMovements.length === 0 ? (
                <div className="text-center py-4 text-text-secondary">
                  Sin movimientos
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {viewingSessionMovements.map((mov) => (
                    <div
                      key={mov.id}
                      className="flex items-center gap-3 p-2 rounded-lg"
                      style={{ background: 'var(--color-surface-raised)' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: mov.type === 'ingreso'
                            ? 'var(--color-success-light)'
                            : 'var(--color-error-light)',
                        }}
                      >
                        {mov.type === 'ingreso' ? (
                          <IconArrowDown className="w-3 h-3" style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <IconArrowUp className="w-3 h-3" style={{ color: 'var(--color-error)' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary">
                          {CATEGORY_LABELS[mov.category]}
                        </div>
                        {mov.note && (
                          <div className="text-xs text-text-secondary truncate">
                            {mov.note}
                          </div>
                        )}
                      </div>
                      <div
                        className="text-sm font-medium flex-shrink-0"
                        style={{
                          color: mov.type === 'ingreso'
                            ? 'var(--color-success)'
                            : 'var(--color-error)',
                        }}
                      >
                        {mov.type === 'ingreso' ? '+' : '-'}{formatCurrency(mov.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
