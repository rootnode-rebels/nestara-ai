# Nestara AI — Intelligent Property & Rental Management System

> **Find Better. Manage Smarter. Live Easier.**

Nestara AI is an integrated property and rental management platform designed to unify back-office portfolio operations with public tenant discovery, automated AI recommendations, and intelligent maintenance triage.

Built on an edge-native serverless architecture, Nestara AI offers landlords, property managers, and tenants a fast, modern, and self-hostable system without expensive enterprise SaaS subscriptions or heavy infrastructure overhead.

---

## 1. Key Capabilities

### 🏢 Portfolio & Operations (Operational Baseline)
- **Properties & Units:** Multi-building and multi-unit portfolio tracking (single-family, multi-family, condo, townhouse, commercial) with occupancy status, unit dimensions, market rent, and color-coded portfolio tags.
- **Tenants & Leases:** Complete tenant profiles (employment, income, emergency contacts) and multi-tenant lease agreements with custom rent due days, security deposits, and late-fee grace periods.
- **Rent Ledger & Cashflow:** Idempotent 1-click monthly charge generation, period navigation, and payment allocation tracking across cash, check, ACH, and credit cards.
- **Maintenance & Work Orders:** Priority-based work order boards (urgent, high, normal, low) with vendor dispatching, scheduled dates, and repair cost tracking.
- **Vendor Directory:** Trade categorization (plumbers, electricians, HVAC, handymen, cleaning, general contractors) with quick contact integration.
- **Executive Dashboard:** Live portfolio KPIs including occupancy rates, monthly rent collection breakdowns (collected, outstanding, overdue), open work orders, and 30-day lease expiration alerts.

### 🤖 Intelligent Features (Roadmap & Reference Synthesis)
- **Conversational Copilot:** Natural language assistant for prospective renters to search listings by budget, commute, lifestyle, and amenities.
- **AI Recommendation Engine:** Gemini-powered ranking with natural language "Why this matches" explanations.
- **Multimodal Maintenance Triage:** Computer vision image triage categorizing damage photos and estimating severity.
- **Grounded Lease Q&A (RAG):** Context-aware question answering grounded in active lease terms.

---

## 2. Technology Stack

