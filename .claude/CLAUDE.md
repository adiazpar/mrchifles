# Chifles Business Management System

## Project Overview

A web-based business management system for a small Chifles (traditional Peruvian plantain chip snack) business based in Piura, selling in Lima, Peru. The system helps transition from paper-based record keeping to a digital platform accessible on both desktop and mobile devices.

### Business Context

- **Product**: Chifles - thin fried plantain slices, a traditional snack from Piura, Peru
- **Location**: Single fixed location (fair stand) in Lima
- **Team**: Business owner, 1 business partner, 1 employee
- **Current Payment Methods**: Cash and Yape (digital wallet)
- **Product Line**: Multiple products/flavors with fixed prices

---

## Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Server** | Hetzner VPS (CX22) | €3.49/mo, 2GB RAM, always on, no cold starts |
| **Backend** | PocketBase | SQLite + Auth + Files + Realtime in single binary |
| **Frontend** | Next.js 14+ (App Router) | React, SSR, great mobile support |
| **Language** | TypeScript | Type safety for financial data |
| **Styling** | Tailwind CSS | Rapid UI development, responsive design |
| **Database** | SQLite (via PocketBase) | Simple, fast, reliable for this scale |
| **Reverse Proxy** | Caddy | Automatic HTTPS, simple config |

### Why This Stack?

1. **Always On**: No cold starts, no pausing, no free tier limits
2. **Simple**: One server, one database file, one deployment
3. **Cheap**: ~€3.49/month total for everything
4. **Reliable**: SQLite handles thousands of writes/second
5. **Backups**: Just copy the SQLite file
6. **Full Control**: No vendor lock-in

