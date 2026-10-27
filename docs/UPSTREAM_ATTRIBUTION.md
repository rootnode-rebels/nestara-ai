# Upstream Attribution & Licensing Register — Nestara AI

**Date:** October 22, 2026  
**Auditor:** Senior Software Architect & Repository Auditor  
**Primary Product Repository:** `OpenProperty` (`C:\Projects\Nestara AI\OpenProperty`)  
**Reference Archive Location:** `C:\Projects\Nestara-AI-Reference-Archive`  

---

## 1. Compliance Principles & Policy

Nestara AI's primary application is derived from MIT-licensed OpenProperty, and the original copyright and license notice are preserved. The reviewed reference repositories were not incorporated as source code. Third-party dependency licenses and applicable notices must still be respected.

Key compliance rules:
1. **Upstream Attribution Preservation:** All original copyright notices, license texts, and author attributions from OpenProperty are retained in full in source distributions.
2. **Reference Repositories Isolation:** The reference repositories in `C:\Projects\Nestara-AI-Reference-Archive` were reviewed for architectural and conceptual insights only; no source code or assets from these repositories have been incorporated into Nestara AI.
3. **Third-Party Dependency Compliance:** Production dependencies (including React, Hono, Tailwind CSS, Radix UI primitives, Lucide React, Zod, and Phosphor Icons) are governed by their respective individual open-source licenses (primarily MIT and Apache-2.0). All third-party notices and dependency license terms must be respected.
4. **Primary Product Isolation:** `OpenProperty` is the sole production Git repository. All reference materials remain archived externally to prevent accidental inclusion.

---

## 2. Primary Upstream Attribution

### OpenProperty (Direct Foundation)
- **Original Repository:** `https://github.com/clawnify/OpenProperty.git`
- **Original Author / Copyright Holder:** Copyright (c) 2026 Clawnify
- **Branch:** `master`
- **License:** **MIT License** (Fully verified in [`LICENSE`](../LICENSE))
- **Nature of Reuse:** **Direct Source Code Foundation.**
- **Modifications Made by Nestara AI:**
  - Updated application title in `src/client/app.tsx` from "OpenProperty" to "Nestara AI".
  - Updated HTML `<title>` and `<meta name="description">` tags in `index.html`.
  - Updated `manifest.json` and `clawnify.json` metadata with product description and tagline.
  - Removed stale reference to non-existent `sidebar.tsx` in `manifest.json`.
  - Established Nestara AI documentation while retaining upstream MIT copyright header.
- **Attribution Statement:**
  > OpenProperty is licensed under the MIT License by Clawnify. The original license text and copyright notice are preserved in full in [`LICENSE`](../LICENSE).

---

## 3. Archived Reference Repositories (Stored in External Archive)

All reference repositories below reside in `C:\Projects\Nestara-AI-Reference-Archive` and are NOT part of the product git tree.

### 3.1 RentEase-Smart-Rental-Manager
- **Archive Path:** `C:\Projects\Nestara-AI-Reference-Archive\RentEase-Smart-Rental-Manager`
- **Original Repository:** `https://github.com/thanishkabandaru/RentEase-Smart-Rental-Manager.git`
- **Author:** thanishkabandaru
- **License Status:** The README displays an MIT badge, but **no `LICENSE` file exists in the repository**.
- **Nature of Reuse:** **Conceptual & Algorithmic Reference Only (No direct code copying).**
- **Reused Concepts:** Multi-factor damage severity scoring; grounded lease clause Q&A.
- **Implementation:** Written from scratch in TypeScript for Cloudflare Workers using Google Gemini API instead of Python/PyTorch/FAISS.

### 3.2 EstateFlow-client
- **Archive Path:** `C:\Projects\Nestara-AI-Reference-Archive\EstateFlow-client`
- **Original Repository:** `https://github.com/EstateFlow/client.git`
- **Author / Organization:** EstateFlow
- **License Status:** **Unlicensed / Proprietary (No LICENSE file or declaration present).**
- **Nature of Reuse:** **UI/UX Design Patterns Reference Only.**
- **Reused Concepts:** Search filter sidebar layout; conversational property search drawer layout.
- **Implementation:** Independently coded using Nestara AI's existing Tailwind CSS v4 and Radix UI components.

### 3.3 EstateFlow-server
- **Archive Path:** `C:\Projects\Nestara-AI-Reference-Archive\EstateFlow-server`
- **Original Repository:** `https://github.com/EstateFlow/server.git`
- **Author / Organization:** EstateFlow
- **License Status:** **Unlicensed / Proprietary (No LICENSE file or declaration present).**
- **Nature of Reuse:** **System Design & Prompt Engineering Reference Only.**
- **Reused Concepts:** Prompt structure for LLM property recommendation with structured JSON schema.
- **Implementation:** Authored natively as Hono middleware on Cloudflare Workers.

### 3.4 Real_estate_portfolio_management_system
- **Archive Path:** `C:\Projects\Nestara-AI-Reference-Archive\Real_estate_portfolio_management_system`
- **Original Repository:** `https://github.com/chin123k/Real_estate_portfolio_management_system.git`
- **Author:** chin123k
- **License Status:** **Academic Course Project (No open-source license provided).**
- **Nature of Reuse:** **Relational Business Logic Reference Only.**
- **Reused Concepts:** Automated late fee rules; portfolio occupancy calculation formulas.
- **Implementation:** Implemented as pure TypeScript calculation functions within Hono handlers.

