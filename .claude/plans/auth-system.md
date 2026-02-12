# Authentication System Implementation Plan

**Created**: 2026-02-11
**Status**: Planning
**Feature**: User authentication with PIN login and invite code registration

---

## Overview

Implement a complete authentication system for the Mr. Chifles POS app with:
- **Invite code registration** - Owner generates codes, employees self-register
- **Email + PIN daily login** - Fast, secure daily access
- **Role-based access** - Owner, Partner, Employee permissions
- **Pre-dashboard auth screen** - No navbar until authenticated

---

## UX Flow Design

### Flow 1: Owner First-Time Setup
```
App Launch → "Bienvenido" screen → "Crear Cuenta de Dueno" button
  → Enter: email, password, name, 4-digit PIN
  → Account created with role: "owner"
  → Redirect to dashboard
```

### Flow 2: Owner Generates Invite Code
```
Dashboard → Settings (Ajustes) → "Equipo" tab → "Generar Codigo"
  → Select role: Partner or Employee
  → Code generated (6 alphanumeric, e.g., "ABC123")
  → Show code + expiration (7 days)
  → Option to copy/share code
```

### Flow 3: Employee Registration (with Invite Code)
```
App Launch → "Tengo un codigo de invitacion" link
  → Enter invite code → Validate
  → If valid: Enter email, password, name, set 4-digit PIN
  → Account created with role from invite code
  → Redirect to dashboard
```

### Flow 4: Daily Login (Email → PIN)
```
App Launch → Email field + "Continuar" button
  → Enter email → Check if user exists
  → If exists: Show PIN pad (4 digits) + user's name/avatar
  → Enter PIN → Validate against hashed PIN
  → If correct: Redirect to dashboard
  → If wrong: "PIN incorrecto" (3 attempts, then lockout)
```

### Flow 5: Session Lock (Inactivity)
```
After 5 min inactivity → Lock screen
  → Shows current user's name/avatar
  → PIN pad to unlock
  → "Cambiar usuario" link → returns to email entry
```

---

## Database Schema Changes

### New Migration: `pb_migrations/1770720002_auth_system.js`

**Extend users collection** (PocketBase built-in `_pb_users_auth_`):
```javascript
// Add custom fields to users collection
{
  name: "pin",           // text, required, min:4, max:4 (stored hashed)
  type: "text",
  required: true,
  options: { min: 60, max: 60 }  // bcrypt hash length
}
{
  name: "role",          // select: owner, partner, employee
  type: "select",
  required: true,
  options: { values: ["owner", "partner", "employee"] }
}
{
  name: "invitedBy",     // relation to users (who invited them)
  type: "relation",
  options: { collectionId: "_pb_users_auth_", maxSelect: 1 }
}
{
  name: "status",        // select: active, pending, disabled
  type: "select",
  required: true,
  options: { values: ["active", "pending", "disabled"] }
}
```

**New collection: `invite_codes`**:
```javascript
{
  code: "text",          // unique, 6 chars, uppercase alphanumeric
  role: "select",        // partner, employee (not owner)
  createdBy: "relation", // -> users (must be owner)
  usedBy: "relation",    // -> users (who used it, null if unused)
  expiresAt: "date",     // 7 days from creation
  used: "bool"           // default: false
}
```

### TypeScript Types Update: `src/types/index.ts`

```typescript
export type UserRole = 'owner' | 'partner' | 'employee'
export type UserStatus = 'active' | 'pending' | 'disabled'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  status: UserStatus
  invitedBy?: string
  created: string
  updated: string
}

export interface InviteCode {
  id: string
  code: string
  role: 'partner' | 'employee'
  createdBy: string
  usedBy?: string
  expiresAt: string
  used: boolean
  created: string
}
```

