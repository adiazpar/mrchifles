# Home Page Improvements Plan

**Created**: 2026-02-11
**Updated**: 2026-02-11
**Status**: In Progress
**Priority**: High

## Overview

Improvements to the Home page (Inicio) based on business owner feedback. The current dashboard is functional but lacks some practical features needed for day-to-day operations at a fair stand.

---

## Prioritized Features

### Priority 1: Critical for Daily Operations

#### 1.1 Prominent "Nueva Venta" Button [COMPLETED]
**Why**: This is the most frequent action. Current quick action grid treats it equally with other actions.
**Implementation**:
- Added a large, full-width "Nueva Venta" button above the quick actions grid
- Uses brand primary color with icon
- Links to /ventas page

**Files modified**:
- `src/app/(dashboard)/inicio/page.tsx`

#### 1.2 Quick Cash Drawer Open/Close Action [COMPLETED]
**Why**: Business owner needs to open cash drawer quickly in morning rush without navigating away.
**Implementation**:
- Added inline toggle button in cash drawer status card
- Shows "Abrir Caja" with checkmark icon when closed
- Shows "Cerrar Caja" with X icon when open
- Mobile responsive: button wraps to full width on small screens

**Files modified**:
- `src/app/(dashboard)/inicio/page.tsx`
- `src/components/icons/index.tsx` (added IconCircleCheck, IconCircleX)
- `src/app/globals.css` (mobile layout fixes)

#### 1.3 Today's Date Display [COMPLETED]
**Why**: Important for reconciliation, especially with offline mode where data might sync later.
**Implementation**:
- Date and time displayed in header subtitle (format: "DD/MM/YYYY - HH:MM a.m./p.m.")
- Greeting includes user's first name: "Buenos dias, Arturo!"
- Time-of-day greeting logic fixed (6am-12pm morning, 12pm-6pm afternoon, rest is night)

**Files modified**:
- `src/app/(dashboard)/inicio/page.tsx`

---

### Priority 2: High Value for User Experience

#### 2.1 Recent Sales List (Last 5 Transactions)
**Why**: Quick reference for voids, refunds, or customer disputes without navigating away.
**Implementation**:
- Add a "Ventas Recientes" section showing last 5 sales
- Display: time, total, payment method, product count
- Link each to full sale detail (when Ventas page is built)
- Include a "Ver todas" link to Ventas page

**Files to modify**:
- `src/app/(dashboard)/inicio/page.tsx`
- Create `src/components/sales/RecentSalesList.tsx`
- Add data fetching hook `src/hooks/useSales.ts`

#### 2.2 Pending Orders from Supplier (DaSol)
**Why**: Helps planning - know when stock is arriving.
**Implementation**:
- If orders exist with status "pending", show alert card
- Display: order date, expected items count, estimated arrival (if tracked)
- Link to Inventario page

**Files to modify**:
- `src/app/(dashboard)/inicio/page.tsx`
- Create `src/components/inventory/PendingOrderAlert.tsx`

#### 2.3 Logged-in User Display [PARTIAL]
**Why**: Multi-user environment - need to know who is using the system.
**Implementation**:
- Show user name/role more prominently on mobile (not just initials)
- Desktop sidebar likely already shows this, verify and enhance if needed

**Current status**: User's first name is now shown in the greeting ("Buenos dias, Arturo!"). Mobile header shows initials. Full implementation requires auth system integration.

**Files to modify**:
- `src/app/(dashboard)/inicio/page.tsx`
- `src/components/layout/Sidebar.tsx` (verify)

---

### Priority 3: Nice to Have

#### 3.1 Quick Expense Entry
**Why**: Record booth fees, supplies, etc. without navigating away.
**Implementation**:
- Add "Registrar Gasto" to quick actions grid
- Opens a modal/sheet for quick expense entry
- Fields: amount, category (dropdown), notes (optional)

**Files to modify**:
- `src/app/(dashboard)/inicio/page.tsx`
- Create `src/components/expenses/QuickExpenseModal.tsx`
- Requires Gastos feature to be built (Phase 2)

**Recommendation**: Defer until Gastos/Expenses feature is implemented.

#### 3.2 Week-over-Week Comparison
**Why**: Fair patterns - compare to same day last week, not just yesterday.
**Implementation**:
- Add toggle or secondary comparison: "vs mismo dia semana pasada"
- Requires storing/fetching historical data

**Files to modify**:
- `src/app/(dashboard)/inicio/page.tsx`
- Data fetching logic

#### 3.3 Pull-to-Refresh / Last Updated Indicator
**Why**: Confidence that data is current, especially with spotty connectivity.
**Implementation**:
- Add "Actualizado hace X minutos" timestamp
- Implement pull-to-refresh gesture on mobile
- Consider auto-refresh interval

**Files to modify**:
- `src/app/(dashboard)/inicio/page.tsx`
- May need service worker updates for offline awareness

---

## Implementation Order

1. **Phase A** (Priority 1 items): [COMPLETED 2026-02-11]
   - 1.3 Today's Date Display - DONE
   - 1.1 Prominent "Nueva Venta" Button - DONE
   - 1.2 Quick Cash Drawer Actions - DONE
   - Additional: Mobile layout fixes for quick actions and cash drawer card
   - Additional: Added IconCircleCheck and IconCircleX icons

2. **Phase B** (Priority 2 items): [PENDING]
   - 2.3 Logged-in User Display
   - 2.1 Recent Sales List
   - 2.2 Pending Orders Alert

3. **Phase C** (Priority 3 items - future): [PENDING]
   - 3.3 Last Updated Indicator
   - 3.2 Week-over-Week Comparison
   - 3.1 Quick Expense Entry (after Gastos feature)

---

## Technical Considerations

- All new text must be in Spanish (es-PE locale)
- Dates formatted as DD/MM/YYYY
- Currency as S/ with 2 decimals
- Mobile-first design - test on small screens
- Components should work with mock data initially, then real PocketBase data
- No emojis in any UI text or code

---

## Dependencies

- Ventas page must be built for Recent Sales to link anywhere meaningful
- Gastos feature (Phase 2) required before Quick Expense Entry
- Auth system needed for proper user display

---

## Resolved Questions

1. **Cash drawer open/close PIN?** - No, PIN is handled at user login.
2. **How many recent sales?** - Show 5 recent sales.
3. **Expected arrival date for orders?** - **Not currently in schema.** See below.

---

## Schema Enhancement Needed

### Add `expectedArrivalDate` to Orders

The current `orders` table has:
- `date` - when order was placed
- `receivedDate` - when it actually arrived (filled when status = 'received')
- `status` - 'pending' or 'received'

**Missing:** `expectedArrivalDate` - when the order is expected to arrive.

**Recommendation:** Add this field to make the pending orders alert more useful:
- "Pedido del 10/02 - llega manana (11/02)"

**Implementation:**
1. Create new migration file: `pb_migrations/1770720001_add_expected_arrival.js`
2. Add `expectedArrivalDate` field (type: date, required: false)
3. Update TypeScript types in `src/types/index.ts`
4. Run `npm run db:reset`

This is optional for MVP - the alert can still show "Pedido pendiente del 10/02" without the expected date, but it's more useful with it.
