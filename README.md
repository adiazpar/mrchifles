# 🍌 Mr. Chifles

Sistema de gestión para negocio de chifles - Business management system for a Chifles snack business.

## About

A lightweight, mobile-first POS and business management system for a small Chifles (traditional Peruvian plantain chip snack) business in Lima, Peru.

**Features:**
- 📱 PWA - Works offline, installable on mobile
- 💰 Sales tracking with Cash/Yape payment methods
- 📦 Product catalog management
- 💵 Cash drawer reconciliation
- 👥 Multi-user support (Owner, Partner, Employee)
- 📊 Daily summaries and reports

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, React 18, TypeScript |
| Styling | Tailwind CSS |
| Backend | PocketBase (SQLite + Auth + Files) |
| Deployment | Hetzner VPS + Caddy |

## Quick Start

```bash
# Install dependencies
npm install

# Download PocketBase (auto-detects your OS)
npm run pb:download

# Start development servers
npm run dev:all
```

**URLs:**
- App: http://localhost:3000
- PocketBase Admin: http://127.0.0.1:8090/_/

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js (port 3000) |
| `npm run pb:start` | Start PocketBase (port 8090) |
| `npm run dev:all` | Start both concurrently |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |

## First Time Setup

1. Run `npm run dev:all`
2. Open http://127.0.0.1:8090/_/
3. Create your admin account
4. Set up collections (see `.claude/CLAUDE.md` for schemas)

## Project Structure

```
├── src/
│   ├── app/          # Next.js pages
│   ├── components/   # React components
│   ├── lib/          # Utilities (PocketBase client, formatters)
│   ├── hooks/        # React hooks
│   └── types/        # TypeScript definitions
├── public/           # Static assets
├── scripts/          # Build scripts
└── .claude/          # Project documentation
```

## Documentation

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for:
- Complete tech stack details
- PocketBase collection schemas
- Peruvian commerce context (Yape, SUNAT, etc.)
- Deployment architecture
- Development guidelines

## License

Private - All rights reserved.
