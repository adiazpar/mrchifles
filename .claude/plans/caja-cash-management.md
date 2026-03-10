# Caja (Cash Management) - Implementation Plan

## Overview

The "caja" represents the physical cash drawer at the feria stand. It tracks the actual cash on hand, separate from the overall business finances. This is critical because:

1. **Cash is physical** - You need to know exactly how much should be in the drawer
2. **Multiple payment methods exist** - Yape/POS sales don't add cash to the drawer
3. **Cash moves for various reasons** - Not just sales (employee loans, expenses, change runs)

---

## Key Decisions

| Question | Decision |
|----------|----------|
| Who can open/close? | Any employee can open or close the drawer |
| Cash sales without drawer? | NOT allowed - must open drawer first |
| Order payments affect caja? | NO - caja is for sales cash only. Orders tracked separately |
| Employee loan assignment | Auto-assigns to currently logged-in user |
| History view | Second tab on caja page (like productos) |
| Returns | Manual egreso with note for now; proper flow later |

---

## Key Concepts

### Cash Balance vs Business Balance

| Concept | What it tracks | Examples |
|---------|---------------|----------|
| **Cash Balance** | Physical money in the drawer | Bills and coins you can count |
| **Business Balance** | Total business income/value | Includes Yape, POS, bank deposits |