- **Frontend:** [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling & UI:** [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI primitives](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
- **Backend / API:** [Hono v4](https://hono.dev/) running on [Cloudflare Workers](https://workers.cloudflare.com/) edge runtime
- **Database:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (Serverless SQLite with full ACID relational integrity)
- **Package Manager:** [pnpm](https://pnpm.io/) workspace configuration
- **AI Intelligence Layer:** [Google Gemini 2.0 Flash API](https://ai.google.dev/) (multimodal vision and structured JSON outputs)

---

## 3. Quickstart & Local Setup

### Prerequisites
- **Node.js:** `>= 20.0.0` (Verified on Node `v24.20.0`)
- **pnpm:** `>= 9.0.0` (Verified on pnpm `12.15.0`)
- **Git:** `>= 2.40.0`

### Step 1: Install Dependencies
```powershell
pnpm install
```

### Step 2: Initialize & Migrate Local D1 Database
Apply the relational schema to the local Cloudflare D1 SQLite database:
```powershell
pnpm db:migrate
```
*Applies 25 DDL commands and automatically seeds initial sample properties, units, and vendors.*

### Step 3: Run the Development Server
```powershell
pnpm dev
```
Runs the Vite frontend and Wrangler Cloudflare Worker API concurrently:
- **Frontend UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8787](http://localhost:8787)
- **API Health Check:** [http://localhost:8787/api/health](http://localhost:8787/api/health)

### Verification Commands
```powershell
pnpm typecheck   # TypeScript compiler check (0 errors)
pnpm build       # Production client bundle compilation (Vite)
```

For comprehensive PowerShell instructions and troubleshooting, see [docs/SETUP_AND_RUN.md](docs/SETUP_AND_RUN.md).

---

## 4. Repository Structure

```
OpenProperty/
├── src/
│   ├── client/                      # React 19 Single Page Application
│   │   ├── components/              # UI components
│   │   │   ├── dashboard/           # Portfolio KPIs & monthly cashflow
│   │   │   ├── leases/              # Lease manager & modals
│   │   │   ├── maintenance/         # Work orders board & vendor dispatch
│   │   │   ├── properties/          # Properties & units management
│   │   │   ├── rent/                # Monthly rent ledger & payment dialogs
│   │   │   ├── settings/            # Vendor directory & late-fee policies
│   │   │   ├── tenants/             # Tenant directory & profile views
│   │   │   └── ui/                  # Radix UI and design system primitives
│   │   ├── hooks/                   # use-router.ts (pushState), use-app-state.ts
│   │   ├── lib/                     # Color tokens, date/currency utilities
│   │   ├── api.ts                   # Fetch API wrapper
│   │   ├── app.tsx                  # Top-level shell with Nestara AI navigation
│   │   ├── main.tsx                 # React client entry point
│   │   └── styles.css               # Tailwind CSS v4 design tokens
│   └── server/                      # Cloudflare Workers & Hono backend
│       ├── db.ts                    # D1 query execution wrapper
│       ├── index.ts                 # 43 REST endpoints and auto-seeding logic
│       └── schema.sql               # 11 D1 relational tables & index definitions
├── docs/                            # Comprehensive System Documentation Suite
│   ├── REPOSITORY_AUDIT.md          # In-depth audit of all repositories
│   ├── FEATURE_MATRIX.md            # 22-feature comparison matrix & reuse decisions
│   ├── ARCHITECTURE.md              # Current vs Target Architecture with diagrams
│   ├── PROJECT_STATUS.md            # Authoritative progress tracking & validation
│   ├── IMPLEMENTATION_ROADMAP.md    # Prioritized engineering roadmap
│   ├── SETUP_AND_RUN.md             # PowerShell setup and run instructions
│   ├── UPSTREAM_ATTRIBUTION.md      # Legal attribution, licenses, & compliance
│   └── CHANGELOG.md                 # Chronological log of changes and verifications
├── package.json                     # Scripts and dependencies
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Vite build configuration
├── wrangler.toml                    # Cloudflare Workers & D1 local database binding
└── LICENSE                          # MIT License
```

---

## 5. Documentation Index

The complete architectural, compliance, and engineering documentation is maintained in the `docs/` directory:

- 🤝 [Developer Onboarding & Friend Handover](docs/FRIEND_HANDOFF.md) — Comprehensive guide for incoming developers and next steps.
- 📋 [Repository Audit](docs/REPOSITORY_AUDIT.md) — Factual analysis of the primary repository and archive manifest.
- 📊 [Feature Matrix](docs/FEATURE_MATRIX.md) — 22-feature comparison and clean-room implementation decisions.
- 🏛️ [System Architecture](docs/ARCHITECTURE.md) — Baseline vs. Target architecture with Mermaid diagrams.
- 📌 [Project Status](docs/PROJECT_STATUS.md) — Authoritative progress registry, empirical verification results, and completion metrics.
- 🗺️ [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) — Phased engineering tasks and acceptance criteria.
- ⚙️ [Setup & Run Guide](docs/SETUP_AND_RUN.md) — Complete Windows PowerShell commands and troubleshooting.
- ⚖️ [Upstream Attribution](docs/UPSTREAM_ATTRIBUTION.md) — Open-source licensing analysis and copyright attribution.
- 📝 [Changelog](docs/CHANGELOG.md) — Record of modifications and verification steps.

---

## 6. Upstream Attribution & License

Nestara AI's primary application is derived from MIT-licensed OpenProperty, and the original copyright and license notice are preserved. The reviewed reference repositories were not incorporated as source code. Third-party dependency licenses and applicable notices must still be respected.

- The original OpenProperty copyright notice and MIT license are preserved in full in [`LICENSE`](LICENSE).
- All upstream rights are acknowledged. For comprehensive details regarding reference repositories, third-party dependency licensing, and clean-room implementation boundaries, refer to [docs/UPSTREAM_ATTRIBUTION.md](docs/UPSTREAM_ATTRIBUTION.md).

```
MIT License
Copyright (c) 2026 Clawnify
```
