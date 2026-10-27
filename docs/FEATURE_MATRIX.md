# Feature Comparison Matrix — Nestara AI

**Date:** October 22, 2026  
**Auditor:** Senior Software Architect  
**Objective:** Compare features required by Nestara AI against the current baseline implementation and archived reference projects, define reuse decisions, and delineate remaining engineering work.

---

## 1. Master Feature Comparison Table

| Feature | OpenProperty (Core Base) | Source Reference (Archived) | Existing Implementation in Reference | Reuse Decision for Nestara AI | Remaining Engineering Work |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Property & Unit Management** | **COMPLETE** (CRUD for buildings & units, beds/baths/sqft, status, occupancy snapshot) | `Real_estate_portfolio_management_system` & `EstateFlow-server` | Relational tables for properties, units, amenities, price history | **RETAIN Core**; enrich schema with amenities & gallery images | Add image attachment arrays, amenities checkboxes, and neighborhood details to D1 schema. |
| **Public Property Listings** | **NOT IMPLEMENTED** (Back-office only) | `EstateFlow-client` (`src/routes/listings.tsx`) | Public listings grid, property cards with badges, price tags, pagination | **INDEPENDENT ADAPTATION** (clean-room reimplementation) | Build public `/explore` and `/listings` routes in client using Tailwind v4 and Lucide icons; add public read-only API `/api/public/properties`. |
| **Property Search & Filters** | **NOT IMPLEMENTED** | `EstateFlow-client` (`src/components/FilterSidebar.tsx`) | Price sliders, bedroom/bathroom selectors, property type, location filters | **INDEPENDENT ADAPTATION** | Implement client-side filter sidebar and query parameters (`?city=&minRent=&maxRent=&beds=`). |
| **AI Property Recommendations** | **NOT IMPLEMENTED** | `EstateFlow-server` (`src/services/ai.service.ts`) & `property-recommendation` | Gemini API prompt with property catalog returning JSON recommendations + explanations | **INDEPENDENT ADAPTATION** | Create `/api/ai/recommend` Hono endpoint integrating Gemini 1.5/2.0 API with structured output schema. |
| **Rent Price Estimation** | **NOT IMPLEMENTED** | `additional-research/rent-prediction` & `property-recommendation` | Python Scikit-Learn/CatBoost regression on sqft, bedrooms, locality | **INDEPENDENT ADAPTATION** | Implement lightweight rent estimation formula or Gemini prompt predicting fair market rent based on local comps. |
| **Tenant Management & Onboarding** | **PARTIAL** (Manual landlord entry in `src/client/components/tenants/`) | `EstateFlow-client` (`src/routes/register-form.tsx`) & `RentEase` | Public registration forms, password hashing, verification tokens | **EXTEND Core** with self-service tenant registration | Add user accounts table in D1; create public sign-up and tenant onboarding portal view. |
| **Owner and Tenant Portals** | **NOT IMPLEMENTED** (Unified landlord dashboard) | `EstateFlow-client` (`src/routes/user-dashboard.tsx`) | Dedicated client dashboard for saved listings and submitted requests | **NEW IMPLEMENTATION** in Core | Implement role-aware route guards; render tenant view (my lease, pay rent, submit ticket) vs landlord view. |
| **Authentication & Access Control** | **NOT IMPLEMENTED** (Single-user assumption) | `EstateFlow-server` (`src/middleware/requireUserWithRole.middleware.ts`) & `RentEase` | JWT tokens, bcrypt password hashing, role checks (`admin`, `landlord`, `tenant`) | **INDEPENDENT ADAPTATION** | Integrate `hono/jwt` with Web Crypto API (`SubtleCrypto` / `bcrypt` via WebAssembly or argon2/PBKDF2) for Cloudflare Workers compatibility. |
| **Lease & Document Management** | **COMPLETE** (Creation, term dates, rent/deposit/due day/late fee, multi-tenant link) | `RentEase` (`backend/ai/lease_index.py`) & `LeaseBook` (AGPL-3.0 copyleft) | PDF upload, text parsing with `pdfplumber` | **RETAIN Core**; strictly zero code from LeaseBook (AGPL-3.0 copyleft isolation); add PDF document storage | Add Cloudflare R2 object binding or document URL link column to leases table for digital contracts. |
| **AI Document Extraction** | **NOT IMPLEMENTED** | `additional-research/ai-lease-parser` | Regex and NLP entity extraction from lease agreements | **INDEPENDENT ADAPTATION** | Pass uploaded lease PDF to Gemini multimodal API to auto-extract tenant names, rent amounts, and start/end dates into lease dialog. |
| **Rent Collection & Payment Tracking** | **COMPLETE** (Idempotent 1-click monthly charge generation, period navigation, payments) | `Real_estate_portfolio_management_system` (`procedures.sql`) | MySQL stored procedure `generate_monthly_rent()` | **RETAIN Core** (Superior Hono/D1 implementation) | Add automated scheduled Cron Trigger (`scheduled()` in Cloudflare Worker) to auto-generate charges on 1st of month. |
| **Online Payment Processing** | **NOT IMPLEMENTED** (Ledger records only) | `EstateFlow-server` (`src/services/paypal.service.ts`) | PayPal REST API webhooks and order creation | **FUTURE PHASE** (Stripe / PayPal API integration) | Integrate Stripe Checkout / Elements or PayPal SDK for direct ACH/card processing with automatic webhook reconciliation. |
| **Maintenance & Vendor Management** | **COMPLETE** (Work orders board, urgent/high/normal priority, vendor dispatch, cost tracking) | `RentEase` (`backend/controllers/maintenance_ai.py`) | Tenant ticket submission with image upload and AI triage | **RETAIN Core**; add tenant ticket submission & image upload | Enable tenants to submit work orders from their portal; add image upload support. |
| **Property Inspection & Checklists** | **NOT IMPLEMENTED** | `additional-research/property-inspector` | Inspection forms with room-by-room condition checks and photos | **INDEPENDENT ADAPTATION** | Add `inspections` table linked to units; create move-in/move-out checklist UI with photo uploads. |
| **AI Maintenance Image Triage** | **NOT IMPLEMENTED** | `RentEase` (`backend/ai/vision_service.py`) | OpenCV edge detection & heuristic damage scoring | **INDEPENDENT ADAPTATION** | Pass uploaded ticket images to Gemini 1.5/2.0 Flash multimodal API for automated damage triage and priority recommendation. |
| **AI Assistant (Conversational Copilot)** | **NOT IMPLEMENTED** | `EstateFlow-client` (`ChatInterface.tsx`) & `PropMind` (Proprietary educational license) | Real-time chat widget querying LLM with property context | **INDEPENDENT ADAPTATION** (Clean-room implementation; zero code/prompts from PropMind) | Build floating conversational assistant widget in React and streaming Hono endpoint connected to Gemini. |
| **Notifications & Alerts** | **PARTIAL** (Dashboard badge counts for overdue rent & expiring leases) | `EstateFlow-server` & `additional-research/northstar-alerts` | Nodemailer SMTP alerts for rent due, ticket updates, lease expiry | **INDEPENDENT ADAPTATION** | Add notification tray in UI and integrate Resend or SendGrid email API via Hono fetch for transactional alerts. |
| **Reporting & Analytics** | **COMPLETE** (Occupancy rate, rent collected/outstanding/overdue, upcoming expirations) | `Real_estate_portfolio_management_system` (`aggregate_queries.sql`) | Deep financial metrics (NOI, cap rate, expense ratios) | **RETAIN Core** & add portfolio financial charts | Add visual line/bar charts (e.g. Recharts or lightweight SVG) for multi-month revenue trends. |
| **Data Security & Validation** | **COMPLETE in Core** (Zod request validation, D1 parameterized queries preventing SQLi) | `EstateFlow-server` & `Real_estate_portfolio_management_system` | express-validator, parameterized SQL queries | **RETAIN Core**; add auth middleware | Introduce session validation middleware on all private `/api/*` routes. |
| **Tests & Deployment Readiness** | **PARTIAL** (Passing typecheck, production Vite build, D1 migrations verified; no automated unit tests) | `RentEase` (`backend/tests/test_auth.py`, `test_crud.py`) | Pytest test suite for backend CRUD | **NEW TESTS REQUIRED** | Add Vitest suite for Hono API routes and React client components. |

