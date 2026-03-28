'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Modal, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { useBusiness } from '@/contexts/business-context'
import { formatCurrency } from '@/lib/utils'
import type { CashSession, CashMovement, User } from '@/types'

interface CloseDrawerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentSession: CashSession | null
  movements: CashMovement[]
}

export function CloseDrawerModal({
  isOpen,
  onClose,
  onSuccess,
  currentSession,
  movements,
}: CloseDrawerModalProps) {
  const { user } = useAuth()
  const { businessId } = useBusiness()

  // Form state
  const [closingBalance, setClosingBalance] = useState('')
  const [discrepancyNote, setDiscrepancyNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Celebration state
  const [showLottie, setShowLottie] = useState(false)
  const [celebrationStats, setCelebrationStats] = useState<{ label: string; value: string }[]>([])

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setClosingBalance('')
      setDiscrepancyNote('')
      setShowLottie(false)
      setCelebrationStats([])
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Calculate expected balance
  const expectedBalance = useMemo(() => {
    if (!currentSession) return 0
    const deposits = movements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0)
    const withdrawals = movements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0)
    return currentSession.openingBalance + deposits - withdrawals
  }, [currentSession, movements])

  // Calculate discrepancy
  const closingDiscrepancy = useMemo(() => {
    const actual = parseFloat(closingBalance)
    if (isNaN(actual)) return 0
    return actual - expectedBalance
  }, [closingBalance, expectedBalance])

  const handleClose = useCallback(() => {
    // If we're on celebration step, call success before closing
    // This is handled by checking the celebration stats
    if (celebrationStats.length > 0) {
      onSuccess()
    }
    onClose()
  }, [celebrationStats.length, onClose, onSuccess])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
    >
      <Modal.Step title="Close drawer">
        <CloseDrawerFormContent
          expectedBalance={expectedBalance}
          closingBalance={closingBalance}
          setClosingBalance={setClosingBalance}
          closingDiscrepancy={closingDiscrepancy}
          discrepancyNote={discrepancyNote}
          setDiscrepancyNote={setDiscrepancyNote}
          isSubmitting={isSubmitting}
        />
        <Modal.Footer>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-secondary flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <CloseDrawerSubmitButton
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            currentSession={currentSession}
            movements={movements}
            user={user}
            businessId={businessId}
            expectedBalance={expectedBalance}
            closingBalance={closingBalance}
            closingDiscrepancy={closingDiscrepancy}
            discrepancyNote={discrepancyNote}
            setShowLottie={setShowLottie}
            setCelebrationStats={setCelebrationStats}
          />
        </Modal.Footer>
      </Modal.Step>

      <Modal.Step title="Drawer closed" hideBackButton>
        <CelebrationStepContent
          showLottie={showLottie}
          celebrationStats={celebrationStats}
        />
        <Modal.Footer>
          <button
            className="btn btn-primary flex-1"
            onClick={handleClose}
          >
            Continue
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}

// Form content - returns only Modal.Item elements
interface CloseDrawerFormContentProps {
  expectedBalance: number
  closingBalance: string
  setClosingBalance: (value: string) => void
  closingDiscrepancy: number
  discrepancyNote: string
  setDiscrepancyNote: (value: string) => void
  isSubmitting: boolean
}

