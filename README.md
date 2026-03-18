# Feria POS

A mobile-first point-of-sale system for small businesses selling at ferias (market fairs).

## Features

- **Sales Register** - Record transactions with Cash, Yape, or Plin payments
- **Product Catalog** - Manage products with prices and cost tracking
- **Cash Drawer** - Opening/closing balance and reconciliation
- **Inventory** - Track stock levels and supplier orders
- **Dashboard** - Daily summaries and business insights
- **Team Management** - Invite partners/employees with role-based access
- **Phone Auth** - SMS OTP verification via Firebase
- **PIN Login** - Fast 4-digit PIN after phone verification
- **PWA** - Works offline, installable on mobile

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Backend** | PocketBase (SQLite + Auth + Realtime) |
| **Auth** | Phone SMS OTP (Firebase) + PIN |
| **Icons** | Lucide React |
| **Hosting** | Vercel (frontend) + PocketHost (backend) |

## Quick Start

```bash
npm install
npm run pb:download
npm run dev:all
```

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| PocketBase Admin | http://127.0.0.1:8090/_/ |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start Next.js + PocketBase |
| `npm run build` | Build for production |
| `npm run db:reset` | Reset database and run migrations |

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

## Project Structure

```
src/
├── app/           # Next.js App Router
├── components/    # React components
├── contexts/      # React contexts
├── hooks/         # Custom hooks
├── lib/           # Utilities
└── types/         # TypeScript types
pb_migrations/     # Database migrations
```

## Development Guidelines

- **Language**: All UI in Spanish (es-PE)
- **Currency**: Peruvian Sol (S/)
- **Date**: DD/MM/YYYY
- **Timezone**: America/Lima

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for full documentation.

## License

Private - All rights reserved.
