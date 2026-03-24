/**
 * Cash drawer constants and helpers
 */

import type { CashMovementCategory, CashMovementType, CashMovement, CashSession } from '@/types'

// ============================================
// CONSTANTS
// ============================================

export const CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  sale: 'Sale',
  employee_loan: 'Employee Loan',
  bank_withdrawal: 'Bank Withdrawal',
  loan_repayment: 'Loan Repayment',
  bank_deposit: 'Bank Deposit',
  other: 'Other',
}

export const DEPOSIT_CATEGORIES: CashMovementCategory[] = [
  'employee_loan',
  'bank_withdrawal',
  'other'
]

export const WITHDRAWAL_CATEGORIES: CashMovementCategory[] = [
  'loan_repayment',
  'bank_deposit',
  'other'
]

// ============================================
// HELPERS
// ============================================

/**
 * Calculate the expected balance from a session and its movements
 */
export function calculateExpectedBalance(
  session: CashSession | null,
  movements: CashMovement[]
): number {
  if (!session) return 0

  let balance = session.openingBalance

  for (const mov of movements) {
    if (mov.type === 'deposit') {
      balance += mov.amount
    } else {
      balance -= mov.amount
    }
  }

  return balance
}

/**
 * Calculate outstanding employee loans from movements
 */
export function calculateOutstandingLoans(
  movements: CashMovement[]
): Map<string, { name: string; amount: number }> {
  const loans = new Map<string, { name: string; amount: number }>()

  for (const mov of movements) {
    if (mov.category === 'employee_loan' && mov.employeeId) {
      const employeeName = mov.employee?.name || 'Employee'
      const current = loans.get(mov.employeeId) || { name: employeeName, amount: 0 }
      if (mov.employee?.name) {
        current.name = mov.employee.name
      }
      current.amount += mov.amount
      loans.set(mov.employeeId, current)
    } else if (mov.category === 'loan_repayment' && mov.employeeId) {
      const employeeName = mov.employee?.name || 'Employee'
      const current = loans.get(mov.employeeId) || { name: employeeName, amount: 0 }
      if (mov.employee?.name) {
        current.name = mov.employee.name
      }
      current.amount -= mov.amount
      loans.set(mov.employeeId, current)
    }
  }

  // Filter out zero balances
  for (const [key, value] of loans) {
    if (value.amount <= 0) {
      loans.delete(key)
    }
  }

  return loans
}

/**
 * Get categories for a movement type
 */
export function getCategoriesForType(type: CashMovementType): CashMovementCategory[] {
  return type === 'deposit' ? DEPOSIT_CATEGORIES : WITHDRAWAL_CATEGORIES
}

/**
 * Sort movements by created time (newest first)
 */
export function sortMovementsByDate(movements: CashMovement[]): CashMovement[] {
  return [...movements].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      if (!isNaN(timeA) && !isNaN(timeB)) {
        return timeB - timeA
      }
    }
    // Fallback: compare IDs (lexicographically sortable)
    return b.id.localeCompare(a.id)
  })
}

/**
 * Format datetime for display (en-US locale)
 */
export function formatDateTime(dateStr: Date | string): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}

/**
 * Format time for display (en-US locale)
 */
export function formatMovementTime(dateStr: Date | string | undefined | null): string {
  if (!dateStr) return 'Now'
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(date.getTime())) return 'Now'
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/New_York',
  })
}