function CloseDrawerFormContent({
  expectedBalance,
  closingBalance,
  setClosingBalance,
  closingDiscrepancy,
  discrepancyNote,
  setDiscrepancyNote,
  isSubmitting,
}: CloseDrawerFormContentProps) {
  return (
    <>
      <Modal.Item>
        <div className="p-3 rounded-lg bg-bg-muted">
          <div className="text-sm text-text-secondary">Expected balance</div>
          <div className="text-xl font-display font-bold text-text-primary mt-1">
            {formatCurrency(expectedBalance)}
          </div>
        </div>
      </Modal.Item>

      <Modal.Item>
        <label htmlFor="closing-balance" className="label">Actual balance ($) <span className="text-error">*</span></label>
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
      </Modal.Item>

      {closingBalance && (
        <Modal.Item>
          <div
            className={`p-3 rounded-lg ${
              closingDiscrepancy === 0
                ? 'bg-success-subtle'
                : closingDiscrepancy > 0
                  ? 'bg-warning-subtle'
                  : 'bg-error-subtle'
            }`}
          >
            <div className="text-sm text-text-secondary">Discrepancy</div>
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
        </Modal.Item>
      )}

      {closingBalance && closingDiscrepancy !== 0 && (
        <Modal.Item>
          <label htmlFor="discrepancy-note" className="label">Note (optional)</label>
          <textarea
            id="discrepancy-note"
            value={discrepancyNote}
            onChange={(e) => setDiscrepancyNote(e.target.value)}
            className="input"
            placeholder="Explain the discrepancy..."
            rows={2}
            disabled={isSubmitting}
          />
        </Modal.Item>
      )}
    </>
  )
}

// Submit button - uses useMorphingModal for navigation
interface CloseDrawerSubmitButtonProps {
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  currentSession: CashSession | null
  movements: CashMovement[]
  user: User | null
  businessId: string | null
  expectedBalance: number
  closingBalance: string
  closingDiscrepancy: number
  discrepancyNote: string
  setShowLottie: (value: boolean) => void
  setCelebrationStats: (stats: { label: string; value: string }[]) => void
}

function CloseDrawerSubmitButton({
  isSubmitting,
  setIsSubmitting,
  currentSession,
  movements,
  user,
  businessId,
  expectedBalance,
  closingBalance,
  closingDiscrepancy,
  discrepancyNote,
  setShowLottie,
  setCelebrationStats,
}: CloseDrawerSubmitButtonProps) {
  const { goNext, lock, unlock } = useMorphingModal()

  const handleSubmit = async () => {
    if (!user || !currentSession || !businessId) return

    const actualBalance = parseFloat(closingBalance)
    if (isNaN(actualBalance) || actualBalance < 0) return

    setIsSubmitting(true)
    lock()

    try {
      const totalDeposits = movements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0)
      const totalWithdrawals = movements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0)

      const response = await fetch(`/api/businesses/${businessId}/cash/sessions/${currentSession.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closingBalance: actualBalance,
          expectedBalance: expectedBalance,
          discrepancy: closingDiscrepancy,
          discrepancyNote: discrepancyNote.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error closing drawer')
      }

      setCelebrationStats([
        { label: 'Movements', value: String(movements.length) },
        { label: 'Deposits', value: formatCurrency(totalDeposits) },
        { label: 'Withdrawals', value: formatCurrency(totalWithdrawals) },
      ])

      setShowLottie(true)
      unlock()
      goNext()
    } catch (err) {
      console.error('Error closing drawer:', err)
      alert('Error closing the drawer')
      setIsSubmitting(false)
      unlock()
    }
  }

  return (
    <button
      type="button"
      onClick={handleSubmit}
      className="btn btn-primary flex-1"
      disabled={isSubmitting || !closingBalance || parseFloat(closingBalance) < 0}
    >
      {isSubmitting ? <Spinner /> : 'Close'}
    </button>
  )
}

// Celebration step content - returns only Modal.Item elements
interface CelebrationStepContentProps {
  showLottie: boolean
  celebrationStats: { label: string; value: string }[]
}

function CelebrationStepContent({
  showLottie,
  celebrationStats,
}: CelebrationStepContentProps) {
  return (
    <>
      <Modal.Item>
        <div className="flex flex-col items-center text-center">
          <div className="mb-6" style={{ width: 200, height: 200 }}>
            {showLottie && (
              <LottiePlayer
                src="/animations/trophy.json"
                loop={false}
                autoplay={true}
                delay={500}
                style={{ width: 200, height: 200 }}
              />
            )}
          </div>
        </div>
      </Modal.Item>

      <Modal.Item>
        <div className="w-full p-4 bg-bg-muted rounded-lg">
          <p className="text-text-secondary text-center mb-4">
            Good work today!
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
      </Modal.Item>
    </>
  )
}