---

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx           # Auth layout (no navbar)
│   │   ├── login/
│   │   │   └── page.tsx         # Email → PIN login
│   │   ├── register/
│   │   │   └── page.tsx         # Owner first-time setup
│   │   └── invite/
│   │       └── page.tsx         # Employee registration with code
│   ├── (dashboard)/
│   │   └── ajustes/
│   │       └── equipo/
│   │           └── page.tsx     # Team management + invite codes
│   └── layout.tsx               # Root layout with AuthProvider
├── components/
│   ├── auth/
│   │   ├── pin-pad.tsx          # 4-digit PIN entry component
│   │   ├── email-form.tsx       # Email entry step
│   │   └── lock-screen.tsx      # Session lock overlay
│   └── ...
├── contexts/
│   └── auth-context.tsx         # AuthProvider + useAuth hook
├── lib/
│   ├── auth.ts                  # Auth utilities (hash PIN, validate)
│   └── pocketbase.ts            # (existing, add auth methods)
└── middleware.ts                # Route protection
```

---

## Component Specifications

### 1. PIN Pad Component (`src/components/auth/pin-pad.tsx`)
- 4x3 grid: 1-9, clear, 0, backspace
- Large touch targets (min 48px)
- Visual feedback on press
- 4 dots showing entered digits
- Props: `onComplete(pin: string)`, `disabled`, `error`

### 2. Auth Layout (`src/app/(auth)/layout.tsx`)
- Full screen, no navbar/sidebar
- Centered content
- App logo at top
- Clean white/light background

### 3. Login Page (`src/app/(auth)/login/page.tsx`)
- Step 1: Email input + "Continuar" button
- Step 2: PIN pad + user greeting ("Hola, Arturo")
- "Olvidaste tu PIN?" link (sends reset email)
- "Crear cuenta" link (for owner setup)

### 4. Lock Screen (`src/components/auth/lock-screen.tsx`)
- Overlay on top of dashboard
- Shows user avatar/initials + name
- PIN pad to unlock
- "Cambiar usuario" button
- Triggered by inactivity timeout

---

## Auth Context Design

```typescript
// src/contexts/auth-context.tsx

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pin: string) => Promise<void>
  logout: () => void
  lockSession: () => void
  unlockSession: (pin: string) => Promise<boolean>
  isLocked: boolean
}
```

---

## Security Considerations

1. **PIN Hashing**: Use bcrypt to hash PINs before storage
2. **Rate Limiting**: 3 failed PIN attempts → 30 second lockout
3. **Session Timeout**: Auto-lock after 5 minutes inactivity
4. **Secure Token Storage**: PocketBase stores auth token in localStorage
5. **HTTPS Only**: Caddy handles SSL in production

---

## Implementation Order

### Phase 1: Database & Core Auth (Day 1)
1. Create migration for user fields + invite_codes collection
2. Update TypeScript types
3. Create auth utilities (PIN hashing, validation)
4. Create AuthContext and useAuth hook
5. Add middleware.ts for route protection

### Phase 2: Login Flow (Day 2)
1. Build PIN pad component
2. Build login page (email → PIN flow)
3. Build auth layout (no navbar)
4. Connect to PocketBase auth
5. Test login/logout flow

### Phase 3: Registration Flows (Day 3)
1. Build owner registration page
2. Build invite code entry page
3. Build employee registration form
4. Test complete registration flows

### Phase 4: Session Management (Day 4)
1. Build lock screen component
2. Implement inactivity detection
3. Add "switch user" functionality
4. Update sidebar/header with real user data

### Phase 5: Team Management (Day 5)
1. Build invite code generation UI
2. Build team list view
3. Add ability to disable/enable users
4. Add PIN reset functionality

---

## Verification Plan

### Manual Testing
1. Fresh app load → should redirect to login
2. Owner registration → creates account, redirects to dashboard
3. Generate invite code → code appears with expiration
4. Employee uses code → can register and access app
5. Daily login → email then PIN works
6. Wrong PIN 3x → lockout message
7. Inactivity → lock screen appears
8. Lock screen → can unlock with PIN or switch user

### Automated Testing (Future)
- Unit tests for PIN hashing/validation
- Integration tests for auth flows
- E2E tests with Playwright

---

## Dependencies

- PocketBase SDK already installed (^0.21.0)
- Need to add: `bcryptjs` for PIN hashing (or use built-in crypto)
- No additional packages required

---

## Open Questions (Resolved)

1. **PIN length**: 4 digits (industry standard for speed)
2. **Invite code format**: 6 alphanumeric uppercase (easy to type/share)
3. **Code expiration**: 7 days (reasonable for small team)
4. **Lockout duration**: 30 seconds after 3 failed attempts
5. **Session timeout**: 5 minutes inactivity → lock (not logout)

---

## Sources

- [Square POS Codes](https://loman.ai/blog/square-device-code-vs-pos-code) - Permission-based access patterns
- [Shopify POS PIN](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/pin-recovery) - Email + PIN model
- [Loyverse PIN Access](https://help.loyverse.com/help/pin-code-access) - Unique 4-digit PIN requirements
- [POS Design Principles](https://agentestudio.com/blog/design-principles-pos-interface) - Three-tap rule, role-based access
- [Odoo POS Multi-Employee](https://www.odoo.com/documentation/18.0/applications/sales/point_of_sale/employee_login.html) - Badge/PIN selection patterns
