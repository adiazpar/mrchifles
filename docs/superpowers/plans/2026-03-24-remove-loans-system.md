# Remove Loans System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the employee loans tracking feature from the cash drawer system.

**Architecture:** Delete loan-related categories (`employee_loan`, `loan_repayment`) from the schema and all code that references them. Remove the `employeeId` column from cash movements since it's only used for loans. Delete the LoansModal component and remove the Loans button from the UI.

**Tech Stack:** Next.js 15, Drizzle ORM, Turso (SQLite), TypeScript, React

---

## Task 1: Delete Loan Movements from Database

**Files:**
- None (database operation only)

- [ ] **Step 1: Delete loan movements via Drizzle Studio or SQL**

Open Drizzle Studio and run this SQL to delete all loan-related movements:

```sql
DELETE FROM cash_movements WHERE category IN ('employee_loan', 'loan_repayment');
```

Or via npm script:
```bash
npm run db:studio
```
Then execute the delete query in the SQL tab.

- [ ] **Step 2: Verify deletion**

Run this query to confirm no loan movements remain:
```sql
SELECT COUNT(*) FROM cash_movements WHERE category IN ('employee_loan', 'loan_repayment');
```
Expected: 0

---

## Task 2: Update Database Schema

**Files:**
- Modify: `src/db/schema.ts:151-166`

- [ ] **Step 1: Update cashMovements table**

In `src/db/schema.ts`, update the `cashMovements` table definition:

```typescript
export const cashMovements = sqliteTable('cash_movements', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => cashSessions.id, { onDelete: 'cascade' }).notNull(),
  type: text('type', { enum: ['deposit', 'withdrawal'] }).notNull(),
  category: text('category', {
    enum: ['sale', 'bank_withdrawal', 'bank_deposit', 'other']
  }).notNull(),
  amount: real('amount').notNull(),
  note: text('note'),
  saleId: text('sale_id').references(() => sales.id, { onDelete: 'set null' }),
  createdBy: text('created_by').references(() => users.id).notNull(),
  editedBy: text('edited_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
```

Changes:
- Remove `employee_loan` and `loan_repayment` from category enum
- Remove `employeeId` column entirely

- [ ] **Step 2: Update cashMovementsRelations**

In `src/db/schema.ts`, update the relations (around line 325):

```typescript
export const cashMovementsRelations = relations(cashMovements, ({ one }) => ({
  session: one(cashSessions, {
    fields: [cashMovements.sessionId],
    references: [cashSessions.id],
  }),
  sale: one(sales, {
    fields: [cashMovements.saleId],
    references: [sales.id],
  }),
  creator: one(users, {
    fields: [cashMovements.createdBy],
    references: [users.id],
  }),
  editor: one(users, {
    fields: [cashMovements.editedBy],
    references: [users.id],
  }),
}))
```

Remove the `employee` relation that used `employeeId`.

- [ ] **Step 3: Push schema changes to database**

```bash
npm run db:push
```

Expected: Schema updated successfully

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "refactor(db): remove loans from cash movements schema

- Remove employee_loan and loan_repayment categories
- Remove employeeId column from cash_movements

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts:191-234`

- [ ] **Step 1: Update CashMovementCategory type**

```typescript
export type CashMovementCategory =
  | 'sale'            // Cash sale (deposit)
  | 'bank_withdrawal' // Bank withdrawal (deposit)
  | 'bank_deposit'    // Bank deposit (withdrawal)
  | 'other'           // Other
