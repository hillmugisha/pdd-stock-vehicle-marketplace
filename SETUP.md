# PDD Stock Marketplace — Setup Guide

## Prerequisites

1. **Node.js 18+** — download from https://nodejs.org  
2. **A Supabase project** — free at https://supabase.com

---

## Step 1 — Install Node.js

Download and install from https://nodejs.org/en/download  
Restart your terminal after installing. Verify:

```
node --version   # should print v18 or v20+
npm --version
```

---

## Step 2 — Create a Supabase Project

1. Go to https://supabase.com → New Project
2. Note your **Project URL** and **Anon Key** from:  
   Settings → API → Project URL / Project API keys
3. Note your **Service Role Key** from the same page (secret — never expose to browser)
4. Go to Settings → Database → Connection string → **URI**  
   Copy the **Transaction pooler** URL (port 6543) → this is your `DATABASE_URL`  
   Copy the **Direct connection** URL (port 5432) → this is your `DIRECT_URL`

---

## Step 3 — Configure Environment

Edit `marketplace/.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

Replace `xxxx` and `PASSWORD` with your actual values.

---

## Step 4 — Install Dependencies & Push DB Schema

Open a terminal in the `marketplace/` folder:

```bash
cd "C:\Stock PDD Project\marketplace"

npm install

# Push Prisma schema to Supabase (creates tables)
npx prisma db push

# Generate Prisma client
npx prisma generate
```

---

## Step 5 — Seed the Database with Excel Data

The Excel data was already exported to `C:\Stock PDD Project\stock_data.json`  
during initial setup. To re-export (e.g. after updating the Excel file), run this
PowerShell script:

```powershell
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open('C:\Stock PDD Project\PDD_Stock_4_6_26.xlsx')
$ws = $wb.Sheets.Item(1)
$lastRow = $ws.UsedRange.Rows.Count
$lastCol = $ws.UsedRange.Columns.Count
$headers = @()
for ($c = 1; $c -le $lastCol; $c++) { $headers += $ws.Cells.Item(1, $c).Text }
$data = @()
for ($r = 2; $r -le $lastRow; $r++) {
    $row = @{}
    for ($c = 1; $c -le $lastCol; $c++) { $row[$headers[$c-1]] = $ws.Cells.Item($r, $c).Text }
    $data += $row
}
$data | ConvertTo-Json -Depth 2 | Out-File 'C:\Stock PDD Project\stock_data.json' -Encoding UTF8
$wb.Close($false)
$excel.Quit()
Write-Host "Exported $($data.Count) rows"
```

Then seed the database:

```bash
npm run db:seed
```

This imports all 70 vehicles from the Excel file into Supabase.

---

## Step 6 — Run the App

```bash
npm run dev
```

Open http://localhost:3000

---

## Features

| Feature | Details |
|---|---|
| **Inventory Grid** | 4-column card layout (2→3→4 cols as screen widens) matching the design spec |
| **Filters** | Sidebar with Year, OEM, Color, Spec ID, Fuel Type, Drivetrain, Wheelbase, Status |
| **Search** | Full-text search across model, stock#, VIN, spec |
| **Vehicle Details** | Expandable card panel with all specs |
| **Reserve** | Auth-gated modal — captures reserved-by, reserved-for, notes |
| **Dashboard** | User's active & past reservations with cancel option |
| **Auth** | Supabase email/password with email confirmation |

---

## Project Structure

```
marketplace/
├── prisma/schema.prisma          # DB schema (Vehicle, Reservation, User)
├── scripts/seed.ts               # Data import from Excel JSON
├── src/
│   ├── app/
│   │   ├── page.tsx              # Inventory listing (home page)
│   │   ├── layout.tsx            # Root layout with Navbar
│   │   ├── auth/login/           # Login page
│   │   ├── auth/register/        # Register page
│   │   ├── dashboard/            # User reservations dashboard
│   │   └── api/
│   │       ├── vehicles/         # GET /api/vehicles (list + filters)
│   │       ├── reservations/     # GET + POST /api/reservations
│   │       └── auth/callback/    # Supabase auth callback
│   ├── components/
│   │   ├── VehicleCard.tsx       # Card matching screenshot layout
│   │   ├── FilterPanel.tsx       # Sidebar filter panel
│   │   ├── ReserveModal.tsx      # Reservation form dialog
│   │   ├── Navbar.tsx            # Top navigation bar
│   │   └── ui/                   # ShadCN UI primitives
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client singleton
│   │   ├── supabase/client.ts    # Browser Supabase client
│   │   └── supabase/server.ts    # Server Supabase client
│   └── types/index.ts            # TypeScript interfaces
```

---

## Re-syncing Updated Excel Data

Whenever `PDD_Stock_4_6_26.xlsx` is updated:

1. Run the PowerShell export above (overwrites `stock_data.json`)
2. Run `npm run db:seed` — existing vehicles update, new ones are created

---

## Supabase Auth Settings

In your Supabase dashboard → Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000` (dev) or your production URL
- **Redirect URLs**: `http://localhost:3000/**`

For production, add your deployed URL to both fields.
