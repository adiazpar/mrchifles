# Kasero

A multi-business management system for small businesses.

## Features

- **Multi-Business** - Manage multiple businesses from one account
- **Product Catalog** - AI-powered product icons, categories, stock tracking, barcode scanning and generation
- **Inventory** - Track stock levels and supplier orders
- **Team Management** - Invite partners/employees with role-based access
- **Ownership Transfer** - Transfer business ownership to another user
- **Dashboard** - Daily summaries and business insights
- **Email Auth** - Simple email/password authentication
- **PWA** - Works offline, installable on mobile
- **Sales Register** - Coming soon
- **Cash Drawer** - Coming soon

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | Local SQLite (dev) + Turso/libSQL (prod) + Drizzle ORM |
| **Auth** | Simple JWT (jose) + bcryptjs |
| **Icons** | Lucide React |
| **Barcodes** | html5-qrcode (decode) + bwip-js (render) |
| **Currency input** | react-currency-input-field |
| **Hosting** | Vercel |

## Quick Start

```bash
npm install
npm run dev
```

No environment variables are required for local development. The dev server uses a local SQLite file (`data/local.db`) created automatically on first run. Only `AUTH_SECRET` is needed to log in — add it to `.env.local`.

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push schema to dev database |
| `npm run db:push:prod` | Push schema to production database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:
- `AUTH_SECRET` - Secret for JWT signing (min 32 chars) — required in all environments

Production only (not needed for local dev):
- `TURSO_DATABASE_URL` - Turso production database URL
- `TURSO_AUTH_TOKEN` - Turso production auth token

Optional (for AI features):
- `OPENAI_API_KEY` - Product identification
- `FAL_KEY` - Emoji icon generation

## Project Structure

```
src/
├── app/
│   ├── (auth)/        # Login, register
│   ├── (hub)/         # Business hub (select/create business)
│   ├── [businessId]/  # Business routes
│   │   ├── home/      # Dashboard
│   │   ├── products/  # Product catalog + orders
│   │   ├── providers/ # Supplier management
│   │   ├── team/      # Team management
│   │   ├── manage/    # Business settings
│   │   ├── sales/     # Coming soon stub
│   │   └── cash/      # Coming soon stub
│   └── api/           # API routes
├── components/        # React components
├── contexts/          # React contexts (Auth, Business)
├── db/                # Drizzle schema & client
├── hooks/             # Custom hooks (useBusinessFormat, etc.)
├── lib/               # Utilities (locale-config, auth-edge, etc.)
└── types/             # TypeScript types
```

## Development Guidelines

- **Language**: English
- **Currency**: Defaults to USD ($) for en-US locale. The app adapts to each business's locale and currency via `useBusinessFormat()` — use that hook for all money/date/time formatting in components, and `<PriceInput>` for currency inputs.
- **Date**: Defaults to MM/DD/YYYY for en-US locale. Formatted via `useBusinessFormat()` in components.

## License

Private - All rights reserved.
