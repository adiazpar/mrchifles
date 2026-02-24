# Mr. Chifles

Sistema de gestion para negocio de chifles - Business management system for a Chifles snack business.

## About

A lightweight, mobile-first POS and business management system for a small Chifles (traditional Peruvian plantain chip snack) business in Lima, Peru. Built for a team of 3 users (owner, partner, employee) with offline-first PWA capabilities.

## Features

- **Sales Register** - Record transactions with Cash, Yape, or POS payments
- **Product Catalog** - Manage products with prices and cost tracking
- **Cash Drawer** - Opening/closing balance and reconciliation
- **Inventory** - Track stock levels and orders from supplier
- **Dashboard** - Daily summaries and business insights
- **Team Management** - Invite partners/employees with role-based access
- **Phone Auth** - SMS OTP verification via Firebase
- **PIN Login** - Fast 4-digit PIN authentication after phone verification
- **Ownership Transfer** - Secure business ownership transfer between users
- **PWA** - Works offline, installable on mobile devices

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Backend** | PocketBase (SQLite + Auth + Realtime) |
| **Auth** | Phone SMS OTP (Firebase) + PIN |
| **Testing** | Vitest, React Testing Library |
| **Frontend Hosting** | Vercel (Free) |
| **Backend Hosting** | PocketHost ($5/mo) |

## Quick Start

```bash
# Install dependencies
npm install

# Download PocketBase (auto-detects your OS)
npm run pb:download

# Start development servers (Next.js + PocketBase)
npm run dev:all
```

**Development URLs:**

| Service | URL |
|---------|-----|
| Next.js App | http://localhost:3000 |
| PocketBase Admin | http://127.0.0.1:8090/_/ |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run dev:all` | Start Next.js + PocketBase concurrently |
| `npm run build` | Build Next.js for production |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run pb:start` | Start PocketBase server |
| `npm run pb:download` | Download PocketBase binary |
| `npm run pb:migrate` | Run database migrations |
| `npm run db:reset` | Reset database and run migrations |
| `npm run deploy` | Deploy to self-hosted server (PM2) |

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

**Required variables:**

| Variable | Description |
|----------|-------------|
| `POCKETBASE_URL` | PocketBase server URL |
| `PB_ADMIN_EMAIL` | Admin email for db:reset script |
| `PB_ADMIN_PASSWORD` | Admin password for db:reset script |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `NEXT_PUBLIC_APP_URL` | Public app URL for invite links |

## Project Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Auth pages (login, register, invite)
│   │   ├── (dashboard)/        # Protected app pages
│   │   │   ├── inicio/         # Dashboard home
│   │   │   ├── ventas/         # Sales register
│   │   │   ├── productos/      # Product catalog
│   │   │   ├── caja/           # Cash drawer
│   │   │   ├── inventario/     # Inventory management
│   │   │   └── ajustes/        # Settings & team management
│   │   └── api/                # API routes (OTP, invites, etc.)
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── auth/               # Auth components (PIN pad, OTP input)
│   │   ├── layout/             # Layout components (sidebar, nav)
│   │   └── invite/             # Invite flow components
│   ├── contexts/               # React contexts (auth)
│   ├── lib/                    # Utilities (PocketBase, auth, Firebase)
│   └── types/                  # TypeScript definitions
├── pb_migrations/              # PocketBase schema migrations
├── scripts/                    # Build and deployment scripts
├── public/                     # Static assets & PWA manifest
└── .claude/                    # Project documentation
```

## Database Schema

The app uses 7 PocketBase collections:

| Collection | Purpose |
|------------|---------|
| `users` | Team members with phone auth and PIN |
| `invite_codes` | Invite codes for team member onboarding |
| `products` | Product catalog with prices |
| `sales` | Sales transactions |
| `sale_items` | Line items for each sale |
| `orders` | Purchase orders from supplier |
| `order_items` | Line items for each order |
| `ownership_transfers` | Business ownership transfer records |

## Deployment

### Production (Managed - Recommended)

**Frontend:** Vercel auto-deploys from GitHub on push to `main`.

**Backend:** PocketHost manages PocketBase with automatic backups.

```
Browser (Lima) ──66ms──> Vercel (US) ──> Static/SSR pages
                  └────> PocketHost ──> API/Database
```

### Self-Hosted (Optional)

For lower latency (~30ms), deploy to a VPS in Santiago, Chile:

```bash
# On server
git clone https://github.com/adiazpar/mrchifles.git
cd mrchifles
npm install
npm run pb:download
npm run deploy
```

Uses PM2 for process management. See `scripts/setup-server.sh` for full server setup.

## Development Guidelines

- **Language:** All UI text in Spanish (es-PE locale)
- **Currency:** Peruvian Sol (S/) with 2 decimal places
- **Date Format:** DD/MM/YYYY
- **Time Zone:** America/Lima (UTC-5)
- **No emojis** in code, comments, or UI

## Documentation

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for:
- Complete tech stack details
- PocketBase collection schemas
- Peruvian commerce context (Yape, SUNAT, etc.)
- UI/CSS guidelines
- Development workflow

## License

Private - All rights reserved.