### Key Dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "pocketbase": "^0.21.0",
  "date-fns": "^3.0.0",
  "zod": "^3.22.0"
}
```

### PocketBase Benefits

- **Single Binary**: Download, run, done
- **Built-in Auth**: Email/password, OAuth providers
- **Admin Dashboard**: Visual database management at `/_/`
- **Realtime**: WebSocket subscriptions out of the box
- **File Storage**: Upload handling included
- **REST API**: Auto-generated for all collections
- **SDK**: Official JavaScript SDK for Next.js

---

## Mobile Strategy

### Phase 1: Progressive Web App (PWA)

The web app will be built as a PWA from the start:

- Same codebase as web
- Installable on home screen
- Works offline (critical for unreliable connectivity)
- No app store approval needed
- Instant updates
- Push notifications

**PWA Implementation:**
- Service Worker for offline caching
- Web App Manifest for installation
- IndexedDB for offline data sync
- Background sync for queued sales

### Phase 2: React Native (Future)

If native app store presence is needed later:

| Consideration | Notes |
|---------------|-------|
| **Framework** | React Native with Expo |
| **Code Sharing** | React skills transfer, some component logic reusable |
| **When to Consider** | If PWA limitations become blocking (iOS restrictions, native features) |
| **Shared Backend** | Same PocketBase API, same data models |

**React Native would enable:**
- Native performance
- App store presence
- Better iOS integration
- Native camera/barcode scanning

**Recommendation**: Start with PWA. It covers 95% of use cases for a POS-style app. Only invest in React Native if specific native features are required.

---

## Peruvian Commerce Context

### Payment Methods

#### Yape (Primary Digital Payment)
- **Provider**: Banco de Crédito del Perú (BCP)
- **Users**: 17+ million users, 2+ million businesses
- **Transaction Limit**: S/ 2,000 accumulated per day
- **Business Commission**: 2.95% of total daily sales
- **Features**: QR code payments, phone number transfers, instant deposits
- **Integration**: For this MVP, manual entry of Yape payments (no API integration needed)

#### Plin (Secondary Digital Payment - Future)
- **Providers**: BBVA, Interbank, Scotiabank
- **Users**: ~14 million users
- **Interoperability**: Since July 2023, Yape and Plin are interoperable

#### Cash
- **Status**: Still represents 35% of POS payments in Peru (2023)
- **Currency**: Peruvian Sol (PEN/S/)
- **Consideration**: Must track cash drawer for reconciliation

### Tax Regime Options (SUNAT)

The client should consult with an accountant, but here are the likely applicable regimes:

#### NRUS (Nuevo Régimen Único Simplificado)
- **Best for**: Very small businesses, market stalls
- **Limits**: Monthly income ≤ S/ 8,000, Annual ≤ S/ 96,000
- **Documents**: Only boletas (no facturas)
- **Tax**: Fixed monthly fee based on income bracket
- **Books**: No accounting books required

#### RER (Régimen Especial de Renta)
- **Best for**: Small businesses needing facturas
- **Limits**: Annual income ≤ S/ 525,000, ≤ 10 employees
- **Tax**: 1.5% of monthly net income + 18% IGV
- **Books**: Purchase registry + Sales registry only

#### RMT (Régimen MYPE Tributario)
- **Best for**: Growing small businesses
- **Limits**: Annual income ≤ 1,700 UIT (≈ S/ 9,095,000)
- **Tax**: 10% on profits up to 15 UIT, 29.5% above

### Electronic Invoicing (Comprobantes Electrónicos)

Since 2022, electronic invoicing is mandatory for all taxpayers in Peru.

#### Boleta de Venta Electrónica
- **Use**: Sales to final consumers (B2C)
- **Buyer ID**: DNI (national ID)
- **SUNAT Submission**: Grouped in daily summary, sent next day
- **Note**: Does not allow IGV deduction for buyer

#### Factura Electrónica
- **Use**: Sales to businesses (B2B)
- **Buyer ID**: RUC (tax ID)
- **SUNAT Submission**: Must be sent within 3 calendar days
- **Note**: Allows IGV credit for buyer

#### Emission Systems
- **SEE-SOL**: Free SUNAT web portal (recommended for small business)
- **SUNAT Mobile App**: For small entrepreneurs
- **Third-party**: Paid services with API integration

### Employee Requirements (Planilla)

If employees are formally registered:

#### Mandatory Employer Contributions
- **EsSalud**: 9% of gross salary (health insurance)
- **Gratificaciones**: 13th and 14th month bonuses (July 15, December 15)
- **CTS**: ~9.72% annual (severance fund, deposited May/November)
- **Family Allowance**: 10% of minimum wage for employees with children
- **Life Insurance**: Mandatory from day 1 of employment

#### Minimum Wage (2025)
- **Monthly**: S/ 1,130
- **Hourly**: S/ 7.06

#### Planilla Electrónica
- Employers must register workers in electronic payroll system
- SUNAFIL conducts inspections
- Fines for misclassification or non-compliance

### Food Business Regulations (DIGESA)

For processed food products like Chifles:

- **Authority**: DIGESA (Dirección General de Salud Ambiental)
- **Requirement**: Sanitary registration for production/sale
- **Labeling**: Must comply with Peru's Healthy Eating Law (high sugar/sodium/fat warnings)
- **Quality**: Must meet microbiological and chemical safety standards

---

## Feature Requirements

### MVP Features (Phase 1)

#### 1. Sales Register (Registro de Ventas)
```
- Record individual sales transactions
- Select products/quantities from catalog
- Calculate totals automatically
- Record payment method (Cash/Yape)
- Associate with employee who made the sale
- Generate simple receipt (optional: share via WhatsApp)
- Daily sales summary view
```

#### 2. Product Catalog (Catálogo de Productos)
```
- Product name, description, flavor/variant
- Sale price (fixed)
- Cost price (for profit calculation)
- Active/inactive status
- Optional: product image
```

#### 3. Cash Drawer (Caja)
```
- Opening balance (apertura de caja)
- Track cash in/out throughout day
- Closing balance (cierre de caja)
- Reconciliation: expected vs actual cash
- Record discrepancies with notes
```

#### 4. Daily Summary (Resumen Diario)
```
- Total sales by payment method
- Number of transactions
- Top-selling products
- Profit margin (if cost prices entered)
- Cash drawer status
```

#### 5. User Management
```
- Simple PIN or password authentication
- User roles: Owner, Partner, Employee
- Track which user made each sale
```

### Phase 2 Features

#### 6. Inventory Management (Inventario)
```
- Track stock levels
- Record inventory purchases (entries)
- Automatic deduction on sales
- Low stock alerts
- Inventory value calculation
```

#### 7. Expense Tracking (Gastos)
```
- Record business expenses
- Categories: ingredients, packaging, transport, rent, utilities, etc.
- Payment method tracking
- Monthly expense summaries
```

#### 8. Financial Reports (Reportes)
```
- Daily/weekly/monthly sales reports
- Profit & loss statements
- Sales by product analysis
- Sales by employee
- Export to Excel/PDF
```

### Phase 3 Features (Future)

#### 9. Electronic Invoicing Integration
```
- Generate boletas electrónicas
- Integration with SUNAT SEE-SOL
- Daily summary submission
```

#### 10. Employee Payroll Tracking
```
- Record employee hours/shifts
- Calculate payroll obligations
- Track gratificaciones and CTS
```

#### 11. React Native Mobile App
```
- Native iOS/Android apps (if PWA insufficient)
- Offline-first with sync
- Barcode/QR scanning
- Push notifications
```

---

## Data Models (PocketBase Collections)

PocketBase uses collections instead of traditional ORM models. Here are the collection schemas:

### users (extends PocketBase auth collection)
```javascript
{
  // Built-in: id, email, password, created, updated
  name: "text",           // Required
  pin: "text",            // Hashed PIN for quick auth
  role: "select",         // Options: owner, partner, employee
  active: "bool"          // Default: true
}
```

### products
```javascript
{
  name: "text",           // Required
  description: "text",    // Optional
  flavor: "text",         // e.g., "Salado", "Tocino", "Queso"
  salePrice: "number",    // Required, min: 0
  costPrice: "number",    // Optional, min: 0
  active: "bool",         // Default: true
  image: "file"           // Optional, single image
}
```

### sales
```javascript
{
  saleNumber: "number",       // Auto-increment
  date: "date",               // Default: now
  total: "number",            // Required
  paymentMethod: "select",    // Options: cash, yape, plin, mixed
  user: "relation",           // -> users
  cashDrawer: "relation",     // -> cash_drawers (optional)
  notes: "text"               // Optional
}
```

### sale_items
```javascript
{
  sale: "relation",       // -> sales, required
  product: "relation",    // -> products, required
  quantity: "number",     // Required, min: 1
  unitPrice: "number",    // Price at time of sale
  subtotal: "number"      // quantity * unitPrice
}
```

### cash_drawers
```javascript
{
  date: "date",               // Required
  openingBalance: "number",   // Required
  closingBalance: "number",   // Set on close
  expectedCash: "number",     // Calculated
  discrepancy: "number",      // actual - expected
  notes: "text",
  status: "select"            // Options: open, closed
}
```

### cash_transactions
```javascript
{
  cashDrawer: "relation",     // -> cash_drawers, required
  type: "select",             // Options: cash_in, cash_out
  amount: "number",           // Required
  description: "text"         // Required
}
```

### inventory (Phase 2)
```javascript
{
  product: "relation",    // -> products, unique
  currentStock: "number", // Default: 0
  minStock: "number"      // Alert threshold, default: 10
}
```

### expenses (Phase 2)
```javascript
{
  date: "date",               // Default: now
  amount: "number",           // Required
  category: "select",         // Options: ingredients, packaging, transport, rent, utilities, salaries, other
  description: "text",        // Required
  paymentMethod: "select"     // Options: cash, yape, plin
}
```

---

## UI/UX Guidelines

### Design Principles
1. **Simple & Clean**: Minimal UI, large touch targets for mobile
2. **Spanish Language**: All UI text in Spanish
3. **Accessible**: Large fonts, high contrast, simple navigation
4. **Mobile-First**: Works well on smartphones (primary use case during sales)
5. **Offline-Capable**: PWA with service worker for unreliable connectivity

### Color Palette (Suggestion)
- Primary: Warm yellow/gold (evokes fried plantains)
- Secondary: Green (plantain leaves)
- Accent: Earth tones (Piura desert)
- Background: Light, clean whites/grays

### Key UI Patterns
- Large buttons for common actions
- Numeric keypad for quick quantity entry
- Swipe gestures for mobile navigation
- Clear confirmation dialogs for destructive actions
- Visual feedback for successful sales
- Bottom navigation for mobile (max 5 items)

---

## Project Structure

```
/
├── pb_data/                   # PocketBase data (SQLite + uploads)
│   ├── data.db               # SQLite database
│   └── storage/              # Uploaded files
├── pb_migrations/             # PocketBase schema migrations
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # Login, PIN entry
│   │   │   ├── login/
│   │   │   └── pin/
│   │   ├── (dashboard)/      # Main app routes (protected)
│   │   │   ├── ventas/       # Sales register
│   │   │   ├── productos/    # Product catalog
│   │   │   ├── caja/         # Cash drawer
│   │   │   ├── reportes/     # Reports
│   │   │   └── ajustes/      # Settings
│   │   ├── layout.tsx
│   │   ├── manifest.ts       # PWA manifest
│   │   └── sw.ts             # Service worker
│   ├── components/
│   │   ├── ui/               # Base UI components (buttons, inputs, etc.)
│   │   ├── sales/            # Sales-specific components
│   │   ├── products/         # Product components
│   │   ├── cash-drawer/      # Cash drawer components
│   │   └── reports/          # Report components
│   ├── lib/
│   │   ├── pocketbase.ts     # PocketBase client singleton
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── offline.ts        # Offline sync utilities
│   │   └── utils.ts          # Helper functions (currency, dates)
│   ├── hooks/
│   │   ├── useAuth.ts        # Auth state hook
│   │   ├── useSales.ts       # Sales data hook
│   │   └── useOffline.ts     # Offline status hook
│   └── types/
│       └── index.ts          # TypeScript types
├── public/
│   ├── icons/                # PWA icons
│   └── ...
├── Caddyfile                  # Caddy reverse proxy config
├── docker-compose.yml         # Optional: containerized deployment
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Hetzner VPS (CX22)                  │
│                 €3.49/month                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌─────────────┐     ┌─────────────────────────┐  │
│   │   Caddy     │────▶│      Next.js App        │  │
│   │  (HTTPS)    │     │     (Port 3000)         │  │
│   │  Port 443   │     └─────────────────────────┘  │
│   │             │                                   │
│   │             │     ┌─────────────────────────┐  │
│   │             │────▶│     PocketBase          │  │
│   │             │     │     (Port 8090)         │  │
│   └─────────────┘     │                         │  │
│                       │  ┌───────────────────┐  │  │
│                       │  │   SQLite DB       │  │  │
│                       │  │   (pb_data/)      │  │  │
│                       │  └───────────────────┘  │  │
│                       └─────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Caddyfile Example
```
chifles.example.com {
    handle /api/* {
        reverse_proxy localhost:8090
    }
    handle /_/* {
        reverse_proxy localhost:8090
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

### Backup Strategy
```bash
# Daily backup cron job
0 3 * * * cp /path/to/pb_data/data.db /backups/data_$(date +\%Y\%m\%d).db
```

---

## Development Guidelines

### For AI Agents Working on This Project

1. **Language**: All user-facing text must be in **Spanish** (Peru locale: es-PE)
2. **Currency**: Always use Peruvian Sol (S/) with 2 decimal places
3. **Date Format**: DD/MM/YYYY (Peruvian standard)
4. **Time Zone**: America/Lima (UTC-5)
5. **Number Format**: Use comma for thousands, period for decimals (1,234.56)
6. **No Emojis**: Never use emojis in code, documentation, UI text, comments, or commit messages. Keep all output professional and text-only.

### PocketBase SDK Usage

```typescript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