```

- [ ] **Step 2: Update CashMovement interface**

```typescript
export interface CashMovement {
  id: string
  sessionId: string
  type: CashMovementType
  category: CashMovementCategory
  amount: number
  note?: string | null
  saleId?: string | null
  createdBy: string
  editedBy?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  creator?: { name: string } | null
}
```

Remove `employeeId` and `employee` fields.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor(types): remove loans from CashMovement types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update Cash Utilities

**Files:**
- Modify: `src/lib/cash.ts`

- [ ] **Step 1: Update CATEGORY_LABELS**

```typescript
export const CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  sale: 'Sale',
  bank_withdrawal: 'Bank Withdrawal',
  bank_deposit: 'Bank Deposit',
  other: 'Other',
}
```

- [ ] **Step 2: Update DEPOSIT_CATEGORIES**

```typescript
export const DEPOSIT_CATEGORIES: CashMovementCategory[] = [
  'bank_withdrawal',
  'other'
]
```

- [ ] **Step 3: Update WITHDRAWAL_CATEGORIES**

```typescript
export const WITHDRAWAL_CATEGORIES: CashMovementCategory[] = [
  'bank_deposit',
  'other'
]
```

- [ ] **Step 4: Delete calculateOutstandingLoans function**

Remove the entire `calculateOutstandingLoans` function (lines 61-94).

- [ ] **Step 5: Update imports**

Remove `CashMovement` from imports if no longer needed after removing `calculateOutstandingLoans`:

```typescript
import type { CashMovementCategory, CashMovementType, CashSession } from '@/types'
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/cash.ts
git commit -m "refactor(cash): remove loans utilities

- Remove loan categories from labels and arrays
- Delete calculateOutstandingLoans function

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Delete LoansModal Component

**Files:**
- Delete: `src/components/cash/LoansModal.tsx`
- Modify: `src/components/cash/index.ts`

- [ ] **Step 1: Delete LoansModal.tsx**

```bash
rm src/components/cash/LoansModal.tsx
```

- [ ] **Step 2: Update barrel export**

Update `src/components/cash/index.ts`:

```typescript
// Caja components barrel export

export { BalanceHero } from './BalanceHero'
export { CloseDrawerModal } from './CloseDrawerModal'
export { OpenDrawerModal } from './OpenDrawerModal'
export { MovementsList } from './MovementsList'
export { AddMovementModal } from './AddMovementModal'
export { EditMovementModal } from './EditMovementModal'
```

- [ ] **Step 3: Commit**

```bash
git add src/components/cash/LoansModal.tsx src/components/cash/index.ts
git commit -m "refactor(cash): delete LoansModal component

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update MovementsList Component

**Files:**
- Modify: `src/components/cash/MovementsList.tsx:95-99`

- [ ] **Step 1: Simplify note display**

Replace the loan-specific conditional (lines 95-99):

```typescript
{(mov.category === 'employee_loan' || mov.category === 'loan_repayment') && mov.employee
  ? mov.employee.name
  : mov.note || '-'}
```

With:

```typescript
{mov.note || '-'}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cash/MovementsList.tsx
git commit -m "refactor(cash): remove loan display logic from MovementsList

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update useCashSession Hook

**Files:**
- Modify: `src/hooks/useCashSession.ts`

- [ ] **Step 1: Remove calculateOutstandingLoans import**

Update line 6:

```typescript
import { calculateExpectedBalance } from '@/lib/cash'
```

- [ ] **Step 2: Remove outstandingLoans from interface**

Update `UseCashSessionReturn` interface (around line 9):

```typescript
export interface UseCashSessionReturn {
  // State
  currentSession: CashSession | null
  sessions: CashSession[]
  isLoading: boolean
  error: string

  // Derived values
  expectedBalance: number
  lastClosedSession: CashSession | null

  // Actions
  loadCurrentSession: () => Promise<string | null>
  loadSessions: () => Promise<void>
  openDrawer: (
    openingBalance: number,
    setMovements: (movements: CashMovement[]) => void,
    setShowOpenAnimation: (show: boolean) => void,
    closeModal: () => void
  ) => Promise<void>
  handleCloseDrawerSuccess: () => Promise<void>
  setIsLoading: (loading: boolean) => void
  setError: (error: string) => void
  setCurrentSession: (session: CashSession | null) => void
}
```

- [ ] **Step 3: Remove outstandingLoans useMemo**

Delete lines 53-55:

```typescript
const outstandingLoans = useMemo(() => {
  return calculateOutstandingLoans(movements)
}, [movements])
```