---

## 2. Deep-Dive Specification for Selected Reference Features

### 2.1 AI Property Copilot & Conversational Search
- **Origin Reference:** `EstateFlow-client` (`src/components/ChatInterface.tsx`) & `EstateFlow-server` (`src/services/ai.service.ts`)
- **Licensing Constraint:** Unlicensed upstream. Clean-room TypeScript implementation required.
- **Target Implementation in Nestara AI:**
  - Create `src/client/components/ai/chat-copilot.tsx` as a floating conversational drawer.
  - Implement `src/server/ai.ts` using Google Gemini 2.0 Flash via standard fetch.
  - Endpoint: `POST /api/ai/chat` passing user inquiry + current available units catalog.
- **Dependencies:** None required beyond existing native `fetch` in Cloudflare Workers.
- **Test Requirements:** Unit test prompt construction and verify handling of empty unit catalogs and malformed LLM responses.

### 2.2 Maintenance Image Damage Triage
- **Origin Reference:** `RentEase-Smart-Rental-Manager` (`backend/ai/vision_service.py`)
- **Licensing Constraint:** README references MIT, but no LICENSE file committed; heavy PyTorch/OpenCV stack unsuitable for edge deployment.
- **Target Implementation in Nestara AI:**
  - Add image attachment field in `work_orders` dialog.
  - Add `POST /api/ai/triage-maintenance` endpoint in Hono.
  - Forward base64-encoded image to Gemini 1.5/2.0 Flash with prompt:
    `"Analyze this property damage photo. Identify category (plumbing, structural, electrical, cosmetic), severity (urgent, high, normal, low), and suggested repair action. Return strictly JSON."`
  - Automatically populate priority and description in work order form.
