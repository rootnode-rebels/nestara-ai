# Nestara AI — Digital Property Rental & Intelligence System

> **Find Better. Match Smarter. Manage Seamlessly.**

Nestara AI is an enterprise-grade property operating system that bridges the gap between property managers, current residents, and prospective home seekers. Built on modern edge-first architecture, it unifies back-office landlord operations, public listing discovery, mathematical AI recommendations, and tenant self-service under a single, cohesive, self-hostable platform.

---

## 🌟 Key Capabilities

### 🔍 1. Public Renter Discovery & AI Matching
- **Public Property Discovery (`/explore`):** Browse all vacant residential and commercial listings with real-time filters for rent range, bedrooms, bathrooms, and property type.
- **AI Recommendation Engine:** High-dimensional vector cosine similarity matching that evaluates renter budget, bedroom/bathroom ratio, square footage, and property style to calculate weighted match percentages (e.g. *95% Match*).
- **Match Insights ("Why this matches"):** Transparent, plain-English explanations highlighting why a specific property matches the renter's lifestyle and budget.
- **Side-by-Side Comparison Matrix:** Compare candidate properties across price-per-square-foot efficiency, layout density, and amenities to make confident decisions.
- **Online Application Submission:** Digital leasing applications capturing applicant employment, monthly income, move-in target dates, and personal notes.

### 🏠 2. Tenant Self-Service Portal (`/portal`)
- **Active Lease Overview:** Real-time visibility into monthly rent amounts, lease start/end dates, and payment status.
- **Rent Tracking & Invoicing:** Immediate inspection of rent charges and recorded payment history.
- **1-Click Maintenance Work Orders:** Log repair tickets categorized by trade (plumbing, electrical, HVAC, general) with urgency levels (`urgent`, `high`, `normal`, `low`) and notes.
- **Live Ticket Status Tracking:** Follow repair tickets from `reported` → `assigned` → `in_progress` → `completed`.

### 🏢 3. Landlord Command Center & Portfolio Operations
- **Executive Portfolio KPIs:** Real-time occupancy rate, total buildings/units, 30-day lease expiration alerts, and open maintenance count.
- **Multi-Building & Unit Management:** Track single-family, multi-family, condo, townhouse, and commercial properties with custom color tags.
- **Tenant & Lease Directory:** Centralized profiles, emergency contacts, co-signers, and custom lease terms (rent due day, security deposits, late fee grace periods).
- **Rent Ledger & Cashflow:** Idempotent 1-click monthly charge generation, period navigation, and multi-channel payment logging (ACH, credit, cash, check).
- **Vendor Directory:** Trade categorization (plumbers, electricians, HVAC, handymen, cleaning) with quick dispatch contacts.

---

## 🛡️ Enterprise Security Hardening (OWASP-Aligned)

Nestara AI has undergone a full security audit and implemented defense-in-depth protections across every architectural layer:

| Security Domain | Mechanism & Implementation |
|---|---|
| **Cryptographic Authentication** | Passwords hashed using native Web Crypto **PBKDF2-HMAC-SHA256** with 100,000 iterations, unique 16-byte cryptographically random salts, and constant-time buffer comparison. |
| **Role-Based Access Control (RBAC)** | Strict endpoint segregation protecting back-office mutations (`POST`, `PUT`, `DELETE`) and sensitive financial/tenant ledgers (`/api/tenants`, `/api/leases`, `/api/payments`) with `landlord` or `admin` authorization. |
| **Token Versioning & Revocation** | Eliminates stateless JWT revocation vulnerabilities via database-tracked `token_version`. Invoking `/api/auth/logout` increments the version, instantly invalidating active sessions. |
| **XSS-Resistant Cookie Transport** | Client token storage avoids insecure `localStorage` persistence, relying on `HttpOnly; SameSite=Lax` cookies with `credentials: "same-origin"` and in-memory authorization. |
| **Edge Sliding-Window Rate Limiting** | Dynamic rate limiter applied to sensitive endpoints: `/api/auth/login` (10 req/5m), `/api/auth/register` (10 req/5m), and `/api/public/apply` (15 req/30m) with `Retry-After` headers. |
| **Timing Attack Mitigation** | Equalized PBKDF2 calculation cost on login/registration lookups using dummy derivations to prevent user email enumeration. |
| **Relational Integrity** | Mandatory `PRAGMA foreign_keys = ON;` execution guaranteeing cascade deletes and relational referential integrity. |
| **Hardened HTTP Headers & CORS** | Automated injection of HSTS, `X-Frame-Options: DENY` (clickjacking defense), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and strict CORS policies. |

---

