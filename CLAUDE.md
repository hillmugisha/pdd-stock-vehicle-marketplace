# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## GitHub Repository

**Repo:** https://github.com/hillmugisha/pdd-stock-vehicle-marketplace

All commits and pushes should target this repo (`origin`). Remote: `https://github.com/hillmugisha/pdd-stock-vehicle-marketplace.git`

## Commands

```bash
# Development
npm run dev           # start local dev server
npm run build         # prisma generate + next build
npm run lint          # eslint

# Database
npm run db:generate   # regenerate Prisma client after schema changes
npm run db:push       # push schema changes to Supabase (no migration files)
npm run db:seed       # seed Vehicle table from scripts/stock_data.json
npm run db:studio     # open Prisma Studio GUI

# Inventory sync (runs against the Excel file on disk)
npm run sync          # one-shot sync: Excel → Supabase via syncEngine
```

> **No test suite exists.** There are no unit or integration tests in this project.

## Environment Variables

Required in `.env` (local) and Vercel environment settings:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |
| `DATABASE_URL` | Pooler connection string (`pgbouncer=true`) for Prisma queries |
| `DIRECT_URL` | Direct connection string for Prisma migrations/push |
| `SYNC_SECRET` | Bearer token protecting `POST /api/sync` |
| `RESEND_API_KEY` | Resend API key for email sending |
| `EXCEL_FILE_PATH` | Absolute path to the xlsx file in `Prod Data Files\` (local sync only; defaults to latest file in that folder) |

## Architecture

### Stack
Next.js 14 (App Router) · TypeScript · Tailwind CSS · ShadCN UI (Radix primitives) · Prisma ORM · Supabase (PostgreSQL + Auth) · Resend (email) · Vercel Analytics

### Data Model
Three Prisma models in `prisma/schema.prisma`:
- **Vehicle** — the core inventory record; seeded/synced from Excel; filtered to `partner IN ("STOCK - PDD", "STOCK - PDD - MOD & TRANS CL")` only
- **Reservation** — links a Vehicle to a User with status (`active` / `cancelled`)
- **User** — mirrors Supabase Auth users; created on first login via `/api/auth/callback`
- **SyncLog** — audit trail written by `syncEngine` on every sync run

### Inventory Sync Pipeline
Excel file (from `Prod Data Files/`, latest by mtime) → `src/lib/sync/excelReader.ts` (parses xlsx, filters to STOCK-PDD and STOCK-PDD-MOD & TRANS CL rows) → `src/lib/sync/fieldMap.ts` (maps Excel column headers to DB field names, normalises dates/prices) → `src/lib/sync/syncEngine.ts` (upsert/inactivate logic, writes SyncLog).

Triggered three ways:
1. `npm run sync` — local script via `scripts/run-sync.ts`
2. `POST /api/sync` — HTTP endpoint protected by `SYNC_SECRET` bearer token
3. Windows Task Scheduler via `scripts/schedule-sync.bat`

### Authentication Flow
Supabase Auth with email/password. `src/middleware.ts` guards `/dashboard` (redirect to login if unauthenticated) and redirects authenticated users away from `/auth/*`. OAuth callback at `/api/auth/callback` exchanges the code for a session and upserts the user record into the Prisma `User` table.

### API Routes (`src/app/api/`)
- `GET /api/vehicles` — filtered + paginated vehicle list; also returns `filterOptions` and `vehicleFields` (full unfiltered field set used for cascading filters client-side)
- `GET /api/vehicles/[id]` — single vehicle with active reservations
- `POST /api/reservations` — create reservation (auth required)
- `DELETE /api/reservations/[id]` — cancel reservation (owner or admin)
- `POST /api/interest` — sends HTML email via Resend to notify Brady of customer interest; no auth required
- `POST /api/contact` — logs contact form submission (email wiring left for later)
- `POST|GET /api/sync` — manual inventory sync trigger

### Main Page (`src/app/page.tsx`)
Client component that:
1. Fetches all vehicles from `/api/vehicles` (up to 500), groups them by PAC-QID to compute `qty`
2. Sorts by availability order: On Ground → In Transit → In Build → Unscheduled
3. Computes **cascading filter options** client-side: each filter dimension shows only values compatible with the other active filters, derived from `vehicleFieldsBase` (full unfiltered field set returned by the API)
4. Renders either card grid (infinite scroll) or list view (12-row pagination with resizable columns)
5. List view supports multi-row checkbox selection → bulk "I'm Interested" modal

### Key Conventions
- **`prisma/migrations/` is gitignored** — schema changes are applied with `db:push`, not `migrate dev`
- **Availability labels** are derived client-side from `orderStatus` string matching (not a DB enum). The mapping lives in `page.tsx` (`getAvailabilityString`) and is duplicated in the API's `availabilityConditions` builder — keep both in sync when adding new statuses
- **Webpack cache** is disabled in development (`next.config.js`) due to Windows path-with-spaces issues
- **`DATABASE_URL`** must use the Supabase transaction pooler (port 6543, `pgbouncer=true`) for serverless/Vercel; **`DIRECT_URL`** uses port 5432 for schema operations
