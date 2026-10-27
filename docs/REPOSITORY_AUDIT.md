# Comprehensive Repository Audit — Nestara AI

**Date of Audit:** October 22, 2026  
**Auditor:** Senior Software Architect & Repository Auditor  
**Primary Product Git Repository:** `OpenProperty` (`C:\Projects\Nestara AI\OpenProperty`)  
**External Reference Archive:** `C:\Projects\Nestara-AI-Reference-Archive`  

---

## Executive Summary

The active workspace has been refined so that **`OpenProperty` is the sole production repository** in `C:\Projects\Nestara AI`. Nestara AI's primary application is derived from MIT-licensed OpenProperty, and the original copyright and license notice are preserved. The reviewed reference repositories were not incorporated as source code. Third-party dependency licenses and applicable notices must still be respected.

All 16 reference repositories and experimental research projects have been safely relocated outside the active product workspace to:
`C:\Projects\Nestara-AI-Reference-Archive`

Their source files and `.git` commit histories remain 100% intact and available for reference, but are completely isolated from the product build, ensuring they will never be inadvertently staged or committed to the Nestara AI GitHub repository.

---

## 1. Primary Production Repository: OpenProperty

### 1.1 Overview & Upstream Origin
- **Repository Name:** OpenProperty (Rebranded as Nestara AI)
- **Local Path:** `C:\Projects\Nestara AI\OpenProperty`
- **Upstream Git Remote:** `origin https://github.com/clawnify/OpenProperty.git`
- **Current Branch:** `master`
- **License:** **MIT License** (Copyright (c) 2026 Clawnify, verified in `LICENSE`)
- **Product Presentation:** **Nestara AI — Intelligent Property & Rental Management System**

### 1.2 Technology Stack
- **Frontend SPA:** React 19.2.5, Vite 6.4.2, TypeScript 5.9.3
- **Design System:** Tailwind CSS v4.2.4 with `@tailwindcss/vite`, Radix UI primitives (`@radix-ui/react-*`), Lucide Icons (`lucide-react` 0.575.0), Phosphor Icons (`@phosphor-icons/react` 2.1.10), `class-variance-authority`, `clsx`, `tailwind-merge`
- **Routing:** pushState URL client router (`use-router.ts`)
- **Edge Backend:** Hono v4.12.15 on Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite) with local state in `.wrangler/state/v3/d1`
- **Package Manager:** pnpm v12.15.0 (`pnpm-workspace.yaml`)

### 1.3 Directory Structure & Application Entry Points
```
OpenProperty/
├── .github/                         # GitHub Actions workflows
├── docs/                            # Complete Nestara AI documentation suite
│   ├── FRIEND_HANDOFF.md            # Master onboarding and developer guide
│   ├── PROJECT_STATUS.md            # Authoritative progress tracking & verification
│   ├── REPOSITORY_AUDIT.md          # This audit and archive manifest
│   ├── FEATURE_MATRIX.md            # Feature comparison and clean-room plan
│   ├── ARCHITECTURE.md              # System architecture with Mermaid diagrams
│   ├── IMPLEMENTATION_ROADMAP.md    # Phased engineering tasks
│   ├── SETUP_AND_RUN.md             # PowerShell setup and development guide
│   ├── UPSTREAM_ATTRIBUTION.md      # Open-source licensing and legal compliance
│   └── CHANGELOG.md                 # Change records
├── src/
│   ├── client/                      # React 19 Client SPA
│   │   ├── components/              # UI feature modules (dashboard, leases, etc.)
│   │   ├── hooks/                   # use-router.ts, use-app-state.ts
│   │   ├── lib/utils.ts             # Date, money, and color helpers
│   │   ├── api.ts                   # Fetch API client wrapper
│   │   ├── app.tsx                  # App shell with Nestara AI navigation rail
│   │   ├── main.tsx                 # Client entry point
│   │   └── styles.css               # Tailwind CSS v4 design tokens
│   └── server/                      # Cloudflare Workers API
│       ├── db.ts                    # D1 query execution wrapper
│       ├── index.ts                 # Hono API router with 43 REST endpoints
│       └── schema.sql               # Relational D1 SQLite schema (11 tables)
├── clawnify.json                    # Platform template manifest
├── components.json                  # Shadcn UI configuration
├── index.html                       # Vite HTML entry point (Nestara AI title)
├── LICENSE                          # Original MIT License
├── manifest.json                    # Workspace manifest (cleaned)
├── package.json                     # Scripts & dependencies
├── pnpm-lock.yaml                   # Dependency lockfile
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Vite configuration
└── wrangler.toml                    # Cloudflare Workers & D1 local database binding
```