// Auth
await pb.collection('users').authWithPassword(email, password);

// CRUD
const products = await pb.collection('products').getFullList();
const sale = await pb.collection('sales').create({ ... });

// Realtime
pb.collection('sales').subscribe('*', (e) => {
  console.log(e.action, e.record);
});
```

### Code Standards
- Use TypeScript strict mode
- Validate all inputs with Zod
- Use React Server Components where possible
- Keep components small and focused
- Use Spanish for variable names in business logic where clarity helps

### Offline-First Patterns
```typescript
// Queue sales when offline
if (!navigator.onLine) {
  await saveToIndexedDB('pendingSales', sale);
} else {
  await pb.collection('sales').create(sale);
}

// Sync when back online
window.addEventListener('online', syncPendingSales);
```

### Testing Considerations
- Test with realistic Peruvian product names
- Test currency calculations with common Peruvian amounts
- Verify mobile responsiveness thoroughly
- Test offline functionality
- Test PWA installation on Android and iOS

### Security
- Hash PINs before storage (PocketBase handles password hashing)
- Validate all API inputs
- Use HTTPS only (Caddy handles this automatically)
- No sensitive data in client-side storage
- Use PocketBase API rules for authorization

---

## Glossary (Spanish-English)

| Spanish | English | Context |
|---------|---------|---------|
| Venta | Sale | A sales transaction |
| Producto | Product | Item being sold |
| Caja | Cash drawer | Cash management |
| Boleta | Receipt/Invoice | For consumers (B2C) |
| Factura | Invoice | For businesses (B2B) |
| Efectivo | Cash | Payment method |
| IGV | Sales tax | 18% in Peru |
| Chifles | Plantain chips | The product being sold |
| Apertura | Opening | Start of cash drawer |
| Cierre | Closing | End of cash drawer |
| Gastos | Expenses | Business costs |
| Ingresos | Income | Revenue |
| Ganancia | Profit | Revenue minus costs |

---

## Local Development Setup

### Prerequisites

- **Node.js 18+** (recommended: use nvm with `.nvmrc`)
- **Git**

### Important Note for Claude Agents

**The development servers (Next.js and PocketBase) are ALWAYS run by the user in a separate terminal.** Claude agents should NEVER start the dev servers. Assume the servers are already running when working on this project.

- Next.js: http://localhost:3000
- PocketBase API: http://127.0.0.1:8090/api/
- PocketBase Admin: http://127.0.0.1:8090/_/

### Quick Start

```bash
# Clone the repo
git clone https://github.com/adiazpar/mrchifles.git
cd mrchifles