- [ ] **Step 4: Remove from return object**

Update the return statement to remove `outstandingLoans`:

```typescript
return {
  currentSession,
  sessions,
  isLoading,
  error,
  expectedBalance,
  lastClosedSession,
  loadCurrentSession,
  loadSessions,
  openDrawer,
  handleCloseDrawerSuccess,
  setIsLoading,
  setError,
  setCurrentSession,
}
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCashSession.ts
git commit -m "refactor(hooks): remove outstandingLoans from useCashSession

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update useCashMovements Hook

**Files:**
- Modify: `src/hooks/useCashMovements.ts`

- [ ] **Step 1: Remove employeeId from recordMovement**

Update the fetch body in `recordMovement` (around line 75):

```typescript
body: JSON.stringify({
  sessionId: session.id,
  type,
  category,
  amount,
  note: note.trim() || null,
}),
```

- [ ] **Step 2: Remove employeeId from updateMovement**

Update the fetch body in `updateMovement` (around line 119):

```typescript
body: JSON.stringify({
  type,
  category,
  amount,
  note: note.trim() || null,
}),
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCashMovements.ts
git commit -m "refactor(hooks): remove employeeId from useCashMovements

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Update Cash Page

**Files:**
- Modify: `src/app/(dashboard)/cash/page.tsx`

- [ ] **Step 1: Remove LoansModal import**

Update line 15, remove `LoansModal` from imports:

```typescript
import {
  BalanceHero,
  CloseDrawerModal,
  OpenDrawerModal,
  MovementsList,
  AddMovementModal,
  EditMovementModal,
} from '@/components/cash'
```

- [ ] **Step 2: Remove Coins icon import**

Update line 7:

```typescript
import { Plus, PackageOpen, Receipt, History } from 'lucide-react'
```

- [ ] **Step 3: Remove isLoansModalOpen state**

Delete line 43:

```typescript
const [isLoansModalOpen, setIsLoansModalOpen] = useState(false)
```

- [ ] **Step 4: Remove Loans button**

Remove lines 210-218 (the Loans button):

```typescript
<button
  type="button"
  onClick={() => setIsLoansModalOpen(true)}
  className="caja-action-btn"
  disabled={!sessionHook.currentSession}
>
  <Coins className="caja-action-btn__icon text-warning" />
  Loans ({sessionHook.outstandingLoans.size})
</button>
```

- [ ] **Step 5: Remove LoansModal component**

Delete lines 276-280:

```typescript
<LoansModal
  isOpen={isLoansModalOpen}
  onClose={() => setIsLoansModalOpen(false)}
  outstandingLoans={sessionHook.outstandingLoans}
/>
```

- [ ] **Step 6: Update grid layout comment**

Update line 200 comment to reflect 3 buttons:

```typescript
{/* Row 1: Open/Close, History */}
```

And update the actions structure. The buttons should now be:
- Row 1: Open/Close, History
- Row 2: Movements (single button, could span or be alone)

Consider updating to a 3-column layout or keeping 2x2 with an empty slot. For simplicity, keep 2x2 grid with 3 buttons.

- [ ] **Step 7: Commit**

```bash
git add src/app/\\(dashboard\\)/cash/page.tsx
git commit -m "refactor(cash): remove Loans button and modal from cash page

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Update History Page

**Files:**
- Modify: `src/app/(dashboard)/cash/history/page.tsx`

- [ ] **Step 1: Update CATEGORY_LABELS constant**

Update lines 16-23:

```typescript
const CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  sale: 'Sale',
  bank_withdrawal: 'Bank withdrawal',
  bank_deposit: 'Bank deposit',
  other: 'Other',
}
```

- [ ] **Step 2: Simplify movement note display**

Update lines 377-381, replace:

```typescript
{(mov.category === 'employee_loan' || mov.category === 'loan_repayment') && mov.employee
  ? mov.employee.name
  : mov.note || '-'}
```

With:

```typescript
{mov.note || '-'}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\\(dashboard\\)/cash/history/page.tsx
git commit -m "refactor(cash): remove loan categories from history page

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Update API Routes