### 1.4 Database Schema (Cloudflare D1)
The schema in `src/server/schema.sql` defines 11 relational tables:
1. `settings` (key, value, updated_at)
2. `properties` (id, name, type, address, city, state, zip, year_built, notes, color)
3. `units` (id, property_id FK, name, bedrooms, bathrooms, sqft, market_rent, status, notes)
4. `tenants` (id, first_name, last_name, email, phone, date_of_birth, emergency_contact, employer, monthly_income)
5. `leases` (id, unit_id FK, primary_tenant_id FK, start_date, end_date, monthly_rent, deposit, rent_due_day, late_fee, status)
6. `lease_tenants` (lease_id FK, tenant_id FK)
7. `rent_charges` (id, lease_id FK, period, due_date, amount, amount_paid, status)
8. `payments` (id, charge_id FK, paid_at, amount, method, reference, notes)
9. `vendors` (id, name, category, phone, email, notes, color)
10. `work_orders` (id, property_id FK, unit_id FK, tenant_id FK, vendor_id FK, title, description, priority, status, cost)
11. `applications` (id, unit_id FK, first_name, last_name, email, phone, monthly_income, employer, desired_move_in, status)

### 1.5 Verification Results
- **TypeScript Typecheck:** `pnpm typecheck` (`tsc --noEmit`) ➔ **0 errors**.
- **Production Build:** `pnpm build` (`vite build`) ➔ **Transformed 6,397 modules into `dist/` with zero errors in 15.58s**.
- **Local Database Migration:** `pnpm db:migrate` ➔ 25 DDL statements executed cleanly into local SQLite.
- **Runtime API Verification:** Booted `wrangler dev --port 8787` locally and verified live HTTP responses:
  - `GET /api/health` ➔ `{"ok": true}`
  - `GET /api/properties` ➔ 3 seeded properties returned with unit counts
  - `GET /api/dashboard/summary` ➔ Returned live portfolio metrics (80% occupancy, 4 occupied, 1 vacant)

---

## 2. External Reference Archive Manifest

**Archive Location:** `C:\Projects\Nestara-AI-Reference-Archive`

All reference repositories have been moved outside the active workspace. Their source code, branches, and `.git` histories are preserved for reference.

### 2.1 Major Reference Repositories
| Repository Name | Upstream Git Remote | Branch | License | Primary Architectural Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **EstateFlow-client** | `https://github.com/EstateFlow/client.git` | `main` | No license | Public property search grid, filter sidebar, AI conversational chat drawer UI. |
| **EstateFlow-server** | `https://github.com/EstateFlow/server.git` | `main` | No license | Gemini prompt schemas for structured property recommendations; PayPal routes. |
| **RentEase-Smart-Rental-Manager** | `https://github.com/thanishkabandaru/RentEase-Smart-Rental-Manager.git` | `main` | Mentioned MIT in README (No file) | Python lease document RAG (FAISS + sentence-transformers) and OpenCV damage triage. |
| **Real_estate_portfolio_management_system** | `https://github.com/chin123k/Real_estate_portfolio_management_system.git` | `main` | Academic (No license) | 12+ MySQL stored procedures for late fees, lease renewal alerts, and cashflow math. |
| **property-rental-management-system** | None (Corrupted/empty clone) | None | None | Historical clone directory preserved safely. |