# Install dependencies
npm install

# Download PocketBase binary (auto-detects your OS)
npm run pb:download

# Start both Next.js and PocketBase
npm run dev:all
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server (port 3000) |
| `npm run pb:start` | Start PocketBase server (port 8090) |
| `npm run dev:all` | Start both Next.js and PocketBase concurrently |
| `npm run pb:download` | Download PocketBase binary for your platform |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |

### First Time Setup

1. **Start PocketBase**: `npm run pb:start`
2. **Open Admin UI**: http://127.0.0.1:8090/_/
3. **Create admin account** (first time only)
4. **Create collections** (see Data Models section)
5. **Start Next.js**: `npm run dev`
6. **Open app**: http://localhost:3000

### Project URLs (Development)

| Service | URL |
|---------|-----|
| Next.js App | http://localhost:3000 |
| PocketBase API | http://127.0.0.1:8090/api/ |
| PocketBase Admin | http://127.0.0.1:8090/_/ |

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Default values work for local development. Update `POCKETBASE_URL` for production.

### No Docker Required

This setup is intentionally lightweight:
- **PocketBase**: Single binary, no container needed
- **Next.js**: Runs with Node.js directly
- **SQLite**: File-based, no database server

For production, see the Deployment Architecture section.

---

## References & Resources

