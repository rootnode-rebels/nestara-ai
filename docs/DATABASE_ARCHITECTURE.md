# Nestara AI — Enterprise Database & Personal Data Security Blueprint

## 1. Executive Summary & Decision

To protect highly confidential resident information (such as personal phone numbers, emails, identity documents, declared monthly incomes, employer names, rental agreements, and payment history), Nestara AI adopts **PostgreSQL with native Row-Level Security (RLS) via Supabase or Neon**.

### Why Not Pure Edge SQLite (Cloudflare D1) for Personal FinTech / Real Estate Data?
| Dimension | Cloudflare D1 (Current Local Default) | PostgreSQL + Supabase / Neon (Adopted Standard) |
| :--- | :--- | :--- |
| **Data Privacy (RLS)** | None native. Every check depends entirely on application code. | **Kernel-Enforced RLS**. Queries cannot leak another tenant's row even if code has a bug. |
| **Encryption at Rest** | Unencrypted plaintext SQLite pages. | **AES-256 Transparent Data Encryption (TDE)** + SSL transit. |
| **Financial Ledger Integrity** | Eventual consistency across edge read replicas. | **Strict ACID Transactions** preventing duplicate rent payments. |
| **AI Matching Engine** | Calculates cosine similarity in JavaScript RAM. | **Native `pgvector`** with HNSW/IVFFlat indexes directly inside SQL. |
| **Disaster Recovery** | Manual backup snapshots. | **Continuous Point-in-Time Recovery (PITR)** with WAL archiving. |

---

## 2. Row-Level Security (RLS) Policy Specifications

The schema is defined in [`src/server/supabase-schema.sql`](file:///d:/projects/nestaraai/Nestara-AI-main/src/server/supabase-schema.sql).

### A. Rental Applications (High PII Exposure)
* **Threat Model:** Competitors, scraped bots, or other applicants downloading financial disclosures, monthly salary slips, or contact info of applicants.
* **RLS Rule:**
  * Anyone can submit an application via public discovery (`INSERT WITH CHECK (true)`).
  * Only landlords/admins and the individual verified applicant can execute `SELECT`.
  * External visitors and other applicants receive 0 rows (`WHERE 1=0`).

### B. Tenants & Lease Ledger Isolation
* **Threat Model:** Insecure Direct Object Reference (IDOR) attacks where Tenant A modifies URL to view Tenant B's rent balance or personal address.
* **RLS Rule:**
  * `primary_tenant_id = auth_current_tenant_id()` is enforced at the database layer.
  * Tenant payments can only be credited to rent charges belonging to their active lease.

---

## 3. Dual-Mode Database Strategy

1. **Development Mode (Zero-Config Local):**
   * Uses local SQLite / D1 with schema [`src/server/schema.sql`](file:///d:/projects/nestaraai/Nestara-AI-main/src/server/schema.sql).
   * Fast, offline, requires no external cloud keys.
2. **Staging & Production Mode (Enterprise Compliant):**
   * Uses PostgreSQL (Supabase / Neon) with [`src/server/supabase-schema.sql`](file:///d:/projects/nestaraai/Nestara-AI-main/src/server/supabase-schema.sql).
   * Connection string configured via `DATABASE_URL` environment secret.
   * `pgvector` enabled for vector similarity.

---

## 4. Security Audit Checklist (Passed)
- [x] **OWASP Top 10 A01 (Broken Object-Level Authorization):** Strict tenant isolation on `/api/tenant/portal`, `/api/tenant/work-orders`, and `/api/tenant/payments`.
- [x] **OWASP Top 10 A03 (Injection):** SQL `ESCAPE '\\'` on wildcard searches; parameterized queries across all endpoints.
- [x] **OWASP Top 10 A04 (Insecure Design):** PBKDF2 with 100,000 iterations and CSPRNG salt; constant-time byte comparisons against timing attacks.
- [x] **OWASP Top 10 A05 (Security Misconfiguration):** HSTS (`max-age=31536000`), X-Frame-Options `DENY`, X-Content-Type-Options `nosniff`.
- [x] **DoS Protection:** Strict payload size limits (5MB base64 ceiling on AI multimodal triage).