- **Dependencies:** Native Cloudflare Workers fetch + Google Gemini API key.
- **Test Requirements:** Mock Gemini API responses for varying severity levels; test fallback behavior when API is offline.

### 2.3 Semantic Lease Q&A (RAG) & Document Extraction
- **Origin Reference:** `RentEase-Smart-Rental-Manager` (`backend/ai/lease_index.py`) & `additional-research/ai-lease-parser`
- **Licensing Constraint:** Python stack unsuitable for edge. Clean-room TypeScript implementation required.
- **Target Implementation in Nestara AI:**
  - Store extracted lease clause text in D1 database `lease_clauses` table.
  - For tenant inquiries regarding pet policies, subletting, or late penalties, perform Gemini-based grounded document search.
- **Dependencies:** Native fetch.
- **Test Requirements:** Validation of grounded answers versus hallucinations against sample lease clauses.

### 2.4 User Authentication & Multi-Role Permissions
- **Origin Reference:** `EstateFlow-server` (`src/middleware/auth.middleware.ts`) & `RentEase` (`backend/controllers/auth_controller.py`)
- **Licensing Constraint:** Clean-room implementation in Hono.
- **Target Implementation in Nestara AI:**
  - D1 Table: `users (id, email, password_hash, role ['admin', 'landlord', 'tenant', 'vendor'], tenant_id FK, created_at)`.
  - Hono middleware: `verifyAuth()` using `hono/jwt` with HTTP-only secure cookie or Authorization Bearer header.
  - Client state: `useAuth()` hook managing current session and conditional navigation links.
- **Dependencies:** `hono/jwt` (built into Hono), Web Crypto API (`crypto.subtle`).
- **Test Requirements:** Automated tests for login, token verification, role elevation prevention, and protected route rejection.
