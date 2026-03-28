'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { fetchDeduped } from '@/lib/fetch'
import type { CashMovement, CashMovementType, CashMovementCategory, CashSession } from '@/types'

export interface UseCashMovementsOptions {
  businessId: string | null
}

export interface UseCashMovementsReturn {
  // State
  movements: CashMovement[]
  isLoading: boolean
  newMovementId: string | null
  lastMovementType: 'deposit' | 'withdrawal' | null

  // Actions
  loadMovements: (sessionId: string) => Promise<void>
  setMovements: (movements: CashMovement[]) => void
  recordMovement: (
    session: CashSession,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ) => Promise<CashMovement>
  updateMovement: (
    movement: CashMovement,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ) => Promise<CashMovement>
  deleteMovement: (movementId: string) => Promise<void>
  clearNewMovementId: () => void
}

export function useCashMovements({ businessId }: UseCashMovementsOptions): UseCashMovementsReturn {
  const { user } = useAuth()

  const [movements, setMovements] = useState<CashMovement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newMovementId, setNewMovementId] = useState<string | null>(null)
  const [lastMovementType, setLastMovementType] = useState<'deposit' | 'withdrawal' | null>(null)

  // Load movements for a session
  const loadMovements = useCallback(async (sessionId: string): Promise<void> => {
    if (!businessId) return
    setIsLoading(true)
    try {
      const response = await fetchDeduped(`/api/businesses/${businessId}/cash/movements?sessionId=${sessionId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setMovements(data.movements)
      }
    } catch (err) {
      console.error('Error loading movements:', err)
    } finally {
      setIsLoading(false)
    }
  }, [businessId])

  // Record a new movement
  const recordMovement = useCallback(async (
    session: CashSession,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ): Promise<CashMovement> => {
    if (!user) throw new Error('User not authenticated')
    if (!businessId) throw new Error('No business context')

    const response = await fetch(`/api/businesses/${businessId}/cash/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        type,
        category,
        amount,
        note: note.trim() || null,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error recording movement')
    }

    const newMovement: CashMovement = data.movement

    // Update local state
    setMovements(prev => [...prev, newMovement])

    // Trigger balance animation
    setLastMovementType(type)
    setTimeout(() => setLastMovementType(null), 500)

    // Track new movement for inline animation
    setNewMovementId(newMovement.id)

    return newMovement
  }, [user, businessId])

  // Update an existing movement
  const updateMovement = useCallback(async (
    movement: CashMovement,
    type: CashMovementType,
    category: CashMovementCategory,
    amount: number,
    note: string
  ): Promise<CashMovement> => {
    if (!user) throw new Error('User not authenticated')
    if (!businessId) throw new Error('No business context')

    const response = await fetch(`/api/businesses/${businessId}/cash/movements/${movement.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        category,
        amount,
        note: note.trim() || null,
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error updating movement')
    }

    const updatedMovement: CashMovement = data.movement

    setMovements(prev => prev.map(m => m.id === movement.id ? updatedMovement : m))

    return updatedMovement
  }, [user, businessId])

  // Delete a movement
  const deleteMovement = useCallback(async (movementId: string): Promise<void> => {
    if (!businessId) throw new Error('No business context')
    const response = await fetch(`/api/businesses/${businessId}/cash/movements/${movementId}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error deleting movement')
    }

    setMovements(prev => prev.filter(m => m.id !== movementId))
  }, [businessId])

  // Clear new movement ID (used after animation completes)
  const clearNewMovementId = useCallback(() => {
    setNewMovementId(null)
  }, [])

  return {
    movements,
    isLoading,
    newMovementId,
    lastMovementType,
    loadMovements,
    setMovements,
    recordMovement,
    updateMovement,
    deleteMovement,
    clearNewMovementId,
  }
}