### 2.2 Research Repositories (`additional-research/`)
*License Verification Date: October 22, 2026 (Verified against each repository's committed LICENSE file)*

| Sub-Repository Name | Upstream Git Remote | Branch | License | Key Research Concepts |
| :--- | :--- | :--- | :--- | :--- |
| **property-recommendation** | `https://github.com/newking9088/real_estate_cost_estimation_and_property_recommendation.git` | `main` | MIT (Nawaraj Paudel, 2024) | CatBoost ML model for property price estimation and content-based recommendation. |
| **real_estate_cost_estimation...** | `https://github.com/newking9088/real_estate_cost_estimation_and_property_recommendation` | `main` | MIT (Nawaraj Paudel, 2024) | Duplicate mirror of cost estimation pipeline. |
| **ai-lease-parser** | `https://github.com/realtonkaa/ai-lease-parser.git` | `main` | MIT (realtonkaa, 2025) | Python lease contract PDF text extraction and entity recognition. |
| **rent-prediction** | `https://github.com/Unknowalive/rent-prediction.git` | `main` | MIT (Rent Prediction Team, 2026) | Feature engineering and regression models for rental price forecasting. |
| **property-inspector** | `https://github.com/rahuldean/property-inspector.git` | `main` | MIT (Rahul Reddy, 2026) | Property inspection checklist and condition reporting workflows. |
| **PropMind** | `https://github.com/panakantinandu/PropMind` | `main` | **Proprietary / Educational-only** (Nandu Panakanti, 2026; Commercial use, resale & client deployment strictly prohibited without written permission) | Real estate AI assistant prompts and market analytics reference. |
| **LeaseBook** | `https://github.com/jwh3times/LeaseBook` | `main` | **AGPL-3.0** (GNU Affero GPL v3.0) | Lease contract bookkeeping and renewal tracking UI reference. |
| **listing-platform** | `https://github.com/natnael-shiferaw/realestate-listing-platform-react.git` | `master` | MIT (Natnael Shiferaw, 2024) | React real estate listing gallery and property detail page components. |
| **northstar-alerts** | `https://github.com/readesie/northstar-property-management.git` | `main` | MIT (NorthStar, 2026) | Property alert dispatching and maintenance notification patterns. |
| **openkos** | `https://github.com/senatroxx/openkos` | `main` | **Apache-2.0** (Apache License 2.0) | Boarding house / small rental room allocation management. |
| **PropertyLoop** | `https://github.com/Kaos599/PropertyLoop.git` | `main` | No license | Rental property lifecycle management reference. |

---

## 3. Strict Compliance & Isolation Rules
1. **Zero Direct Code Copying from Unlicensed Repositories:** Code from `EstateFlow-client`, `EstateFlow-server`, `Real_estate_portfolio_management_system`, and `PropertyLoop` must never be copied directly into `OpenProperty`.
2. **Copyleft & Commercial Restriction Isolation:**
   - **`LeaseBook` is AGPL-3.0 licensed.** AGPL-3.0 is a strong copyleft license with network-use disclosure requirements. Under no circumstances may code from `LeaseBook` be copied or adapted into Nestara AI, preserving Nestara AI's clean MIT licensing.
   - **`PropMind` is proprietary / educational-only.** Commercial use, resale, distribution, or client deployment is strictly prohibited without explicit written permission from the author. It serves purely as background reading; zero code, prompts, or derivatives may be included in Nestara AI.
   - **`openkos` is Apache-2.0 licensed.** Permissive, but not copied.
3. **Clean-Room Implementation:** Selected features (e.g. public listings, search filters, Gemini prompt schemas, damage triage) will be independently implemented in clean TypeScript natively for Cloudflare Workers.
4. **No External Dependencies Staged:** The reference archive in `C:\Projects\Nestara-AI-Reference-Archive` is outside the product git root and must never be staged or committed.
