# Developer Onboarding & Handover Guide — Nestara AI

**Welcome to the Nestara AI codebase!**  
This document is designed to give you a complete, practical, and friction-free onboarding into the project so you can immediately understand the architecture, run the system locally, and begin productive development.

---

## 1. Project Overview & Scope

### What is Nestara AI?
**Nestara AI — Intelligent Property & Rental Management System**  
*Tagline:* **Find Better. Manage Smarter. Live Easier.**

Nestara AI bridges the gap between back-office property operations and modern, prospective renter discovery:
1. **Back-Office Portfolio Management:** Gives landlords and property managers complete control over buildings, units, tenants, multi-tenant leases, monthly rent collection ledgers, and maintenance work orders.
2. **Intelligent Discovery & AI Layer (In Roadmap):** Provides prospective tenants with natural language property search, conversational AI copilots, Gemini-powered property match explanations, and computer vision maintenance damage triage.

### Repository Identity
- **Active Git Repository:** `OpenProperty/` (This repository is the production root of Nestara AI).
- **Upstream Origin & Licensing:** Nestara AI's primary application is derived from MIT-licensed OpenProperty, and the original copyright and license notice are preserved. The reviewed reference repositories were not incorporated as source code. Third-party dependency licenses and applicable notices must still be respected.
- **Reference Archive:** All historical research and reference repositories have been moved to `C:\Projects\Nestara-AI-Reference-Archive` for safe storage outside this product repo.

---

## 2. Technology Stack

| Layer | Technologies | Role / Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19.2.5, Vite 6.4.2, TypeScript 5.9.3 | Fast single-page application with type safety |
| **Styling & UI** | Tailwind CSS v4.2.4, Radix UI primitives, Lucide Icons | Responsive modern design system |
| **Routing** | pushState URL routing (`use-router.ts`) | Zero-dependency client-side URL management |
| **Backend / API** | Hono v4.12.15 on Cloudflare Workers | Ultra-low latency edge serverless REST API |
| **Database** | Cloudflare D1 (SQLite) via Wrangler 4.86.0 | Local and cloud serverless ACID relational store |
| **Package Manager** | pnpm v12.15.0 (Workspace configured) | Fast, deterministic dependency management |
| **AI Layer (Target)**| Google Gemini 2.0 Flash API | Multimodal vision analysis and structured JSON recommendations |

---

## 3. Current Implementation Status

### ✅ Implemented & Personally Verified at Runtime
- **Properties & Units:** Full CRUD for buildings (single-family, multi-family, condo, commercial) and units (beds, baths, sqft, status: vacant/occupied/turnover/unavailable, market rent).
- **Tenant Management:** Tenant directory with contact details, employer, income, and emergency contact records.
- **Lease Tracking:** Fixed-term leases, custom rent due days, deposits, late-fee grace periods, and multi-tenant occupancy links.
- **Rent Ledger:** Idempotent 1-click monthly charge generation, period navigation, and payment allocations (cash, check, ACH, credit).
- **Maintenance Work Orders:** Urgency/priority triage (urgent, high, normal, low), status boards, vendor assignment, and repair cost tracking.
- **Vendor Directory:** Trade categorization (plumbers, electricians, HVAC, handymen, cleaning, general).
- **Portfolio Analytics:** Real-time occupancy rate calculations, monthly cashflow summaries, and 30-day lease expiration alerts.

### 🟡 Partially Implemented
- **Tenant Applications:** Database schema exists in D1 (`applications` table); public web submission form is pending.
- **Automated Tests:** TypeScript typechecking and production Vite builds are automated and passing with zero errors; Vitest unit test suite configuration is pending.

### ❌ Not Implemented Yet (Your Next Milestones)
- **User Authentication & Roles:** Current app runs in single-user back-office mode. Needs multi-role auth (Landlord, Tenant, Admin).
- **Public Property Listings & Filters:** Public renter-facing view for exploring available vacant units.
- **Tenant Self-Service Portal:** Tenant dashboard to view personal lease, pay rent, and submit work orders.
- **AI Recommendation Copilot:** Gemini-powered conversational search and matching assistant.
- **Maintenance Image Damage Triage:** Multimodal photo upload analyzing damage severity and repair suggestions.