### 3.5 property-recommendation (`additional-research/`)
- **Archive Path:** `C:\Projects\Nestara-AI-Reference-Archive\additional-research\property-recommendation`
- **Original Repository:** `https://github.com/newking9088/real_estate_cost_estimation_and_property_recommendation.git`
- **Author:** Nawaraj Paudel
- **License Status:** **MIT License** (Copyright 2024 Nawaraj Paudel, verified in repo)
- **Nature of Reuse:** **Algorithm & Feature Engineering Reference.**
- **Reused Concepts:** Feature importance weighting and content-based property similarity scoring.

### 3.6 Other Archived Research Repositories (Verified October 22, 2026)

Every repository in `C:\Projects\Nestara-AI-Reference-Archive\additional-research` was individually audited against its published terms and LICENSE file on October 22, 2026:

1. **`openkos` (senatroxx/openkos)**
   - **License:** **Apache-2.0** (Apache License, Version 2.0, January 2004)
   - **Terms:** Permissive open-source license requiring attribution, state-change notices, and license inclusion.
   - **Reuse Status in Nestara AI:** **Zero code copied.** Nestara AI implements its own unit and room schemas.
2. **`LeaseBook` (jwh3times/LeaseBook)**
   - **License:** **AGPL-3.0** (GNU Affero General Public License, Version 3, 19 November 2007)
   - **Terms:** **Strong copyleft.** Any network-hosted software incorporating AGPL-3.0 code must make its full source code available under the AGPL-3.0 license.
   - **Reuse Status in Nestara AI:** **STRICTLY ZERO CODE REUSED.** Incorporating AGPL-3.0 code into Nestara AI would contaminate its permissive MIT license. It is preserved strictly as an isolated reference.
3. **`PropMind` (panakantinandu/PropMind)**
   - **License:** **Proprietary / Educational-Only License** (Copyright © 2026 Nandu Panakanti)
   - **Terms:** Explicitly states: *"Permission is hereby granted to view and study this source code for educational and personal learning purposes only. Commercial use, redistribution, sublicensing, or selling of this software or derivative works is strictly prohibited without explicit written permission from the author."*
   - **Reuse Status in Nestara AI:** **STRICTLY ZERO CODE OR PROMPTS REUSED.** Commercial deployment and derivative works are prohibited. Clean-room, independent prompt engineering and TypeScript code are used exclusively.
4. **`ai-lease-parser` (realtonkaa/ai-lease-parser)** — **MIT License** (Copyright 2025 realtonkaa). Zero code copied; Python stack replaced with Cloudflare Worker fetch.
5. **`rent-prediction` (Unknowalive/rent-prediction)** — **MIT License** (Copyright 2026 Rent Prediction Team). Zero code copied.
6. **`property-inspector` (rahuldean/property-inspector)** — **MIT License** (Copyright 2026 Rahul Reddy). Zero code copied.
7. **`listing-platform` (natnael-shiferaw/realestate-listing-platform-react)** — **MIT License** (Copyright 2024 Natnael Shiferaw). Zero code copied.
8. **`northstar-alerts` (readesie/northstar-property-management)** — **MIT License** (Copyright 2026 NorthStar Property Management). Zero code copied.
9. **`PropertyLoop` (Kaos599/PropertyLoop)** — **No license committed.** Zero code copied.
10. **`property-rental-management-system`** — **Corrupted / Empty clone.** Zero code copied.

---

## 4. Master License & Code-Reuse Compliance Matrix

*Audit Date: October 22, 2026*

| Repository | Published License | Code Copied? | Derivative Works? | Compliance Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **OpenProperty** | **MIT License** | **YES** (Core codebase) | YES (Rebranded & extended) | **COMPLIANT** (Permitted under MIT; copyright preserved) |
| **RentEase-Smart-Rental-Manager** | Unverified (MIT badge only, no file) | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **EstateFlow-client** | Unlicensed | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **EstateFlow-server** | Unlicensed | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **Real_estate_portfolio_management_system** | Academic (No license) | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **property-recommendation** | **MIT License** | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **openkos** | **Apache-2.0** | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **LeaseBook** | **AGPL-3.0** (Strong Copyleft) | **NO** | NO | **COMPLIANT** (Isolated in archive; no copyleft contagion) |
| **PropMind** | **Proprietary / Educational** | **NO** | NO | **COMPLIANT** (Isolated in archive; no commercial breach) |
| **ai-lease-parser** | **MIT License** | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **rent-prediction** | **MIT License** | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **property-inspector** | **MIT License** | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **listing-platform** | **MIT License** | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **northstar-alerts** | **MIT License** | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **PropertyLoop** | Unlicensed | **NO** | NO | **COMPLIANT** (Independent clean-room TypeScript) |
| **property-rental-management-system** | None (Empty clone) | **NO** | NO | **COMPLIANT** (No assets utilized) |
