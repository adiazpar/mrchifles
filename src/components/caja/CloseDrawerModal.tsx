'use client'

import { useState, useEffect, useMemo } from 'react'
import { IconClose } from '@/components/icons'
import { LottiePlayer } from '@/components/animations/LottiePlayer'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency } from '@/lib/utils'
import type { CashSession, CashMovement } from '@/types'

interface CloseDrawerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentSession: CashSession | null
  movements: CashMovement[]
}

type Phase = 'form' | 'exiting' | 'height-transition' | 'entering' | 'celebration'

// Timing constants
const STAGGER_DELAY = 40 // ms between each item
const EXIT_BASE_DURATION = 120
const ENTER_BASE_DURATION = 120
const HEIGHT_TRANSITION_DURATION = 300 // matches --duration-normal
const FORM_ITEM_COUNT = 4 // Expected balance, input, discrepancy, note
const CELEBRATION_ITEM_COUNT = 2 // Lottie container, stats box

export function CloseDrawerModal({
  isOpen,
  onClose,
  onSuccess,
  currentSession,
  movements,
}: CloseDrawerModalProps) {
  const { user, pb } = useAuth()

  // Modal render state
  const [render, setRender] = useState(false)
  const [modalClosing, setModalClosing] = useState(false)

  // Phase state machine
  const [phase, setPhase] = useState<Phase>('form')

  // Form state
  const [closingBalance, setClosingBalance] = useState('')
  const [discrepancyNote, setDiscrepancyNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Celebration state
  const [showLottie, setShowLottie] = useState(false)
  const [celebrationStats, setCelebrationStats] = useState<{ label: string; value: string }[]>([])

  // Calculate expected balance
  const expectedBalance = useMemo(() => {
    if (!currentSession) return 0
    const ingresos = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0)
    const retiros = movements.filter(m => m.type === 'retiro').reduce((sum, m) => sum + m.amount, 0)
    return currentSession.openingBalance + ingresos - retiros
  }, [currentSession, movements])

  // Calculate discrepancy
  const closingDiscrepancy = useMemo(() => {
    const actual = parseFloat(closingBalance)
    if (isNaN(actual)) return 0
    return actual - expectedBalance
  }, [closingBalance, expectedBalance])

  // Handle modal open/close
  useEffect(() => {
    if (isOpen) {
      setRender(true)
      setModalClosing(false)
      setPhase('form')
      setClosingBalance('')
      setDiscrepancyNote('')
      setShowLottie(false)
      setCelebrationStats([])
      setIsSubmitting(false)
    } else if (render) {
      setModalClosing(true)
      const timer = setTimeout(() => {
        setRender(false)
        setModalClosing(false)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [isOpen, render])

  // Escape key handler
  useEffect(() => {
    if (!render) return
    const isTransitioning = phase === 'exiting' || phase === 'height-transition' || phase === 'entering'
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isTransitioning) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [render, isSubmitting, phase])

  const handleClose = () => {
    const isTransitioning = phase === 'exiting' || phase === 'height-transition' || phase === 'entering'
    if (isTransitioning) return // Don't allow close during transition

    if (phase === 'celebration') {
      onSuccess()
    }
    onClose()
  }

  const handleSubmit = async () => {
    if (!user || !currentSession) return

    const actualBalance = parseFloat(closingBalance)
    if (isNaN(actualBalance) || actualBalance < 0) return

    setIsSubmitting(true)

    try {
      const now = new Date().toISOString()

      // Calculate stats for celebration
      const totalIngresos = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0)
      const totalRetiros = movements.filter(m => m.type === 'retiro').reduce((sum, m) => sum + m.amount, 0)

      // Update session with closing info
      await pb.collection('cash_sessions').update(currentSession.id, {
        closedAt: now,
        closedBy: user.id,
        closingBalance: actualBalance,
        expectedBalance: expectedBalance,
        discrepancy: closingDiscrepancy,
        discrepancyNote: discrepancyNote.trim() || null,
      })

      // Set up celebration stats
      setCelebrationStats([
        { label: 'Movimientos', value: String(movements.length) },
        { label: 'Ingresos', value: formatCurrency(totalIngresos) },
        { label: 'Retiros', value: formatCurrency(totalRetiros) },
      ])

      // Start phase transitions: exiting -> height-transition -> entering -> celebration
      setPhase('exiting')

      // Calculate exit duration: base + (items - 1) * stagger
      const exitDuration = EXIT_BASE_DURATION + (FORM_ITEM_COUNT - 1) * STAGGER_DELAY

      setTimeout(() => {
        // After fade out completes, start height transition
        setPhase('height-transition')

        setTimeout(() => {
          // After height transition completes, start fade in
          setPhase('entering')
          // Start loading Lottie immediately so it's ready when fade-in completes
          setShowLottie(true)

          // Calculate enter duration for phase transition
          const enterDuration = ENTER_BASE_DURATION + (CELEBRATION_ITEM_COUNT - 1) * STAGGER_DELAY

          setTimeout(() => {
            setPhase('celebration')
          }, enterDuration)
        }, HEIGHT_TRANSITION_DURATION)
      }, exitDuration)

    } catch (err) {
      console.error('Error closing drawer:', err)
      alert('Error al cerrar la caja')
      setIsSubmitting(false)
      setPhase('form')
    }
  }

  if (!render) return null

  // Height animation: form panel visible until height-transition starts
  const formPanelExpanded = phase === 'form' || phase === 'exiting'
  const celebrationPanelExpanded = phase === 'height-transition' || phase === 'entering' || phase === 'celebration'

  // Content visibility: form content visible during form/exiting, celebration during entering/celebration
  const showFormContent = phase === 'form' || phase === 'exiting'
  const showCelebrationContent = phase === 'entering' || phase === 'celebration'

  const title = showFormContent ? 'Cerrar caja' : 'Caja cerrada'

  return (
    <div
      className={`modal-backdrop ${modalClosing ? 'modal-backdrop-exit' : 'modal-backdrop-animated'}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`modal ${modalClosing ? 'modal-exit' : 'modal-animated'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="modal-close"
            aria-label="Cerrar"
            disabled={phase === 'exiting' || phase === 'height-transition' || phase === 'entering'}
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Form Panel - collapses when not active */}
          <div className={`morph-panel ${formPanelExpanded ? 'morph-panel-visible' : 'morph-panel-hidden'}`}>
            <div className="morph-panel-inner">
              <div className={`morph-content ${phase === 'exiting' ? 'morph-content-exit' : ''} ${phase === 'height-transition' ? 'opacity-0' : ''}`}>
                <div className="morph-item p-3 rounded-lg bg-bg-muted">
                  <div className="text-sm text-text-secondary">Saldo esperado</div>
                  <div className="text-xl font-display font-bold text-text-primary mt-1">
                    {formatCurrency(expectedBalance)}
                  </div>
                </div>

                <div className="morph-item">
                  <label htmlFor="closing-balance" className="label">Saldo real (S/)</label>
                  <input
                    id="closing-balance"
                    type="number"
                    inputMode="decimal"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    className="input"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>

                {closingBalance && (
                  <div
                    className={`morph-item p-3 rounded-lg ${
                      closingDiscrepancy === 0
                        ? 'bg-success-subtle'
                        : closingDiscrepancy > 0
                          ? 'bg-warning-subtle'
                          : 'bg-error-subtle'
                    }`}
                  >
                    <div className="text-sm text-text-secondary">Diferencia</div>
                    <div
                      className={`text-xl font-display font-bold mt-1 ${
                        closingDiscrepancy === 0
                          ? 'text-success'
                          : closingDiscrepancy > 0
                            ? 'text-warning'
                            : 'text-error'
                      }`}
                    >
                      {closingDiscrepancy > 0 ? '+' : ''}{formatCurrency(closingDiscrepancy)}
                    </div>
                  </div>
                )}

                {closingBalance && closingDiscrepancy !== 0 && (
                  <div className="morph-item">
                    <label htmlFor="discrepancy-note" className="label">Nota (opcional)</label>
                    <textarea
                      id="discrepancy-note"
                      value={discrepancyNote}
                      onChange={(e) => setDiscrepancyNote(e.target.value)}
                      className="input"
                      placeholder="Explica la diferencia..."
                      rows={2}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Celebration Panel - collapses when not active */}
          <div className={`morph-panel ${celebrationPanelExpanded ? 'morph-panel-visible' : 'morph-panel-hidden'}`}>
            <div className="morph-panel-inner">
              <div className={`morph-content ${phase === 'entering' ? 'morph-content-enter' : ''}`}>
                <div className="morph-item flex flex-col items-center text-center">
                  {/* Lottie container */}
                  <div className="mb-6" style={{ width: 200, height: 200 }}>
                    {showLottie && (
                      <LottiePlayer
                        src="/animations/trophy.lottie"
                        loop={false}
                        autoplay={true}
                        style={{ width: 200, height: 200 }}
                      />
                    )}
                  </div>
                </div>

                <div className="morph-item w-full p-4 bg-bg-muted rounded-lg">
                  <p className="text-text-secondary text-center mb-4">
                    Buen trabajo hoy!
                  </p>
                  {celebrationStats.length > 0 && (
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `repeat(${Math.min(celebrationStats.length, 3)}, 1fr)` }}
                    >
                      {celebrationStats.map((stat, idx) => (
                        <div key={idx} className="text-center">
                          <div className="text-xl font-bold font-display text-text-primary">
                            {stat.value}
                          </div>
                          <div className="text-sm text-text-secondary mt-1">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {/* Form Buttons */}
          {(showFormContent || phase === 'height-transition') && (
            <div className={`morph-footer ${phase === 'exiting' ? 'morph-content-exit' : ''} ${phase === 'height-transition' ? 'opacity-0' : ''}`}>
              <button
                type="button"
                onClick={handleClose}
                className="morph-item btn btn-secondary flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="morph-item btn btn-primary flex-1"
                disabled={isSubmitting || !closingBalance || parseFloat(closingBalance) < 0}
              >
                {isSubmitting ? <Spinner /> : 'Cerrar'}
              </button>
            </div>
          )}

          {/* Celebration Button */}
          {showCelebrationContent && (
            <div className={`morph-footer ${phase === 'entering' ? 'morph-content-enter' : ''}`}>
              <button
                className="morph-item btn btn-primary flex-1"
                onClick={handleClose}
              >
                Continuar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