## 💻 Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | [React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/) | Type-safe, component-driven reactive user interface |
| **Build & Tooling** | [Vite 6](https://vitejs.dev/) | Sub-second HMR, tree-shaking, and optimized production chunking |
| **Styling & UI Primitives** | [Tailwind CSS Design Tokens](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/) | Accessible, responsive, mobile-first design with theme tokens |
| **Icons** | [Lucide React](https://lucide.dev/) | Clean, consistent SVG icon system |
| **Edge API Framework** | [Hono v4](https://hono.dev/) | Ultrafast, lightweight edge web standard router (<15KB) |
| **Database Engine** | [Cloudflare D1](https://developers.cloudflare.com/d1/) / [SQLite](https://sqlite.org/) | Serverless relational database with ACID compliance |
| **Schema Validation** | [Zod](https://zod.dev/) | Runtime boundary type validation and payload parsing |
| **Cryptography** | [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) | Hardware-accelerated PBKDF2-HMAC-SHA256 password hashing |
| **Package Manager** | [pnpm](https://pnpm.io/) | Fast, disk-efficient workspace dependency management |

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js:** `>= 20.0.0` (Tested on Node `v24.19.0`)
- **Package Manager:** `npm` (bundled with Node.js) or `pnpm` (`>= 9.0.0`)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/rootnode-rebels/nestara-ai.git
cd nestara-ai
npm install   # or: pnpm install
```

### 2. Initialize the Database
Initialize the SQLite / D1 relational schema and seed default settings:
```bash
npm run db:migrate   # or: pnpm db:migrate
```
*Applies relational tables, foreign key constraints, and seeds initial demo properties, units, and vendors.*

### 3. Start the Development Server
```bash
npm run dev   # or: pnpm dev
```
The application will boot concurrently:
- **Frontend Web UI:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8787](http://localhost:8787)
- **Health Check:** [http://localhost:8787/api/health](http://localhost:8787/api/health)

### Default Demo Credentials
When the database initializes, an initial portfolio manager account is provisioned:
- **Email:** `demo@nestara.ai`
- **Password:** `Password123!`
- **Role:** `landlord`

*(You can also register new landlord or tenant accounts directly from the UI).*

### 4. Verification & Testing
```bash
pnpm typecheck   # Validates TypeScript compilation with zero errors
pnpm build       # Bundles client assets for production via Vite
```

---

## 📂 Repository Structure

```
nestara-ai/
├── src/
│   ├── client/                      # React 18 Single Page Application
│   │   ├── components/              # UI components
│   │   │   ├── auth/                # Login, registration modal & user navigation
│   │   │   ├── dashboard/           # Portfolio KPIs & monthly cashflow
│   │   │   ├── leases/              # Lease agreements & renewal dialogs
│   │   │   ├── maintenance/         # Work orders board & vendor dispatch
│   │   │   ├── properties/          # Properties & units management
│   │   │   ├── public/              # Public listings (/explore), AI matcher, compare & apply modals
│   │   │   ├── rent/                # Monthly rent ledger & payment dialogs
│   │   │   ├── settings/            # Vendor directory & late-fee policies
│   │   │   ├── tenant/              # Tenant self-service portal (/portal)
│   │   │   ├── tenants/             # Tenant directory & profile views
│   │   │   └── ui/                  # Radix UI and design system primitives
│   │   ├── hooks/                   # use-auth.ts, use-router.ts, use-app-state.ts
│   │   ├── lib/                     # Color tokens, date/currency utilities
│   │   ├── api.ts                   # Fetch API client with HttpOnly cookie transport
│   │   ├── app.tsx                  # Top-level shell with RBAC navigation & routing
│   │   ├── main.tsx                 # React client entry point
│   │   ├── styles.css               # Design system & CSS custom properties
│   │   └── types.ts                 # Shared TypeScript entity definitions
│   └── server/                      # Hono Edge Backend & Cloudflare D1
│       ├── ai.ts                    # Vector embedding & cosine similarity algorithms
│       ├── auth.ts                  # PBKDF2 crypto, JWT issuance, RBAC & token revocation
│       ├── db.ts                    # D1 query execution wrapper
│       ├── index.ts                 # REST API endpoints, RBAC middleware & rate limiter
│       └── schema.sql               # Relational D1 schema & index definitions
├── docs/                            # Comprehensive System Documentation Suite
│   ├── ARCHITECTURE.md              # Technical architecture & component topology
│   ├── CHANGELOG.md                 # Chronological log of modifications
│   ├── FEATURE_MATRIX.md            # Comprehensive feature breakdown
│   ├── FRIEND_HANDOFF.md            # Developer onboarding & handoff notes
│   ├── IMPLEMENTATION_ROADMAP.md    # Phased engineering roadmap
│   ├── PROJECT_STATUS.md            # Authoritative progress registry
│   ├── REPOSITORY_AUDIT.md          # Upstream baseline audit
│   ├── SETUP_AND_RUN.md             # PowerShell setup and run instructions
│   └── UPSTREAM_ATTRIBUTION.md      # Licensing & legal attribution
├── package.json                     # Scripts and dependencies
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Vite build configuration
├── wrangler.toml                    # Cloudflare Workers & D1 local database binding
└── LICENSE                          # MIT License
```

---

## 📚 Documentation Index

The complete architectural, compliance, and engineering documentation is maintained in the `docs/` directory:

- 🏛️ [System Architecture](docs/ARCHITECTURE.md) — Technical topology, edge routing, and data models.
- 📊 [Feature Matrix](docs/FEATURE_MATRIX.md) — In-depth breakdown of portfolio, public discovery, and AI capabilities.
- 📌 [Project Status](docs/PROJECT_STATUS.md) — Progress registry, security audit resolutions, and verification metrics.
- 🗺️ [Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md) — Engineering phases and acceptance criteria.
- ⚙️ [Setup & Run Guide](docs/SETUP_AND_RUN.md) — Setup and deployment instructions.
- 🤝 [Developer Onboarding & Handover](docs/FRIEND_HANDOFF.md) — Onboarding guide for incoming developers.
- ⚖️ [Upstream Attribution](docs/UPSTREAM_ATTRIBUTION.md) — Open-source licensing analysis and copyright attribution.
- 📝 [Changelog](docs/CHANGELOG.md) — Complete record of releases and verification steps.

---

## 📄 License & Attribution

Nestara AI is open-source software licensed under the [MIT License](LICENSE).

```
MIT License
Copyright (c) 2026 Nestara AI Contributors
```