### Core Tech Stack Documentation

| Technology | Documentation | API Reference |
|------------|---------------|---------------|
| **Next.js 15** | [nextjs.org/docs](https://nextjs.org/docs) | [App Router](https://nextjs.org/docs/app) |
| **React 18** | [react.dev](https://react.dev/) | [Reference](https://react.dev/reference/react) |
| **TypeScript** | [typescriptlang.org/docs](https://www.typescriptlang.org/docs/) | [Handbook](https://www.typescriptlang.org/docs/handbook/) |
| **Tailwind CSS** | [tailwindcss.com/docs](https://tailwindcss.com/docs) | [Utilities](https://tailwindcss.com/docs/utility-first) |
| **PocketBase** | [pocketbase.io/docs](https://pocketbase.io/docs/) | [API](https://pocketbase.io/docs/api-records/) |
| **PocketBase JS SDK** | [github.com/pocketbase/js-sdk](https://github.com/pocketbase/js-sdk) | [README](https://github.com/pocketbase/js-sdk#readme) |
| **Zod** | [zod.dev](https://zod.dev/) | [API](https://zod.dev/?id=basic-usage) |
| **date-fns** | [date-fns.org/docs](https://date-fns.org/docs/Getting-Started) | [Functions](https://date-fns.org/docs/Getting-Started) |

### Deployment & Infrastructure

| Service | Documentation |
|---------|---------------|
| **Hetzner Cloud** | [docs.hetzner.com/cloud](https://docs.hetzner.com/cloud/) |
| **Caddy Server** | [caddyserver.com/docs](https://caddyserver.com/docs/) |
| **Let's Encrypt** (via Caddy) | [letsencrypt.org/docs](https://letsencrypt.org/docs/) |

### PWA Resources
- [web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [Workbox (Service Worker Toolkit)](https://developer.chrome.com/docs/workbox/)
- [PWA Builder](https://www.pwabuilder.com/)

### Peruvian Commerce
- [SUNAT - Tax Authority](https://www.sunat.gob.pe/)
- [SUNAT Emprender Portal](https://emprender.sunat.gob.pe/)
- [Yape Business](https://www.yape.com.pe/)
- [DIGESA - Food Safety](http://www.digesa.minsa.gob.pe/)

### Future: React Native
- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [React Native Paper (UI)](https://reactnativepaper.com/)

---

## Claude Code Plugins

Install plugins via the `/plugin` command in Claude Code.

### Recommended Plugins for This Project

| Plugin | Purpose | Install |
|--------|---------|---------|
| **typescript-lsp** | Real-time TypeScript type checking and error detection | `/plugin install typescript-lsp` |
| **frontend-design** | UI/UX specialist for interface development | `/plugin install frontend-design` |
| **Context7** | Fetches current API docs (Next.js, React, etc.) | `/plugin install context7` |
| **Playwright** | Browser automation and E2E testing | `/plugin install playwright` |
| **GitHub** | PR reviews, branch management, code search | `/plugin install github` |
| **code-review** | Multi-agent code review (security, performance) | `/plugin install code-review` |
| **pr-review-toolkit** | Specialized PR review agents | `/plugin install pr-review-toolkit` |

### All Available Plugin Categories

**LSP Plugins** (Language Servers):
- typescript-lsp, pyright-lsp, rust-analyzer-lsp, gopls-lsp, jdtls-lsp, csharp-lsp, swift-lsp, php-lsp, lua-lsp, clangd-lsp

**Workflow Plugins**:
- security-guidance, code-review, pr-review-toolkit, feature-dev, frontend-design

**External Integrations**:
- GitHub, Supabase, Context7, Playwright, Firebase, Stripe, Greptile, Linear, Slack, GitLab, Asana, Laravel Boost, Serena

### Plugin Resources
- [Official Plugin Directory](https://github.com/anthropics/claude-plugins-official)
- [Plugin Documentation](https://code.claude.com/docs/en/plugins)
- [Plugin Marketplace Guide](https://code.claude.com/docs/en/discover-plugins)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-10 | Initial CLAUDE.md created |
| 0.2.0 | 2026-02-10 | Revised tech stack: Hetzner VPS + PocketBase. Added mobile strategy (PWA first, React Native future). Updated data models for PocketBase collections. Added deployment architecture. |
| 0.3.0 | 2026-02-10 | Added Local Development Setup section. Project scaffolded with Next.js, PocketBase download script, TypeScript types, and utility functions. |
| 0.4.0 | 2026-02-10 | Fixed cross-platform portability (Windows support). Added comprehensive documentation links. Added MCP servers section. Added no-emoji policy. |
