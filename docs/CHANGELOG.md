# Changelog — Nestara AI

All notable changes to the Nestara AI project during repository organization, cleanup, and development are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] - 2026-10-22

### Added
- **Developer Onboarding Master Guide (`docs/FRIEND_HANDOFF.md`):** Complete practical guide for incoming developers covering project scope, tech stack, verified features, exact startup commands, directory tour, how to add frontend/backend/schema changes, troubleshooting, Git publishing workflow, and next tasks.
- **External Reference Archive (`C:\Projects\Nestara-AI-Reference-Archive`):** Safely archived all 16 non-production reference repositories (`EstateFlow-client`, `EstateFlow-server`, `RentEase-Smart-Rental-Manager`, `Real_estate_portfolio_management_system`, `property-rental-management-system`, and 11 research subprojects in `additional-research/`) outside the product workspace while preserving their full source trees and `.git` commit histories.
- **Complete System Documentation Suite in `OpenProperty/docs/`:**
  - `docs/FRIEND_HANDOFF.md`: Comprehensive onboarding and developer handoff manual.
  - `docs/PROJECT_STATUS.md`: Authoritative progress tracking, feature registry with evidence, and validation logs.
  - `docs/REPOSITORY_AUDIT.md`: In-depth empirical audit of primary repository and full archive manifest.
  - `docs/FEATURE_MATRIX.md`: 22-feature comparison matrix with reuse decisions and clean-room implementation guidelines.
  - `docs/ARCHITECTURE.md`: Baseline vs Target architecture specifications with Mermaid sequence and ER diagrams.
  - `docs/IMPLEMENTATION_ROADMAP.md`: Prioritized 6-phase engineering roadmap with acceptance criteria.
  - `docs/SETUP_AND_RUN.md`: Verified Windows PowerShell installation, database migration, and runtime guide.
  - `docs/UPSTREAM_ATTRIBUTION.md`: Full legal attribution, license audit, and compliance rules.
  - `docs/CHANGELOG.md`: Chronological log of modifications, validations, and known limitations.

### Changed
- **Licensing Audit Corrections & Precise Posture (Verified October 22, 2026):**
  - Clarified licensing posture across all documentation: Nestara AI's primary application is derived from MIT-licensed OpenProperty, and the original copyright and license notice are preserved. The reviewed reference repositories were not incorporated as source code. Third-party dependency licenses and applicable notices must still be respected.
  - `openkos` (`senatroxx/openkos`): Corrected license record from MIT to **Apache-2.0** (Apache License Version 2.0).
  - `LeaseBook` (`jwh3times/LeaseBook`): Corrected license record from MIT to **AGPL-3.0** (GNU Affero General Public License v3.0). Documented strict copyleft isolation to prevent AGPL contamination of Nestara AI's MIT codebase.
  - `PropMind` (`panakantinandu/PropMind`): Corrected license record from MIT to **Proprietary / Educational-only**. Documented that commercial use, redistribution, sublicensing, or selling is strictly prohibited without explicit written permission from the author.
  - Updated `README.md`, `docs/FRIEND_HANDOFF.md`, `docs/REPOSITORY_AUDIT.md`, `docs/UPSTREAM_ATTRIBUTION.md`, and `docs/FEATURE_MATRIX.md` to reflect these verified terms and maintain clean-room compliance.
- **Workspace Containment:** Cleared the active workspace `C:\Projects\Nestara AI` so it contains exclusively the primary product Git repository: `OpenProperty/`. Removed redundant top-level workspace README.
- **User-Facing Branding in `OpenProperty/`:**
  - `OpenProperty/src/client/app.tsx`: Updated `<AppNav title="Nestara AI" />` to render the official product name in the navigation rail.
  - `OpenProperty/index.html`: Updated `<title>` to `"Nestara AI — Intelligent Property & Rental Management System"` and updated meta descriptions with the tagline *"Find Better. Manage Smarter. Live Easier."*.
  - `OpenProperty/manifest.json`: Updated metadata fields to Nestara AI.
  - `OpenProperty/clawnify.json`: Updated platform manifest to Nestara AI.
  - `OpenProperty/README.md`: Upgraded into a complete, self-contained product README describing Nestara AI while preserving upstream MIT copyright notices to Clawnify.
- **Git & Publication Protection:**
  - `OpenProperty/.gitignore`: Enhanced to explicitly ignore `.env`, `.env.*`, `.dev.vars`, `.wrangler/`, `dist/`, and local caches, ensuring no local database files or credentials can be accidentally committed.

### Removed
- **Obsolete Manifest References:**
  - `OpenProperty/manifest.json`: Removed stale reference to non-existent `"src/client/components/sidebar.tsx"`.

### Validation Performed
- **TypeScript Typecheck:** Executed `pnpm typecheck` (`tsc --noEmit`) in `OpenProperty/` — **0 errors**.
- **Production Bundle Build:** Executed `pnpm build` (`vite build`) in `OpenProperty/` — **6,397 modules transformed into `dist/` with zero errors in 15.58s**.
- **Database Migrations:** Executed `pnpm db:migrate` via Wrangler D1 — **25 DDL commands applied successfully to local SQLite**.
- **Live Runtime Testing:** Launched `wrangler dev --port 8787` and verified endpoints `GET /api/health`, `GET /api/properties`, and `GET /api/dashboard/summary` via PowerShell `Invoke-RestMethod`.
- **Archive Integrity:** Verified that all 16 projects in `C:\Projects\Nestara-AI-Reference-Archive` retain valid `.git` directories and intact source files.

### Known Limitations
- The core application currently runs in single-user landlord mode; user authentication and role-based permissions are planned for Phase 2.
- Public listing exploration and conversational AI copilot widgets are designed in architecture and scheduled for Phase 3 and Phase 5.
- Automated unit test runner (Vitest) is not yet configured in `package.json` (tracked as Task T6.1).