---

## 4. Local Setup & Running in 3 Minutes

### Prerequisites
Ensure you have the following installed:
- **Node.js:** `>= 20.0.0` (Tested on `v24.20.0`)
- **pnpm:** `>= 9.0.0` (Tested on `12.15.0`)
- **Git:** `>= 2.40.0`

### Step 1: Install Dependencies
From the repository root:
```powershell
pnpm install
```

### Step 2: Initialize the Local D1 Database
Apply the relational schema to your local Cloudflare D1 SQLite database:
```powershell
pnpm db:migrate
```
*Expected output: `25 commands executed successfully.` Local database file resides in `.wrangler/state/v3/d1`.*

### Step 3: Start the Development Server
```powershell
pnpm dev
```
This runs Vite (frontend) and Wrangler (Cloudflare Worker API) concurrently:
- **Frontend UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8787](http://localhost:8787)
- **API Health Check:** [http://localhost:8787/api/health](http://localhost:8787/api/health)

### Running Typechecks & Builds
```powershell
pnpm typecheck   # Runs tsc --noEmit (Must exit with code 0)
pnpm build       # Bundles client assets with Vite into dist/
```

---

## 5. Environment Variables & Secrets

Local development requires **zero external environment variables** because Cloudflare D1 runs in a local SQLite file.

When integrating external services (e.g., Google Gemini API), create a local `.dev.vars` file in the repository root:
```env
# .dev.vars (Git-ignored)
GEMINI_API_KEY=your_gemini_api_key_here
```
> [!WARNING]
> Never commit `.dev.vars` or `.env` files to git. The repository's `.gitignore` is already configured to ignore all `.env*` and `.dev.vars` files.

---

## 6. Codebase Tour: Important Files & Directories

```
OpenProperty/
├── src/
│   ├── client/                          # React Single Page App
│   │   ├── components/
│   │   │   ├── dashboard/dashboard-page.tsx  # Executive KPIs & monthly cashflow
│   │   │   ├── properties/                   # Property list & unit modals
│   │   │   ├── tenants/                      # Tenant list & tenant profile page
│   │   │   ├── leases/                       # Leases table & lease dialog
│   │   │   ├── rent/rent-page.tsx            # Rent ledger & payment dialog
│   │   │   ├── maintenance/                  # Work orders board & ticket dialog
│   │   │   ├── settings/settings-page.tsx    # Vendor registry & rent policy defaults
│   │   │   ├── page-shell.tsx                # Reusable page container & header band
│   │   │   └── ui/                           # Radix UI primitives (dialog, button, table)
│   │   ├── hooks/
│   │   │   ├── use-router.ts                 # Custom pushState URL routing
│   │   │   └── use-app-state.ts              # Global data sync & cached API fetches
│   │   ├── lib/utils.ts                      # Formatting helpers (formatDate, formatMoney)
│   │   ├── api.ts                            # Typed fetch API client wrapper
│   │   ├── app.tsx                           # Master shell with <AppNav> sidebar
│   │   └── main.tsx                          # React DOM mount point
│   └── server/                          # Edge Backend (Cloudflare Worker)
│       ├── db.ts                             # D1 SQLite query, get, run helper methods
│       ├── index.ts                          # Hono router with 43 REST endpoints & auto-seeder
│       └── schema.sql                        # D1 SQLite DDL schema and indexes
├── docs/                                # Complete system documentation
├── wrangler.toml                        # Cloudflare Worker configuration & D1 binding
├── package.json                         # Dependencies & run scripts
└── LICENSE                              # Upstream MIT License
```

---

## 7. Developer How-To Guides

### How to Add a New Frontend Page / Feature
1. **Create the component:** Add your new screen in `src/client/components/<feature>/<feature>-page.tsx`. Use `<PageShell title="Your Title">` for layout consistency.
2. **Register the route:**
   - In `src/client/hooks/use-router.ts`, add your route pattern to `ROUTE_PATTERNS` and add the route type to the `Route` union.
   - In `src/client/app.tsx`, add an item to the navigation arrays (`PORTFOLIO`, `OPERATIONS`, or `ADMIN`) and render your component inside `<main>`.
3. **Connect to API:** Call `api<ResponseType>("GET", "/api/your-endpoint")` using the client in `src/client/api.ts`.

### How to Add a New Backend API Endpoint
1. Open `src/server/index.ts`.
2. Add your endpoint to the Hono `app` instance using parameterized queries:
   ```typescript
   app.get("/api/my-feature", async (c) => {
     const data = await query("SELECT * FROM my_table WHERE active = 1");
     return c.json({ data });
   });
   ```
3. Use Zod schemas to validate `c.req.json()` on `POST` and `PUT` endpoints.

### How to Update the Database Schema Safely
1. **Append DDL to `src/server/schema.sql`:**
   Always use `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ... ADD COLUMN` statements:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'landlord',
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```
2. **Execute migration locally:**
   ```powershell
   pnpm db:migrate
   ```
3. Update TypeScript definitions in `src/client/types.ts` to match the new schema.

---

## 8. Common Troubleshooting & Gotchas

1. **Port 8787 or 5173 Already in Use:**
   If Wrangler fails with `EADDRINUSE: address already in use :::8787`, terminate the orphaned process:
   ```powershell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 8787).OwningProcess | Stop-Process -Force
   ```
2. **Local Database Reset:**
   If you ever want to reset your local database to a fresh state with default seed data:
   ```powershell
   Remove-Item -Recurse -Force ".wrangler\state"
   pnpm db:migrate
   ```
3. **PowerShell Script Policy Error:**
   If `pnpm` command execution is blocked by Windows:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

---

## 9. Git Workflow & Publishing Guide

### Existing Branch & Upstream Origin
- The repository was cloned from `https://github.com/clawnify/OpenProperty.git` on branch `master`.
- **Do not push directly to the Clawnify origin remote.**

### How to Publish to Your New GitHub Repository
When you are ready to publish this project to your personal or organization GitHub account:

```powershell
# 1. Verify you are in the OpenProperty directory
Set-Location "C:\Projects\Nestara AI\OpenProperty"

# 2. Stage the cleaned codebase and documentation
git add .

# 3. Create a clean initial commit
git commit -m "chore: initial commit for Nestara AI - Intelligent Property & Rental Management System"

# 4. Point origin to your new GitHub repository
git remote set-url origin https://github.com/<your-username>/<your-new-repo>.git

# 5. Rename branch to main (if desired) and push
git branch -M main
git push -u origin main
```

---

## 10. Top 5 Remaining Development Tasks

| Priority | Task | Description |
| :--- | :--- | :--- |
| **P0 (Critical)** | **Task 1: User Authentication & Roles** | Add `users` table to `schema.sql` and implement JWT login in Hono to support Landlord, Tenant, and Admin accounts. |
| **P1 (High)** | **Task 2: Public Property Listings & Search** | Create `GET /api/public/listings` and build responsive listing cards + filter sidebar for prospective tenants. |
| **P1 (High)** | **Task 3: Google Gemini Recommendation Copilot** | Implement `src/server/ai.ts` using Google Gemini 2.0 Flash for conversational property recommendations. |
| **P1 (High)** | **Task 4: Tenant Self-Service Portal** | Build tenant portal view to allow renters to view active lease details, check payment records, and submit work orders. |
| **P2 (Medium)** | **Task 5: Multimodal Maintenance Damage Triage** | Add photo upload to work orders and use Gemini Vision to classify damage severity and suggest repair trades. |

---

## 11. Your Recommended First Task

👉 **Implement Task 1: User Authentication & Roles**  
- **Why start here:** All planned features (tenant self-service portal, online maintenance ticket submission, saved property wishlists, rental applications) require knowing the identity and role of the logged-in user.
- **First steps:**
  1. Add `users` table to `src/server/schema.sql`.
  2. Run `pnpm db:migrate`.
  3. Create `src/server/auth.ts` with Hono JWT helpers.
  4. Expose `POST /api/auth/register` and `POST /api/auth/login`.