**Files:**
- Modify: `src/app/api/cash/movements/route.ts`
- Modify: `src/app/api/cash/movements/[id]/route.ts`

- [ ] **Step 1: Update POST route schema**

In `src/app/api/cash/movements/route.ts`, update `createMovementSchema` (lines 13-20):

```typescript
const createMovementSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['deposit', 'withdrawal']),
  category: z.enum(['sale', 'bank_withdrawal', 'bank_deposit', 'other']),
  amount: z.number().positive('Amount must be greater than 0'),
  note: z.string().nullable().optional(),
})
```

- [ ] **Step 2: Remove employeeId from POST insert**

Update the insert in POST (around line 155):

```typescript
await db.insert(cashMovements).values({
  id: movementId,
  sessionId,
  type,
  category,
  amount,
  note: note || null,
  createdBy: session.userId,
  createdAt: now,
  updatedAt: now,
})
```

- [ ] **Step 3: Remove employee join from GET**

Update the select in GET (lines 63-84). Remove the employees alias import and join:

Remove line 11:
```typescript
const employees = alias(users, 'employees')
```

Update the select to remove `employeeName` and `employeeId`:

```typescript
const movementsList = await db
  .select({
    id: cashMovements.id,
    sessionId: cashMovements.sessionId,
    type: cashMovements.type,
    category: cashMovements.category,
    amount: cashMovements.amount,
    note: cashMovements.note,
    saleId: cashMovements.saleId,
    createdBy: cashMovements.createdBy,
    editedBy: cashMovements.editedBy,
    createdAt: cashMovements.createdAt,
    updatedAt: cashMovements.updatedAt,
    creatorName: creators.name,
  })
  .from(cashMovements)
  .leftJoin(creators, eq(cashMovements.createdBy, creators.id))
  .where(eq(cashMovements.sessionId, sessionId))
```

Update the return mapping to remove `employee`:

```typescript
return NextResponse.json({
  success: true,
  movements: movementsList.map(m => ({
    ...m,
    creator: m.creatorName ? { name: m.creatorName } : null,
  })),
})
```

- [ ] **Step 4: Remove employee from POST response**

Update the POST response select and mapping similarly.

- [ ] **Step 5: Update PATCH route schema**

In `src/app/api/cash/movements/[id]/route.ts`, update `updateMovementSchema` (lines 7-13):

```typescript
const updateMovementSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']).optional(),
  category: z.enum(['sale', 'bank_withdrawal', 'bank_deposit', 'other']).optional(),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  note: z.string().nullable().optional(),
})
```

- [ ] **Step 6: Remove employeeId from PATCH handler**

Remove lines 83-85 from the PATCH handler:

```typescript
if (validation.data.employeeId !== undefined) {
  updateData.employeeId = validation.data.employeeId
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/cash/movements/route.ts src/app/api/cash/movements/\\[id\\]/route.ts
git commit -m "refactor(api): remove loans from cash movements API

- Remove employee_loan and loan_repayment from validation
- Remove employeeId handling
- Remove employee joins from queries

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Build and Verify

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript check**

```bash
npm run build
```

Expected: Build succeeds with no type errors

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors

- [ ] **Step 3: Start dev server and test**

```bash
npm run dev
```

Verify:
1. Cash page loads with 3 buttons (Open/Close, History, Movements)
2. No "Loans" button visible
3. Add Movement modal shows 4 categories (no loan options)
4. History page loads and displays movements correctly
5. Existing movements display with notes (not employee names)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: complete removal of loans system from cash drawer

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Delete loan movements from database |
| 2 | Update database schema |
| 3 | Update TypeScript types |
| 4 | Update cash utilities |
| 5 | Delete LoansModal component |
| 6 | Update MovementsList component |
| 7 | Update useCashSession hook |
| 8 | Update useCashMovements hook |
| 9 | Update cash page |
| 10 | Update history page |
| 11 | Update API routes |
| 12 | Build and verify |