**Example scenario:**
- You sell S/100 in cash = Cash balance +100, Business balance +100
- You sell S/50 via Yape = Cash balance unchanged, Business balance +50
- Employee lends you S/20 = Cash balance +20, Business balance unchanged (it's a loan)

### The Daily Cycle

1. **Apertura (Open)** - Count starting cash, record opening balance
2. **Durante el dia (During)** - Track all movements in/out
3. **Cierre (Close)** - Count ending cash, compare to expected, record discrepancies

---

## Cash Movements

### Money IN (increases cash balance)

| Type | Description | Affects Business Balance? |
|------|-------------|---------------------------|
| **Venta efectivo** | Cash sale to customer | Yes (+) - auto from ventas |
| **Prestamo empleado** | Employee lends money to the business | No (it's debt) |
| **Retiro de banco** | Withdraw from bank to drawer | No (transfer) |
| **Sencillo/Cambio** | Getting change from somewhere | No (exchange) |

### Money OUT (decreases cash balance)

| Type | Description | Affects Business Balance? |
|------|-------------|---------------------------|
| **Devolucion prestamo** | Pay back employee loan | No (paying debt) |
| **Deposito a banco** | Move cash to bank | No (transfer) |
| **Gastos operativos** | Buy supplies, transport, etc. | Yes (-) expense |
| **Devolucion cliente** | Customer return, give cash back | Yes (-) |
| **Cambio de billetes** | Exchange for smaller bills | No (exchange) |

---

## Integration with Other Systems

### Sales (Ventas)

When a sale is made:
- **Cash payment**: Creates a cash movement (IN) automatically
- **Yape/POS payment**: No cash movement, but recorded in sales
- **Mixed payment**: Creates cash movement only for cash portion

**IMPORTANT**: If no drawer is open, cash sales are blocked. The ventas page must check for an open session before allowing cash payments.

### Orders (Pedidos)

Order payments do NOT affect the caja. The caja tracks sales cash only. Orders may have a `paymentMethod` field for documentation purposes, but this is separate from cash drawer tracking.

### Inventory

No direct integration. Inventory tracks units, caja tracks cash. They're separate concerns.

---

## Employee Loans

Employees sometimes lend money to cover cash shortfalls.

**Simplified Flow:**
1. Employee taps "Registrar movimiento" → selects "Prestamo"
2. System auto-assigns the logged-in user as the lender
3. Creates movement IN with employee reference
4. Later, to repay: "Devolucion prestamo" → shows outstanding balance for that user
5. Creates movement OUT

**Display:**
- Small summary card on caja page showing outstanding loans
- Per-employee breakdown

```
┌─────────────────────────────┐
│  Prestamos pendientes       │
│  Maria: S/ 50.00            │
│  Pedro: S/ 20.00            │
│  Total: S/ 70.00            │
└─────────────────────────────┘
```

**Note:** This is NOT employee salary. It's temporary loans for cash flow.

---

## Discrepancies

At closing, the expected balance is calculated:
```
Expected = Opening + Cash IN - Cash OUT
```

If actual count differs:
- **Sobrante (surplus)**: More cash than expected - could be unrecorded sale or error
- **Faltante (shortage)**: Less cash than expected - could be theft, error, or forgotten expense

Record the discrepancy with notes explaining it if possible.

---

## UI Design

### Page Structure

Two tabs like the productos page:

```
┌─────────────────────────────────────┐
│  Caja                               │
│  Control de efectivo                │
│                                     │
│  ┌──────────┐  ┌──────────┐         │
│  │  Caja    │  │ Historial│         │
│  └──────────┘  └──────────┘         │
└─────────────────────────────────────┘
```

### Caja Tab - Drawer CLOSED

```
┌─────────────────────────────────────┐
│  CAJA CERRADA                       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │    [ Abrir Caja ]           │    │
│  │                             │    │
│  │    Saldo inicial: S/_____   │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  Ultima sesion: Ayer 6:42 p.m.      │
│  Cerrada por: Maria                 │
└─────────────────────────────────────┘
```

### Caja Tab - Drawer OPEN

```
┌─────────────────────────────────────┐
│  CAJA ABIERTA         [ Cerrar ]    │
│  Desde 8:30 a.m. - Maria            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Saldo esperado             │    │
│  │  S/ 847.50                  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Prestamos pendientes       │    │
│  │  Maria: S/ 50.00            │    │
│  │  Total: S/ 50.00            │    │
│  └─────────────────────────────┘    │
│                                     │
│  Movimientos de hoy                 │
│  ─────────────────────────────      │
│  Apertura            +S/ 200.00     │
│  Venta #12 (efectivo) +S/ 35.00    │
│  Venta #13 (efectivo) +S/ 22.50    │
│  Gastos operativos   -S/ 15.00     │
│  Venta #14 (efectivo) +S/ 40.00    │
│  ...                                │
│                                     │
│  [ + Registrar movimiento ]         │
└─────────────────────────────────────┘
```

### Manual Movement Modal

```
┌─────────────────────────────────────┐
│  Registrar Movimiento          [X]  │
│                                     │
│  ○ Ingreso (dinero entra)           │
│  ● Egreso (dinero sale)             │
│                                     │
│  Tipo:                              │
│  [ Gastos operativos         ▼]     │
│                                     │
│  Monto:                             │
│  S/ _________                       │
│                                     │
│  Nota (opcional):                   │
│  ______________________________     │
│                                     │
│  [ Cancelar ]    [ Registrar ]      │
└─────────────────────────────────────┘
```

**Movement Types:**

Ingreso options:
- Prestamo empleado (auto-assigns current user)
- Retiro de banco
- Sencillo/Cambio
- Otro

Egreso options:
- Devolucion prestamo (shows user's outstanding balance)
- Deposito a banco
- Gastos operativos
- Devolucion cliente
- Cambio de billetes
- Otro

### Closing Flow Modal

```
┌─────────────────────────────────────┐
│  Cerrar Caja                   [X]  │
│                                     │
│  Saldo esperado: S/ 847.50          │
│                                     │
│  Cuanto hay en caja?                │
│  S/ _________                       │
│                                     │
│  ┌─ Diferencia: -S/ 12.50 ───────┐  │
│  │  Faltante                     │  │
│  │                               │  │
│  │  Nota:                        │  │
│  │  ____________________________│  │
│  └───────────────────────────────┘  │
│                                     │
│  [ Cancelar ]    [ Cerrar Caja ]    │
└─────────────────────────────────────┘
```

### Historial Tab

Archive of all past sessions:

```
┌─────────────────────────────────────┐
│  Historial de Sesiones              │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Hoy, 8:30 a.m. - 6:45 p.m. │    │
│  │  Maria → Pedro              │    │
│  │  Apertura: S/ 200.00        │    │
│  │  Cierre: S/ 847.50          │    │
│  │  Diferencia: S/ 0.00   OK   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Ayer, 8:15 a.m. - 7:00 p.m.│    │
│  │  Maria → Maria              │    │
│  │  Apertura: S/ 150.00        │    │
│  │  Cierre: S/ 623.00          │    │
│  │  Diferencia: -S/ 12.50      │    │
│  │  Faltante                   │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Load more...]                     │
└─────────────────────────────────────┘
```

Tapping a session shows its full movement list.

---

## Database Schema

### cash_sessions
```javascript
{
  openedAt: "date",           // Required - when opened
  closedAt: "date",           // Null until closed
  openedBy: "relation",       // -> users
  closedBy: "relation",       // -> users (null until closed)
  openingBalance: "number",   // Starting cash
  closingBalance: "number",   // Actual count at close (null until closed)
  expectedBalance: "number",  // Calculated at close (null until closed)
  discrepancy: "number",      // closingBalance - expectedBalance
  discrepancyNote: "text"     // Explanation if any
}
```

### cash_movements
```javascript
{
  session: "relation",        // -> cash_sessions, required
  type: "select",             // ingreso, egreso
  category: "select",         // venta, prestamo_empleado, gastos, etc.
  amount: "number",           // Always positive
  note: "text",               // Optional description
  sale: "relation",           // -> sales (if auto-created from sale)
  employee: "relation",       // -> users (for loans)
  createdBy: "relation",      // -> users (who recorded this)
  created: "date"             // Auto timestamp
}
```

### Movement Categories

```javascript
// For type: "ingreso"
const ingresoCategories = [
  'venta',              // Auto from cash sale
  'prestamo_empleado',  // Employee loan
  'retiro_banco',       // Bank withdrawal
  'cambio',             // Getting change
  'otro'
]

// For type: "egreso"
const egresoCategories = [
  'devolucion_prestamo', // Repaying employee
  'deposito_banco',      // Bank deposit
  'gastos',              // Operating expenses
  'devolucion_cliente',  // Customer refund
  'cambio_billetes',     // Breaking bills
  'otro'
]
```

---

## User Stories

### As any employee, I want to:
- Open the drawer with a starting balance
- See all cash movements throughout the day
- Record manual movements (expenses, loans, etc.)
- Close the drawer and record the actual count
- Know immediately if there's a discrepancy
- See my outstanding loan balance
- View past sessions in the history tab

### As the business, the system should:
- Automatically create movements when cash sales are made
- Block cash sales if no drawer is open
- Calculate expected balance in real-time
- Track employee loans per user
- Archive all sessions for auditing

---

## Implementation Checklist

### Phase 1: Database
- [ ] Create cash_sessions collection
- [ ] Create cash_movements collection
- [ ] Add TypeScript types
- [ ] Run migration

### Phase 2: Core UI
- [ ] Two-tab layout (Caja / Historial)
- [ ] Closed drawer state with open button
- [ ] Open drawer state with balance and movements
- [ ] Movement list component

### Phase 3: Actions
- [ ] Open drawer modal
- [ ] Close drawer modal with discrepancy handling
- [ ] Manual movement modal
- [ ] Employee loan logic (auto-assign, track balance)

### Phase 4: Integration
- [ ] Ventas page checks for open session
- [ ] Cash sales auto-create movements
- [ ] Block cash sales if no drawer open

### Phase 5: History
- [ ] Session list with pagination
- [ ] Session detail view
- [ ] Movement history per session

---

## Not In Scope (for now)

- Bank account tracking (only physical cash)
- Credit/accounts receivable
- Detailed expense categorization (future "Gastos" feature)
- Petty cash vs main drawer (single drawer only)
- Cash counting by denomination (just total amount)
- Proper returns flow in ventas (manual egreso for now)
- Order payment tracking in caja (orders are separate)
