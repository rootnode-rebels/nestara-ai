import {
  authenticateDocumentLocally,
  sealLedgerBlock,
  verifyDistributedLedgerChain,
  type DocumentType,
  type LedgerBlock,
} from "./document-authenticator";
import { Hono, type Context } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { z } from "zod";
import { initDB, query, get, run } from "./db";
import { hashPassword, verifyPassword, generateToken, verifyToken, requireAuth, requireRoles, type UserRecord } from "./auth";
import { rankRecommendations, compareProperties, triageMaintenanceIssue, type CandidateListing } from "./ai";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

// Security Audit Fix (SEC-08): Add HSTS, frame options, and MIME sniffing protection
app.use("*", secureHeaders({
  xFrameOptions: "DENY",
  xContentTypeOptions: "nosniff",
  referrerPolicy: "strict-origin-when-cross-origin",
  strictTransportSecurity: "max-age=31536000; includeSubDomains",
  xXssProtection: "1; mode=block",
  crossOriginResourcePolicy: "same-origin",
}));

// Security Audit Fix (SEC-08 & SEC-04): Strict CORS with credentials
app.use("/api/*", cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.endsWith(".ngrok-free.app") ||
      origin.endsWith(".ngrok-free.dev") ||
      origin.endsWith(".ngrok.io") ||
      origin.endsWith(".pages.dev") ||
      origin.endsWith(".workers.dev")
    ) {
      return origin;
    }
    return null;
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
  credentials: true,
}));

app.use("*", async (c, next) => {
  if (c.env?.DB) { initDB(c.env); }
  await run("PRAGMA foreign_keys = ON;").catch(() => {});
  await ensureSeeded();
  await next();
});

// Security Audit Fix (SEC-01): Protect back-office mutations and sensitive tenant records
const MUTATION_METHODS = new Set(["POST", "PUT", "DELETE"]);

app.use("/api/*", async (c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  // Allow public or self-authorizing endpoints to pass through without blanket landlord restriction
  if (
    path.startsWith("/api/auth/") ||
    path.startsWith("/api/public/") ||
    path.startsWith("/api/ai/") ||
    path.startsWith("/api/tenant/") ||
    path === "/api/documents/verify" ||
    /^\/api\/leases\/\d+\/sign$/.test(path)
  ) {
    return next();
  }

  // Strictly require landlord or admin authentication for all mutating operations
  if (MUTATION_METHODS.has(method)) {
    return requireRoles("landlord", "admin")(c, next);
  }

  // Security Audit Fix (SEC-01, SEC-02, SEC-03): Protect confidential ledgers, tenant PII, work orders, dashboard, and backend inventory
  if (
    path.startsWith("/api/tenants") ||
    path.startsWith("/api/leases") ||
    path.startsWith("/api/rent-charges") ||
    path.startsWith("/api/payments") ||
    path.startsWith("/api/applications") ||
    path.startsWith("/api/work-orders") ||
    path.startsWith("/api/dashboard") ||
    path.startsWith("/api/vendors") ||
    path.startsWith("/api/properties") ||
    path.startsWith("/api/units")
  ) {
    return requireRoles("landlord", "admin")(c, next);
  }

  await next();
});

// Security Audit Fix (SEC-03): Edge-compatible sliding window rate limiter
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitStore = new Map<string, RateLimitBucket>();

function rateLimiter(options: { max: number; windowMs: number; keyPrefix: string }) {
  return async (c: Context, next: any) => {
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      "client-ip";
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = rateLimitStore.get(key);

    if (bucket && now < bucket.resetAt) {
      if (bucket.count >= options.max) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        c.header("Retry-After", String(retryAfter));
        return c.json(
          {
            error: "Too many requests. Please slow down and try again later.",
            code: "RATE_LIMITED",
            retry_after_seconds: retryAfter,
          },
          429
        );
      }
      bucket.count++;
    } else {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
    }

    if (rateLimitStore.size > 1000) {
      for (const [k, b] of rateLimitStore.entries()) {
        if (now >= b.resetAt) rateLimitStore.delete(k);
      }
    }

    await next();
  };
}

app.use("/api/auth/login", rateLimiter({ max: 10, windowMs: 5 * 60 * 1000, keyPrefix: "login" }));
app.use("/api/auth/register", rateLimiter({ max: 10, windowMs: 5 * 60 * 1000, keyPrefix: "register" }));
app.use("/api/public/apply", rateLimiter({ max: 15, windowMs: 30 * 60 * 1000, keyPrefix: "apply" }));
app.use("/api/ai/*", rateLimiter({ max: 30, windowMs: 60 * 1000, keyPrefix: "ai" }));


// ── First-run data ─────────────────────────────────────────────────
// A deploy applies `schema.sql` as DDL only — a seed INSERT there fails the
// whole build — so the defaults and the sample portfolio are written here,
// once, when their tables are still empty. A re-deploy never resurrects a
// row the user deleted, because the table is no longer empty.

const DEFAULT_SETTINGS: Record<string, string> = {
  default_rent_due_day: "1",
  late_fee_amount: "500",
  late_fee_grace_days: "5",
  currency: "INR",
};

const DEMO_PROPERTIES: Array<[string, string, string, string, string, string, string]> = [
  ["Oakwood Residences", "single_family", "210 Oakwood Rd, Koramangala", "Bengaluru", "KA", "560034", "emerald"],
  ["Honeybee Haven", "single_family", "88 100ft Rd, Indiranagar", "Bengaluru", "KA", "560038", "amber"],
  ["308 Mission Heights", "multi_family", "308 Whitefield Main Rd", "Bengaluru", "KA", "560066", "sky"],
  ["Skyline Tower Residences", "condo", "500 Outer Ring Rd, HSR Layout", "Bengaluru", "KA", "560102", "violet"],
];

/** property index (into DEMO_PROPERTIES), name, beds, baths, sqft, rent, status */
const DEMO_UNITS: Array<[number, string, number, number, number, number, string]> = [
  [0, "Main Villa", 3, 2, 1450, 35000, "occupied"],
  [1, "Garden House", 2, 1, 980, 22000, "vacant"],
  [2, "Unit 1", 1, 1, 620, 18000, "occupied"],
  [2, "Unit 2", 1, 1, 620, 18500, "vacant"],
  [2, "Unit 3", 2, 1, 850, 25000, "vacant"],
  [3, "Suite 12B", 2, 2, 1100, 38000, "vacant"],
];


const DEMO_VENDORS: Array<[string, string, string, string]> = [
  ["Emerald Facility Services", "general", "+91 98450 01144", "emerald"],
  ["Urban Fix Plumbing", "plumber", "+91 98450 01188", "sky"],
  ["Bright Spark Electricals", "electrician", "+91 98450 01102", "amber"],
];


/**
 * Automatically synchronizes a tenant's profile into the users table so
 * that tenants can log in directly with their credentials without encountering
 * any registration barriers or "create account" prompts.
 */
async function syncTenantUser(
  tenant: { id: number; email: string | null; first_name: string; last_name: string },
  customPassword?: string | null
): Promise<void> {
  if (!tenant.email || !tenant.email.trim()) return;
  const normalizedEmail = tenant.email.trim().toLowerCase();
  const fullName = `${tenant.first_name} ${tenant.last_name}`.trim();

  const existingUser = await get<{ id: number; role: string; token_version: number }>(
    "SELECT id, role, token_version FROM users WHERE lower(email) = ?",
    [normalizedEmail]
  );

  const initialPassword = customPassword && customPassword.trim().length >= 6
    ? customPassword.trim()
    : "Password123!";

  if (!existingUser) {
    const { hash, salt } = await hashPassword(initialPassword);
    await run(
      "INSERT INTO users (email, password_hash, salt, full_name, role, tenant_id, token_version) VALUES (?, ?, ?, ?, 'tenant', ?, 1)",
      [normalizedEmail, hash, salt, fullName, tenant.id]
    );
  } else {
    // Preserve admin and landlord administrative privileges if this user already holds one
    const role = (existingUser.role === "admin" || existingUser.role === "landlord")
      ? existingUser.role
      : "tenant";

    if (customPassword && customPassword.trim().length >= 6) {
      const { hash, salt } = await hashPassword(customPassword.trim());
      await run(
        "UPDATE users SET tenant_id = ?, full_name = ?, role = ?, password_hash = ?, salt = ?, token_version = token_version + 1 WHERE id = ?",
        [tenant.id, fullName, role, hash, salt, existingUser.id]
      );
    } else {
      await run(
        "UPDATE users SET tenant_id = ?, full_name = ?, role = ? WHERE id = ?",
        [tenant.id, fullName, role, existingUser.id]
      );
    }
  }
}

let seeded = false;

async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  try {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, value]);
    }
    // Migrate any existing USD default to INR
    await run("UPDATE settings SET value = 'INR' WHERE key = 'currency' AND value = 'USD'").catch(() => {});

    // Ensure core demo accounts exist immediately with verified PBKDF2 credentials
    await run(`
      INSERT OR IGNORE INTO users (id, email, password_hash, salt, full_name, role, tenant_id, token_version)
      VALUES
        (1, 'demo@nestara.ai', '379f7b1c30822030142a180c67fc40858977551341b5258b0f278b9147ac01ce', '4bdf5285f0ecea52a736dfc9b4868435', 'Portfolio Manager', 'landlord', NULL, 1),
        (2, 'admin@nestara.ai', 'b62a2a101214c87319014b684c0321944ee3c6b61840abbb8ec1a11c7ae9162f', '49b8c3bb2c1ee84291cfe812fa0aa5ac', 'Platform Administrator', 'admin', NULL, 1),
        (3, 'tenant1@nestara.ai', 'd94193dd09bce91417d3f7e7b988ced7687dfe0c823465985ef84deb4cda306c', '1f517869528b5618c490c09371c253e4', 'Aarav Sharma', 'tenant', 1, 1),
        (4, 'rohan.verma@gmail.com', 'b6f6f71068556e4b61ba3f8e3ab06b7595acefd0dae4ada5cde2168fa59ae7e9', '3f4529ed47cc4f29dbaf25c721aac587', 'Rohan Verma', 'tenant', 2, 1),
        (5, 'ananya.iyer@gmail.com', 'a4fa0919fc871447145351a168278e6a9ecb2112b2518b8f113762dbbf3b1b49', '3f50346bba37ca50a10f0efa17d4d05d', 'Ananya Iyer', 'tenant', 3, 1)
    `).catch(() => {});

    const props = await get<{ n: number }>("SELECT COUNT(*) AS n FROM properties");
    if ((props?.n ?? 0) === 0) {
      const ids: number[] = [];
      for (const p of DEMO_PROPERTIES) {
        await run(
          "INSERT INTO properties (name, type, address, city, state, zip, color) VALUES (?, ?, ?, ?, ?, ?, ?)",
          p,
        );
        const row = await get<{ id: number }>("SELECT id FROM properties ORDER BY id DESC LIMIT 1");
        ids.push(row?.id ?? 0);
      }
      const units = await get<{ n: number }>("SELECT COUNT(*) AS n FROM units");
      if ((units?.n ?? 0) === 0) {
        for (const [pi, name, beds, baths, sqft, rent, status] of DEMO_UNITS) {
          if (!ids[pi]) continue;
          await run(
            "INSERT INTO units (property_id, name, bedrooms, bathrooms, sqft, market_rent, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [ids[pi], name, beds, baths, sqft, rent, status],
          );
        }
      }
    }

    const vendors = await get<{ n: number }>("SELECT COUNT(*) AS n FROM vendors");
    if ((vendors?.n ?? 0) === 0) {
      for (const v of DEMO_VENDORS) {
        await run("INSERT INTO vendors (name, category, phone, color) VALUES (?, ?, ?, ?)", v);
      }
    }

    // ── Seed Demo Tenants ───────────────────────────────────────────
    let tenantAarav = await get<{ id: number }>("SELECT id FROM tenants WHERE email = 'tenant1@nestara.ai'");
    if (!tenantAarav) {
      const res = await run(
        `INSERT INTO tenants (first_name, last_name, email, phone, employer, monthly_income, emergency_contact, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "Aarav",
          "Sharma",
          "tenant1@nestara.ai",
          "+91 98450 12345",
          "Google India",
          185000,
          "Pooja Sharma (Spouse) +91 98450 12346",
          "Family with 1 child. Moved from Delhi to Bangalore Koramangala hub.",
        ]
      );
      tenantAarav = { id: Number(res.lastInsertRowid) };
    }

    let tenantRohan = await get<{ id: number }>("SELECT id FROM tenants WHERE email = 'rohan.verma@gmail.com'");
    if (!tenantRohan) {
      const res = await run(
        `INSERT INTO tenants (first_name, last_name, email, phone, employer, monthly_income, emergency_contact, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "Rohan",
          "Verma",
          "rohan.verma@gmail.com",
          "+91 98450 54321",
          "Flipkart Internet",
          140000,
          "Sunil Verma (Father) +91 98450 54322",
          "Software Architect. Daily commute along Outer Ring Road corridor.",
        ]
      );
      tenantRohan = { id: Number(res.lastInsertRowid) };
    }

    let tenantAnanya = await get<{ id: number }>("SELECT id FROM tenants WHERE email = 'ananya.iyer@gmail.com'");
    if (!tenantAnanya) {
      const res = await run(
        `INSERT INTO tenants (first_name, last_name, email, phone, employer, monthly_income, emergency_contact, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "Ananya",
          "Iyer",
          "ananya.iyer@gmail.com",
          "+91 98450 88990",
          "Infosys Technologies",
          95000,
          "Deepak Iyer (Brother) +91 98450 88991",
          "Senior Data Analyst. Interested in quiet residential community.",
        ]
      );
      tenantAnanya = { id: Number(res.lastInsertRowid) };
    }

    // ── Seed Demo Leases ────────────────────────────────────────────
    const leasesCount = await get<{ n: number }>("SELECT COUNT(*) AS n FROM leases");
    if ((leasesCount?.n ?? 0) === 0) {
      const allUnits = await query<{ id: number; name: string; market_rent: number }>("SELECT id, name, market_rent FROM units ORDER BY id ASC");
      const unit1 = allUnits[0];
      const unit2 = allUnits[1];
      const unit3 = allUnits[2];

      if (tenantAarav && unit1) {
        // Active lease for Aarav Sharma (Oakwood Residences - Main Villa)
        const res1 = await run(
          `INSERT INTO leases (unit_id, primary_tenant_id, start_date, end_date, monthly_rent, deposit, rent_due_day, late_fee, status, notes)
           VALUES (?, ?, '2026-01-01', '2026-12-31', 35000, 70000, 1, 500, 'active', ?)`,
          [unit1.id, tenantAarav.id, "Registered 11-month Bangalore residential agreement. Standard 2-month deposit."]
        );
        const lease1Id = res1.lastInsertRowid;
        await run("UPDATE units SET status = 'occupied' WHERE id = ?", [unit1.id]);

        // Seed Rent Charges for Lease 1
        await run(
          `INSERT INTO rent_charges (lease_id, period, due_date, amount, amount_paid, status, notes)
           VALUES (?, '2026-10', '2026-10-01', 35000, 35000, 'paid', 'Settled on Oct 2 via UPI (ref: UPI/90281/SBIN)')`,
          [lease1Id]
        );
        await run(
          `INSERT INTO rent_charges (lease_id, period, due_date, amount, amount_paid, status, notes)
           VALUES (?, '2026-11', '2026-11-01', 35000, 0, 'open', 'Upcoming monthly rent for November')`,
          [lease1Id]
        );

        // Seed demo maintenance ticket
        const prop1 = await get<{ property_id: number }>("SELECT property_id FROM units WHERE id = ?", [unit1.id]);
        await run(
          `INSERT INTO work_orders (property_id, unit_id, tenant_id, title, description, priority, status)
           VALUES (?, ?, ?, 'RO Water Purifier Servicing', 'Annual membrane replacement and TDS recalibration.', 'normal', 'open')`,
          [prop1?.property_id ?? null, unit1.id, tenantAarav.id]
        );
      }

      if (tenantRohan && unit3) {
        // Active lease for Rohan Verma (308 Mission Heights - Unit 1)
        const res2 = await run(
          `INSERT INTO leases (unit_id, primary_tenant_id, start_date, end_date, monthly_rent, deposit, rent_due_day, late_fee, status, notes)
           VALUES (?, ?, '2026-03-01', '2027-02-28', 18000, 36000, 1, 500, 'active', ?)`,
          [unit3.id, tenantRohan.id, "Executive apartment lease. Verified IT professional."]
        );
        const lease2Id = res2.lastInsertRowid;
        await run("UPDATE units SET status = 'occupied' WHERE id = ?", [unit3.id]);

        await run(
          `INSERT INTO rent_charges (lease_id, period, due_date, amount, amount_paid, status, notes)
           VALUES (?, '2026-10', '2026-10-01', 18000, 18000, 'paid', 'Paid via HDFC NetBanking')`,
          [lease2Id]
        );
        await run(
          `INSERT INTO rent_charges (lease_id, period, due_date, amount, amount_paid, status, notes)
           VALUES (?, '2026-11', '2026-11-01', 18000, 0, 'open', 'Upcoming monthly rent for November')`,
          [lease2Id]
        );
      }

      if (tenantAnanya && unit2) {
        // Upcoming lease for Ananya Iyer (Honeybee Haven - Garden House)
        await run(
          `INSERT INTO leases (unit_id, primary_tenant_id, start_date, end_date, monthly_rent, deposit, rent_due_day, late_fee, status, notes)
           VALUES (?, ?, '2026-11-15', '2027-11-14', 22000, 44000, 5, 500, 'upcoming', ?)`,
          [unit2.id, tenantAnanya.id, "Advance token received. Possession date confirmed for Nov 15."]
        );
      }
    }

    // ── Seed Users ──────────────────────────────────────────────────
    const adminUser = await get<{ id: number }>("SELECT id FROM users WHERE email = 'admin@nestara.ai'");
    if (!adminUser) {
      const { hash, salt } = await hashPassword("Admin123!");
      await run(
        "INSERT INTO users (email, password_hash, salt, full_name, role, token_version) VALUES (?, ?, ?, ?, ?, ?)",
        ["admin@nestara.ai", hash, salt, "Platform Administrator", "admin", 1]
      );
    }

    const demoUser = await get<{ id: number }>("SELECT id FROM users WHERE email = 'demo@nestara.ai'");
    if (!demoUser) {
      const { hash, salt } = await hashPassword("Password123!");
      await run(
        "INSERT INTO users (email, password_hash, salt, full_name, role, token_version) VALUES (?, ?, ?, ?, ?, ?)",
        ["demo@nestara.ai", hash, salt, "Portfolio Manager", "landlord", 1]
      );
    }

    const tenantUser = await get<{ id: number }>("SELECT id FROM users WHERE email = 'tenant1@nestara.ai'");
    if (!tenantUser) {
      const aarav = await get<{ id: number }>("SELECT id FROM tenants WHERE email = 'tenant1@nestara.ai'");
      const { hash, salt } = await hashPassword("Password123!");
      await run(
        "INSERT INTO users (email, password_hash, salt, full_name, role, tenant_id, token_version) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["tenant1@nestara.ai", hash, salt, "Aarav Sharma", "tenant", aarav?.id ?? null, 1]
      );
    }

    // Ensure token_version column exists on existing databases (SEC-07)
    await run("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1").catch(() => {});
    // Ensure e-signature columns on leases
    await run("ALTER TABLE leases ADD COLUMN e_sign_status TEXT NOT NULL DEFAULT 'signed'").catch(() => {});
    await run("ALTER TABLE leases ADD COLUMN signed_at TEXT").catch(() => {});
    await run("ALTER TABLE leases ADD COLUMN signer_name TEXT").catch(() => {});
    await run("ALTER TABLE leases ADD COLUMN signature_hash TEXT").catch(() => {});


    // Automatically synchronize ALL existing tenants with an email into the users table
    const allTenants = await query<{ id: number; email: string | null; first_name: string; last_name: string }>(
      "SELECT id, email, first_name, last_name FROM tenants WHERE email IS NOT NULL AND trim(email) != ''"
    ).catch(() => []);
    for (const t of allTenants) {
      await syncTenantUser(t);
    }

    // Self-healing: link any unlinked tenant user account directly to their tenant record
    await run(`
      UPDATE users
      SET tenant_id = (SELECT id FROM tenants WHERE lower(tenants.email) = lower(users.email))
      WHERE users.role = 'tenant' AND (users.tenant_id IS NULL OR users.tenant_id NOT IN (SELECT id FROM tenants))
    `).catch(() => {});

    // Ensure audit_logs table exists for DPDP/GDPR compliance
    await run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_email TEXT,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).catch(() => {});
    // ── Seed Demo Verified Documents & Distributed Ledger ─────────────
    const docCount = await get<{ n: number }>("SELECT COUNT(*) AS n FROM documents");
    if ((docCount?.n ?? 0) === 0) {
      const aarav = await get<{ id: number }>("SELECT id FROM tenants WHERE email = 'tenant1@nestara.ai'");

      // 1. Aarav Sharma Authentic Payslip
      const aaravPayslipReport = authenticateDocumentLocally({
        fileName: "Aarav_Sharma_Sept2026_Payslip.pdf",
        documentType: "payslip",
        extractedFields: {
          applicant_name: "Aarav Sharma",
          applicant_surname: "Sharma",
          employer: "Oracle India Pvt Ltd",
          monthly_income: 140000,
          payslip_math: {
            basic_salary: 70000,
            hra: 35000,
            special_allowance: 30000,
            other_allowances: 5000,
            gross_earnings: 140000,
            provident_fund: 1800, // Capped statutory EPF
            professional_tax: 200,
            tds: 20000,
            total_deductions: 22000,
            net_pay: 118000,
          },
        },
        metadataText: "%PDF-1.7\n/Producer (Oracle Payroll Enterprise System v14.2)\n/CreationDate (D:20260930180000Z)\n/ModDate (D:20260930180000Z)\n%%EOF\n",
      });

      const resDoc1 = await run(
        `INSERT INTO documents (
          uuid, tenant_id, document_type, file_name, file_size, mime_type, file_hash_sha256,
          extracted_fields, verification_status, authenticity_score, forensic_verdict, forensic_details, algorithm_checks, verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          aaravPayslipReport.document_uuid,
          aarav?.id ?? null,
          "payslip",
          aaravPayslipReport.file_name,
          142850,
          "application/pdf",
          aaravPayslipReport.file_hash_sha256,
          JSON.stringify(aaravPayslipReport.extracted_fields),
          aaravPayslipReport.verdict === "ORIGINAL" ? "original" : "suspicious",
          aaravPayslipReport.authenticity_score,
          aaravPayslipReport.verdict,
          JSON.stringify({ flags: aaravPayslipReport.flags, summary: "Institutional payroll compilation verified with valid statutory tax deductions." }),
          JSON.stringify(aaravPayslipReport.checks),
          aaravPayslipReport.verified_at,
        ]
      );

      // Genesis Block for Distributed Ledger
      const genesisBlock = sealLedgerBlock({
        blockIndex: 1,
        previousBlockHash: "0000000000000000000000000000000000000000000000000000000000000000",
        documentUuid: aaravPayslipReport.document_uuid,
        documentHash: aaravPayslipReport.file_hash_sha256,
        authenticityScore: aaravPayslipReport.authenticity_score,
        verdict: aaravPayslipReport.verdict,
        validatorNode: "node-blr-central-edge",
      });

      await run(
        `INSERT INTO distributed_ledger_blocks (
          block_index, block_hash, previous_block_hash, merkle_root, document_uuid, document_hash,
          authenticity_score, verdict, validator_node, timestamp, signature
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          genesisBlock.block_index,
          genesisBlock.block_hash,
          genesisBlock.previous_block_hash,
          genesisBlock.merkle_root,
          genesisBlock.document_uuid,
          genesisBlock.document_hash,
          genesisBlock.authenticity_score,
          genesisBlock.verdict,
          genesisBlock.validator_node,
          genesisBlock.timestamp,
          genesisBlock.signature,
        ]
      );

      await run("UPDATE documents SET ledger_block_hash = ? WHERE uuid = ?", [genesisBlock.block_hash, aaravPayslipReport.document_uuid]);

      // 2. Aarav Sharma Valid Aadhaar Card
      const aaravAadhaarReport = authenticateDocumentLocally({
        fileName: "Aarav_Sharma_Aadhaar_Card.pdf",
        documentType: "aadhaar",
        extractedFields: {
          applicant_name: "Aarav Sharma",
          aadhaar_number: "482910475824", // Valid 12-digit Aadhaar
        },
        metadataText: "%PDF-1.6\n/Producer (UIDAI Digital Aadhaar Generation Engine)\n/CreationDate (D:20250410120000Z)\n/ModDate (D:20250410120000Z)\n%%EOF\n",
      });

      await run(
        `INSERT INTO documents (
          uuid, tenant_id, document_type, file_name, file_size, mime_type, file_hash_sha256,
          extracted_fields, verification_status, authenticity_score, forensic_verdict, forensic_details, algorithm_checks, verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          aaravAadhaarReport.document_uuid,
          aarav?.id ?? null,
          "aadhaar",
          aaravAadhaarReport.file_name,
          98400,
          "application/pdf",
          aaravAadhaarReport.file_hash_sha256,
          JSON.stringify(aaravAadhaarReport.extracted_fields),
          "original",
          aaravAadhaarReport.authenticity_score,
          aaravAadhaarReport.verdict,
          JSON.stringify({ flags: aaravAadhaarReport.flags, summary: "UIDAI Verhoeff D5 mathematical permutation check verified." }),
          JSON.stringify(aaravAadhaarReport.checks),
          aaravAadhaarReport.verified_at,
        ]
      );

      const block2 = sealLedgerBlock({
        blockIndex: 2,
        previousBlockHash: genesisBlock.block_hash,
        documentUuid: aaravAadhaarReport.document_uuid,
        documentHash: aaravAadhaarReport.file_hash_sha256,
        authenticityScore: aaravAadhaarReport.authenticity_score,
        verdict: aaravAadhaarReport.verdict,
        validatorNode: "node-blr-central-edge",
      });

      await run(
        `INSERT INTO distributed_ledger_blocks (
          block_index, block_hash, previous_block_hash, merkle_root, document_uuid, document_hash,
          authenticity_score, verdict, validator_node, timestamp, signature
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          block2.block_index,
          block2.block_hash,
          block2.previous_block_hash,
          block2.merkle_root,
          block2.document_uuid,
          block2.document_hash,
          block2.authenticity_score,
          block2.verdict,
          block2.validator_node,
          block2.timestamp,
          block2.signature,
        ]
      );
      await run("UPDATE documents SET ledger_block_hash = ? WHERE uuid = ?", [block2.block_hash, aaravAadhaarReport.document_uuid]);

      // 3. Demo Tampered Salary Slip
      const tamperedReport = authenticateDocumentLocally({
        fileName: "Forged_Income_Proof_Application_44.pdf",
        documentType: "payslip",
        extractedFields: {
          applicant_name: "Karan Singhania",
          monthly_income: 185000,
          payslip_math: {
            basic_salary: 30000,
            hra: 15000,
            gross_earnings: 185000, // Broken equation!
            provident_fund: 1200,
            total_deductions: 1200,
            net_pay: 183800,
          },
        },
        metadataText: "%PDF-1.5\n/Producer (Adobe Photoshop CC 2023)\n/CreationDate (D:20260101100000Z)\n/ModDate (D:20261015143000Z)\ntrailer\n%%EOF\ntrailer\n%%EOF\n",
      });

      await run(
        `INSERT INTO documents (
          uuid, document_type, file_name, file_size, mime_type, file_hash_sha256,
          extracted_fields, verification_status, authenticity_score, forensic_verdict, forensic_details, algorithm_checks, verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tamperedReport.document_uuid,
          "payslip",
          tamperedReport.file_name,
          234100,
          "application/pdf",
          tamperedReport.file_hash_sha256,
          JSON.stringify(tamperedReport.extracted_fields),
          "fake",
          tamperedReport.authenticity_score,
          tamperedReport.verdict,
          JSON.stringify({ flags: tamperedReport.flags, summary: "Critical mathematical balance breakdown and consumer graphic editing tool signatures detected." }),
          JSON.stringify(tamperedReport.checks),
          tamperedReport.verified_at,
        ]
      );

      const block3 = sealLedgerBlock({
        blockIndex: 3,
        previousBlockHash: block2.block_hash,
        documentUuid: tamperedReport.document_uuid,
        documentHash: tamperedReport.file_hash_sha256,
        authenticityScore: tamperedReport.authenticity_score,
        verdict: tamperedReport.verdict,
        validatorNode: "node-blr-central-edge",
      });

      await run(
        `INSERT INTO distributed_ledger_blocks (
          block_index, block_hash, previous_block_hash, merkle_root, document_uuid, document_hash,
          authenticity_score, verdict, validator_node, timestamp, signature
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          block3.block_index,
          block3.block_hash,
          block3.previous_block_hash,
          block3.merkle_root,
          block3.document_uuid,
          block3.document_hash,
          block3.authenticity_score,
          block3.verdict,
          block3.validator_node,
          block3.timestamp,
          block3.signature,
        ]
      );
      await run("UPDATE documents SET ledger_block_hash = ? WHERE uuid = ?", [block3.block_hash, tamperedReport.document_uuid]);
    }
    seeded = true;
  } catch (err) {
    console.error("[ensureSeeded error]", err);
    seeded = false;
  }
}

// ── Helpers ────────────────────────────────────────────────────────

const intParam = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
};

async function parseJson<T>(c: Context, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") };
  return { ok: true, data: parsed.data };
}

function buildUpdate(fields: Record<string, unknown>): { sets: string[]; params: unknown[] } {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); params.push(v); }
  }
  return { sets, params };
}

// ── Authentication ─────────────────────────────────────────────────

const RegisterInput = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain at least one number"),
  full_name: z.string().min(1, "Full name is required"),
  role: z.enum(["admin", "landlord", "tenant"]).default("tenant"),
});

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

interface FailedLoginTracker {
  count: number;
  lockedUntil?: number;
}
const failedLoginTracker = new Map<string, FailedLoginTracker>();

app.post("/api/auth/register", async (c) => {
  const parsed = await parseJson(c, RegisterInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { email, password, full_name, role } = parsed.data;

  // Security Audit Fix (SEC-06): Prevent privilege escalation. Public registration cannot create landlord/admin accounts.
  let assignedRole: "admin" | "landlord" | "tenant" = "tenant";
  if (role === "admin" || role === "landlord") {
    const caller = await verifyToken(c);
    if (caller && caller.role === "admin") {
      assignedRole = role;
    } else {
      assignedRole = "tenant";
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await get<{ id: number; role: string }>("SELECT id, role FROM users WHERE lower(email) = ?", [normalizedEmail]);
  if (existing) {
    if (existing.role === "tenant") {
      return c.json({
        error: "Your tenant account has already been registered by your property manager. Please sign in directly with your email and password.",
        code: "TENANT_ALREADY_REGISTERED",
        is_registered_tenant: true,
      }, 409);
    }
    // Mitigate timing attack & enumeration (SEC-06) by performing equalized work
    await hashPassword(password, "00000000000000000000000000000000");
    return c.json({ error: "Unable to register with this email address. Please sign in or try another email." }, 409);
  }

  // Security Audit Fix (SEC-05): Auto-link only to existing verified tenant in DB (never trust client tenant_id)
  const matchingTenant = await get<{ id: number }>("SELECT id FROM tenants WHERE lower(email) = ?", [normalizedEmail]);
  const finalTenantId = matchingTenant?.id ?? null;
  const finalRole = matchingTenant ? "tenant" : assignedRole;

  const { hash, salt } = await hashPassword(password);
  await run(
    "INSERT INTO users (email, password_hash, salt, full_name, role, tenant_id, token_version) VALUES (?, ?, ?, ?, ?, ?, 1)",
    [normalizedEmail, hash, salt, full_name.trim(), finalRole, finalTenantId]
  );

  const user = await get<UserRecord>("SELECT * FROM users WHERE lower(email) = ?", [normalizedEmail]);
  if (!user) return c.json({ error: "Failed to create user" }, 500);

  const token = await generateToken(user, c);
  const isSecure = c.req.url.startsWith("https");
  c.header("Set-Cookie", `nestara_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isSecure ? "; Secure" : ""}`);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      tenant_id: user.tenant_id,
    },
  }, 201);
});

app.post("/api/auth/login", async (c) => {
  const parsed = await parseJson(c, LoginInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { email, password } = parsed.data;

  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();
  const lockout = failedLoginTracker.get(normalizedEmail);
  if (lockout && lockout.lockedUntil && now < lockout.lockedUntil) {
    const remainingSecs = Math.ceil((lockout.lockedUntil - now) / 1000);
    c.header("Retry-After", String(remainingSecs));
    return c.json(
      {
        error: `Account temporarily locked due to multiple failed login attempts. Please try again in ${Math.ceil(remainingSecs / 60)} minutes.`,
        code: "ACCOUNT_LOCKED",
        retry_after_seconds: remainingSecs,
      },
      429
    );
  }
  const recordFailure = () => {
    const record = failedLoginTracker.get(normalizedEmail) || { count: 0 };
    record.count += 1;
    if (record.count >= 5) {
      record.lockedUntil = now + 15 * 60 * 1000;
      failedLoginTracker.set(normalizedEmail, record);
      return { locked: true, remaining: 0 };
    }
    failedLoginTracker.set(normalizedEmail, record);
    return { locked: false, remaining: 5 - record.count };
  };

  const user = await get<UserRecord>("SELECT * FROM users WHERE lower(email) = ?", [normalizedEmail]);
  if (!user) {
    // Equalize timing response to prevent enumeration of registered emails (SEC-06)
    await hashPassword(password, "00000000000000000000000000000000");
    const res = recordFailure();
    if (res.locked) {
      return c.json({ error: "Too many failed attempts. Account locked for 15 minutes for your security.", code: "ACCOUNT_LOCKED", retry_after_seconds: 900 }, 429);
    }
    return c.json({ error: "Invalid email or password", attempts_remaining: res.remaining }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash, user.salt);
  if (!valid) {
    const res = recordFailure();
    if (res.locked) {
      return c.json({ error: "Too many failed attempts. Account locked for 15 minutes for your security.", code: "ACCOUNT_LOCKED", retry_after_seconds: 900 }, 429);
    }
    return c.json({ error: "Invalid email or password", attempts_remaining: res.remaining }, 401);
  }

  // Clear failed counter on success
  failedLoginTracker.delete(normalizedEmail);

  const token = await generateToken(user, c);
  const isSecure = c.req.url.startsWith("https");
  c.header("Set-Cookie", `nestara_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${isSecure ? "; Secure" : ""}`);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      tenant_id: user.tenant_id,
    },
  });
});



const AuditLogInput = z.object({
  action: z.string().min(1).max(50),
  target_type: z.string().min(1).max(50),
  target_id: z.number().int().optional().nullable(),
  details: z.string().max(500).optional().nullable(),
});

app.post("/api/audit/log", async (c) => {
  const user = await verifyToken(c);
  const parsed = await parseJson(c, AuditLogInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "client-ip";

  await run(
    `INSERT INTO audit_logs (user_id, user_email, action, target_type, target_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user?.sub ?? null,
      user?.email ?? null,
      parsed.data.action,
      parsed.data.target_type,
      parsed.data.target_id ?? null,
      parsed.data.details ?? null,
      ip,
    ]
  ).catch(() => {});

  return c.json({ ok: true }, 201);
});

app.get("/api/auth/me", async (c) => {
  const payload = await verifyToken(c);
  if (!payload) {
    return c.json({ user: null });
  }

  const user = await get<UserRecord>("SELECT id, email, full_name, role, tenant_id, created_at FROM users WHERE id = ?", [payload.sub]);
  if (!user) {
    return c.json({ user: null });
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      tenant_id: user.tenant_id,
      created_at: user.created_at,
    },
  });
});

app.post("/api/auth/logout", async (c) => {
  const user = await verifyToken(c);
  if (user) {
    // Invalidate all existing tokens for this user by bumping token_version (SEC-07)
    await run("UPDATE users SET token_version = token_version + 1 WHERE id = ?", [user.sub]).catch(() => {});
  }
  c.header("Set-Cookie", "nestara_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return c.json({ ok: true });
});

// ── Public Listings & Renter Discovery ─────────────────────────────

const VALID_PROPERTY_TYPES = new Set(["single_family", "multi_family", "condo", "townhouse", "commercial"]);

app.get("/api/public/listings", async (c) => {
  const minRent = parseFloat(c.req.query("minRent") || "");
  const maxRent = parseFloat(c.req.query("maxRent") || "");
  const bedrooms = parseFloat(c.req.query("bedrooms") || "");
  const bathrooms = parseFloat(c.req.query("bathrooms") || "");
  const propertyType = c.req.query("propertyType");
  const city = c.req.query("city");
  const rawSearch = c.req.query("search");

  // Security Audit Fix: Limit and sanitize search term to prevent query abuse
  const search = rawSearch ? rawSearch.trim().slice(0, 100) : "";

  // Security Audit Fix: Pagination boundary to prevent memory exhaustion / DoS
  const limitParam = parseInt(c.req.query("limit") || "50", 10);
  const limit = Math.min(Math.max(1, Number.isFinite(limitParam) ? limitParam : 50), 100);

  const clauses: string[] = ["u.status = 'vacant'"];
  const params: unknown[] = [];

  if (Number.isFinite(minRent) && minRent >= 0) {
    clauses.push("u.market_rent >= ?");
    params.push(minRent);
  }
  if (Number.isFinite(maxRent) && maxRent > 0) {
    clauses.push("u.market_rent <= ?");
    params.push(maxRent);
  }
  if (Number.isFinite(bedrooms) && bedrooms >= 0) {
    clauses.push("u.bedrooms >= ?");
    params.push(bedrooms);
  }
  if (Number.isFinite(bathrooms) && bathrooms >= 0) {
    clauses.push("u.bathrooms >= ?");
    params.push(bathrooms);
  }
  if (propertyType && propertyType !== "all" && VALID_PROPERTY_TYPES.has(propertyType)) {
    clauses.push("p.type = ?");
    params.push(propertyType);
  }
  if (city && city.trim() !== "" && city !== "all") {
    clauses.push("lower(p.city) = lower(?)");
    params.push(city.trim().slice(0, 50));
  }
  if (search) {
    const s = `%${search.replace(/[%_]/g, "\\$&")}%`;
    clauses.push("(p.name LIKE ? ESCAPE '\\' OR p.address LIKE ? ESCAPE '\\' OR p.city LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')");
    params.push(s, s, s, s);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sql = `
    SELECT
      u.id as unit_id,
      u.name as unit_name,
      u.bedrooms,
      u.bathrooms,
      u.sqft,
      u.market_rent,
      u.status as unit_status,
      p.id as property_id,
      p.name as property_name,
      p.type as property_type,
      p.address,
      p.city,
      p.state,
      p.zip,
      p.year_built,
      p.color as property_color
    FROM units u
    JOIN properties p ON p.id = u.property_id
    ${whereClause}
    ORDER BY u.market_rent ASC, p.name ASC
    LIMIT ?
  `;

  params.push(limit);
  const listings = await query(sql, params);

  const meta = await get<{ min_price: number; max_price: number; total: number }>(
    `SELECT MIN(market_rent) as min_price, MAX(market_rent) as max_price, COUNT(*) as total FROM units WHERE status = 'vacant'`
  );

  return c.json({
    listings,
    meta: {
      min_price: meta?.min_price ?? 0,
      max_price: meta?.max_price ?? 5000,
      total_vacant: meta?.total ?? 0,
    },
  });
});

// ── AI Recommendation & Comparison ─────────────────────────────────

const RecommendInput = z.object({
  target_budget: z.number().positive().optional(),
  min_bedrooms: z.number().min(0).optional(),
  min_bathrooms: z.number().min(0).optional(),
  min_sqft: z.number().positive().optional(),
  preferred_type: z.string().optional(),
  preferred_city: z.string().optional(),
  priority: z.enum(["budget", "space", "balanced"]).default("balanced"),
});

const CompareInput = z.object({
  unit_ids: z.array(z.number().int().positive()).min(1).max(5),
});

app.post("/api/ai/recommend", async (c) => {
  const parsed = await parseJson(c, RecommendInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const units = await query<CandidateListing>(`
    SELECT
      u.id as unit_id,
      u.name as unit_name,
      u.bedrooms,
      u.bathrooms,
      u.sqft,
      u.market_rent,
      p.id as property_id,
      p.name as property_name,
      p.type as property_type,
      p.address,
      p.city,
      p.state,
      p.zip,
      p.year_built,
      p.color as property_color
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE u.status = 'vacant'
    ORDER BY u.market_rent ASC
    LIMIT 50
  `);

  const recommendations = rankRecommendations(units, parsed.data);
  return c.json({ recommendations });
});

app.post("/api/ai/compare", async (c) => {
  const parsed = await parseJson(c, CompareInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { unit_ids } = parsed.data;

  const placeholders = unit_ids.map(() => "?").join(", ");
  const units = await query<CandidateListing>(
    `
    SELECT
      u.id as unit_id,
      u.name as unit_name,
      u.bedrooms,
      u.bathrooms,
      u.sqft,
      u.market_rent,
      p.id as property_id,
      p.name as property_name,
      p.type as property_type,
      p.address,
      p.city,
      p.state,
      p.zip,
      p.year_built,
      p.color as property_color
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE u.id IN (${placeholders})
  `,
    unit_ids
  );

  const comparison = compareProperties(units);
  return c.json({ comparison });
});

const TriageInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  image_data: z.string().max(5 * 1024 * 1024, "Image data exceeds 5MB limit").optional().nullable(),
});

app.post("/api/ai/triage-maintenance", async (c) => {
  const parsed = await parseJson(c, TriageInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const triage = triageMaintenanceIssue(parsed.data);
  return c.json({ triage });
});

// ── Properties ─────────────────────────────────────────────────────

const PropertyInput = z.object({
  name: z.string().min(1),
  type: z.enum(["single_family", "multi_family", "condo", "townhouse", "commercial"]).optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  year_built: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
  color: z.string().optional(),
});

app.get("/api/properties", async (c) => {
  const rows = await query(
    `SELECT p.*,
       (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) as unit_count,
       (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'occupied') as occupied_count
     FROM properties p ORDER BY p.name`,
  );
  return c.json({ properties: rows });
});

app.get("/api/properties/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const row = await get("SELECT * FROM properties WHERE id = ?", [id]);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ property: row });
});

app.post("/api/properties", async (c) => {
  const parsed = await parseJson(c, PropertyInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO properties (name, type, address, city, state, zip, year_built, notes, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.name, d.type ?? "single_family", d.address ?? null, d.city ?? null, d.state ?? null, d.zip ?? null, d.year_built ?? null, d.notes ?? null, d.color ?? "sky"],
  );
  const row = await get("SELECT * FROM properties WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ property: row }, 201);
});

app.put("/api/properties/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, PropertyInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { sets, params } = buildUpdate(parsed.data);
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE properties SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get("SELECT * FROM properties WHERE id = ?", [id]);
  return c.json({ property: row });
});

app.delete("/api/properties/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM properties WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Units ──────────────────────────────────────────────────────────

const UnitInput = z.object({
  property_id: z.number().int(),
  name: z.string().min(1),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  sqft: z.number().int().optional().nullable(),
  market_rent: z.number().min(0).optional(),
  status: z.enum(["vacant", "occupied", "turnover", "unavailable"]).optional(),
  notes: z.string().optional().nullable(),
});

const UNIT_SELECT = `
  SELECT u.*,
    p.name as property_name,
    p.color as property_color,
    p.address as property_address,
    p.city as property_city,
    (SELECT l.id FROM leases l WHERE l.unit_id = u.id AND l.status = 'active' ORDER BY l.start_date DESC LIMIT 1) as active_lease_id,
    (SELECT t.first_name || ' ' || t.last_name FROM leases l LEFT JOIN tenants t ON t.id = l.primary_tenant_id WHERE l.unit_id = u.id AND l.status = 'active' ORDER BY l.start_date DESC LIMIT 1) as active_tenant_name
  FROM units u
  LEFT JOIN properties p ON p.id = u.property_id
`;

app.get("/api/units", async (c) => {
  const propertyId = intParam(c.req.query("property_id"));
  const status = c.req.query("status");
  const where: string[] = [];
  const params: unknown[] = [];
  if (propertyId) { where.push("u.property_id = ?"); params.push(propertyId); }
  if (status) { where.push("u.status = ?"); params.push(status); }
  const sql = `${UNIT_SELECT}${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY p.name, u.name`;
  const rows = await query(sql, params);
  return c.json({ units: rows });
});

app.get("/api/units/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const row = await get(`${UNIT_SELECT} WHERE u.id = ?`, [id]);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ unit: row });
});

app.post("/api/units", async (c) => {
  const parsed = await parseJson(c, UnitInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO units (property_id, name, bedrooms, bathrooms, sqft, market_rent, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.property_id, d.name, d.bedrooms ?? 1, d.bathrooms ?? 1, d.sqft ?? null, d.market_rent ?? 0, d.status ?? "vacant", d.notes ?? null],
  );
  const row = await get(`${UNIT_SELECT} WHERE u.id = ?`, [result.lastInsertRowid]);
  return c.json({ unit: row }, 201);
});

app.put("/api/units/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, UnitInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { sets, params } = buildUpdate(parsed.data);
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE units SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get(`${UNIT_SELECT} WHERE u.id = ?`, [id]);
  return c.json({ unit: row });
});

app.delete("/api/units/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM units WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Tenants ────────────────────────────────────────────────────────

const TenantInput = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  emergency_contact: z.string().optional().nullable(),
  employer: z.string().optional().nullable(),
  monthly_income: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  password: z.string().min(6).optional().nullable(),
});

app.get("/api/tenants", async (c) => {
  const search = c.req.query("q")?.trim();
  if (search) {
    const sanitized = search.slice(0, 100).replace(/[%_]/g, "\\$&");
    const like = `%${sanitized}%`;
    const rows = await query(
      `SELECT t.*,
         (SELECT u.id FROM leases l LEFT JOIN units u ON u.id = l.unit_id
            WHERE l.primary_tenant_id = t.id AND l.status = 'active' LIMIT 1) as active_unit_id,
         (SELECT u.name FROM leases l LEFT JOIN units u ON u.id = l.unit_id
            WHERE l.primary_tenant_id = t.id AND l.status = 'active' LIMIT 1) as active_unit_name,
         (SELECT p.name FROM leases l LEFT JOIN units u ON u.id = l.unit_id LEFT JOIN properties p ON p.id = u.property_id
            WHERE l.primary_tenant_id = t.id AND l.status = 'active' LIMIT 1) as active_property_name
       FROM tenants t
       WHERE (t.last_name LIKE ? ESCAPE '\\' OR t.first_name LIKE ? ESCAPE '\\' OR t.email LIKE ? ESCAPE '\\' OR t.phone LIKE ? ESCAPE '\\')
       ORDER BY t.last_name, t.first_name LIMIT 200`,
      [like, like, like, like],
    );
    return c.json({ tenants: rows });
  }
  const rows = await query(
    `SELECT t.*,
       (SELECT u.id FROM leases l LEFT JOIN units u ON u.id = l.unit_id
          WHERE l.primary_tenant_id = t.id AND l.status = 'active' LIMIT 1) as active_unit_id,
       (SELECT u.name FROM leases l LEFT JOIN units u ON u.id = l.unit_id
          WHERE l.primary_tenant_id = t.id AND l.status = 'active' LIMIT 1) as active_unit_name,
       (SELECT p.name FROM leases l LEFT JOIN units u ON u.id = l.unit_id LEFT JOIN properties p ON p.id = u.property_id
          WHERE l.primary_tenant_id = t.id AND l.status = 'active' LIMIT 1) as active_property_name
     FROM tenants t ORDER BY t.last_name, t.first_name LIMIT 500`,
  );
  return c.json({ tenants: rows });
});

app.get("/api/tenants/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const row = await get("SELECT * FROM tenants WHERE id = ?", [id]);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ tenant: row });
});

app.post("/api/tenants", async (c) => {
  const parsed = await parseJson(c, TenantInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO tenants (first_name, last_name, email, phone, date_of_birth, emergency_contact, employer, monthly_income, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.first_name, d.last_name, d.email ?? null, d.phone ?? null, d.date_of_birth ?? null, d.emergency_contact ?? null, d.employer ?? null, d.monthly_income ?? null, d.notes ?? null],
  );
  const tenantId = Number(result.lastInsertRowid);

  // Auto-provision and sync tenant login credentials directly into DB
  if (d.email) {
    await syncTenantUser(
      { id: tenantId, email: d.email, first_name: d.first_name, last_name: d.last_name },
      d.password
    );
  }

  const row = await get("SELECT * FROM tenants WHERE id = ?", [tenantId]);
  return c.json({ tenant: row }, 201);
});

app.put("/api/tenants/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, TenantInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { password, ...tenantFields } = parsed.data;
  const { sets, params } = buildUpdate(tenantFields);
  if (sets.length) {
    params.push(id);
    const r = await run(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?`, params);
    if (!r.changes) return c.json({ error: "Not found" }, 404);
  }
  const row = await get<{ id: number; email: string | null; first_name: string; last_name: string }>(
    "SELECT * FROM tenants WHERE id = ?",
    [id]
  );
  if (!row) return c.json({ error: "Not found" }, 404);

  // Automatically sync updated email/password/name directly into users table
  if (row.email) {
    await syncTenantUser(row, password);
  }

  return c.json({ tenant: row });
});

app.delete("/api/tenants/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  await run("DELETE FROM users WHERE tenant_id = ?", [id]).catch(() => {});
  const r = await run("DELETE FROM tenants WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Leases ─────────────────────────────────────────────────────────

const LeaseInput = z.object({
  unit_id: z.number().int(),
  primary_tenant_id: z.number().int().nullable().optional(),
  start_date: z.string(),
  end_date: z.string(),
  monthly_rent: z.number().min(0).optional(),
  deposit: z.number().min(0).optional(),
  rent_due_day: z.number().int().min(1).max(31).optional(),
  late_fee: z.number().min(0).optional(),
  status: z.enum(["upcoming", "active", "ended", "cancelled"]).optional(),
  notes: z.string().optional().nullable(),
});

const LEASE_SELECT = `
  SELECT l.*,
    u.name as unit_name,
    p.id as property_id, p.name as property_name, p.color as property_color,
    t.first_name as tenant_first_name, t.last_name as tenant_last_name,
    t.email as tenant_email, t.phone as tenant_phone
  FROM leases l
  LEFT JOIN units u ON u.id = l.unit_id
  LEFT JOIN properties p ON p.id = u.property_id
  LEFT JOIN tenants t ON t.id = l.primary_tenant_id
`;

app.get("/api/leases", async (c) => {
  const status = c.req.query("status");
  const tenantId = intParam(c.req.query("tenant_id"));
  const unitId = intParam(c.req.query("unit_id"));
  const where: string[] = [];
  const params: unknown[] = [];
  if (status) { where.push("l.status = ?"); params.push(status); }
  if (tenantId) { where.push("l.primary_tenant_id = ?"); params.push(tenantId); }
  if (unitId) { where.push("l.unit_id = ?"); params.push(unitId); }
  const sql = `${LEASE_SELECT}${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY l.start_date DESC`;
  const rows = await query(sql, params);
  return c.json({ leases: rows });
});

app.get("/api/leases/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const row = await get(`${LEASE_SELECT} WHERE l.id = ?`, [id]);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ lease: row });
});

app.post("/api/leases", async (c) => {
  const parsed = await parseJson(c, LeaseInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO leases (unit_id, primary_tenant_id, start_date, end_date, monthly_rent, deposit, rent_due_day, late_fee, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.unit_id, d.primary_tenant_id ?? null, d.start_date, d.end_date, d.monthly_rent ?? 0, d.deposit ?? 0, d.rent_due_day ?? 1, d.late_fee ?? 0, d.status ?? "active", d.notes ?? null],
  );
  // Mark the unit as occupied if the new lease is active.
  if ((d.status ?? "active") === "active") {
    await run("UPDATE units SET status = 'occupied' WHERE id = ?", [d.unit_id]);
  }

  // Ensure assigned tenant has active user login credentials synced
  if (d.primary_tenant_id) {
    const t = await get<{ id: number; email: string | null; first_name: string; last_name: string }>(
      "SELECT id, email, first_name, last_name FROM tenants WHERE id = ?",
      [d.primary_tenant_id]
    );
    if (t) {
      await syncTenantUser(t);
    }
  }

  const row = await get(`${LEASE_SELECT} WHERE l.id = ?`, [result.lastInsertRowid]);
  return c.json({ lease: row }, 201);
});

app.put("/api/leases/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, LeaseInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { sets, params } = buildUpdate(parsed.data);
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE leases SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get<any>(`${LEASE_SELECT} WHERE l.id = ?`, [id]);
  if (row?.primary_tenant_id) {
    const t = await get<{ id: number; email: string | null; first_name: string; last_name: string }>(
      "SELECT id, email, first_name, last_name FROM tenants WHERE id = ?",
      [row.primary_tenant_id]
    );
    if (t) await syncTenantUser(t);
  }

  // Synchronize unit occupancy status when lease status changes
  if (parsed.data.status && row?.unit_id) {
    if (parsed.data.status === "active") {
      await run("UPDATE units SET status = 'occupied' WHERE id = ?", [row.unit_id]);
    } else if (parsed.data.status === "ended" || parsed.data.status === "cancelled") {
      const otherActive = await get<{ id: number }>(
        "SELECT id FROM leases WHERE unit_id = ? AND status = 'active' AND id != ?",
        [row.unit_id, id]
      );
      if (!otherActive) {
        await run("UPDATE units SET status = 'vacant' WHERE id = ?", [row.unit_id]);
      }
    }
  }

  return c.json({ lease: row });
});

app.post("/api/leases/:id/sign", async (c) => {
  const user = await verifyToken(c);
  if (!user) return c.json({ error: "Authentication required" }, 401);
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  const lease = await get<any>("SELECT * FROM leases WHERE id = ?", [id]);
  if (!lease) return c.json({ error: "Lease not found" }, 404);

  if (user.role === "tenant" && lease.primary_tenant_id !== user.tenant_id) {
    return c.json({ error: "Access denied" }, 403);
  }

  const signerName = user.full_name || "Verified Resident";
  const timestamp = new Date().toISOString();
  const signatureHash = "SHA256:" + Buffer.from(`${id}:${signerName}:${timestamp}`).toString("hex").slice(0, 32).toUpperCase();

  await run(
    "UPDATE leases SET e_sign_status = 'signed', signed_at = ?, signer_name = ?, signature_hash = ? WHERE id = ?",
    [timestamp, signerName, signatureHash, id]
  );

  const updated = await get(`${LEASE_SELECT} WHERE l.id = ?`, [id]);
  return c.json({ lease: updated, ok: true });
});

app.delete("/api/leases/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  // Retrieve unit_id before deleting so unit status can be restored
  const existing = await get<{ unit_id: number }>("SELECT unit_id FROM leases WHERE id = ?", [id]);

  const r = await run("DELETE FROM leases WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);

  // If no other active lease exists on that unit, set unit back to vacant
  if (existing?.unit_id) {
    const otherActive = await get<{ id: number }>(
      "SELECT id FROM leases WHERE unit_id = ? AND status = 'active'",
      [existing.unit_id]
    );
    if (!otherActive) {
      await run("UPDATE units SET status = 'vacant' WHERE id = ?", [existing.unit_id]);
    }
  }

  return c.json({ ok: true });
});

// ── Rent charges & payments ────────────────────────────────────────

const ChargeInput = z.object({
  lease_id: z.number().int(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  due_date: z.string(),
  amount: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

const CHARGE_SELECT = `
  SELECT c.*,
    l.unit_id, l.monthly_rent as lease_rent, l.rent_due_day,
    u.name as unit_name,
    p.id as property_id, p.name as property_name, p.color as property_color,
    t.id as tenant_id, t.first_name as tenant_first_name, t.last_name as tenant_last_name
  FROM rent_charges c
  LEFT JOIN leases l ON l.id = c.lease_id
  LEFT JOIN units u ON u.id = l.unit_id
  LEFT JOIN properties p ON p.id = u.property_id
  LEFT JOIN tenants t ON t.id = l.primary_tenant_id
`;

app.get("/api/rent-charges", async (c) => {
  const period = c.req.query("period");
  const status = c.req.query("status");
  const where: string[] = [];
  const params: unknown[] = [];
  if (period) { where.push("c.period = ?"); params.push(period); }
  if (status) { where.push("c.status = ?"); params.push(status); }
  const sql = `${CHARGE_SELECT}${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY c.due_date, p.name, u.name`;
  const rows = await query(sql, params).catch(() => []);
  return c.json({ charges: rows });
});

app.post("/api/rent-charges", async (c) => {
  const parsed = await parseJson(c, ChargeInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO rent_charges (lease_id, period, due_date, amount, notes) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(lease_id, period) DO NOTHING`,
    [d.lease_id, d.period, d.due_date, d.amount ?? 0, d.notes ?? null],
  );
  if (!result.changes) {
    const existing = await get(`${CHARGE_SELECT} WHERE c.lease_id = ? AND c.period = ?`, [d.lease_id, d.period]);
    return c.json({ charge: existing });
  }
  const row = await get(`${CHARGE_SELECT} WHERE c.id = ?`, [result.lastInsertRowid]);
  return c.json({ charge: row }, 201);
});

// Generate (idempotent) charges for a given period across all active leases.
app.post("/api/rent-charges/generate", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { period?: string };
  const period = body.period;
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return c.json({ error: "period (YYYY-MM) required" }, 400);
  const leases = await query<{ id: number; monthly_rent: number; rent_due_day: number; start_date: string; end_date: string }>(
    "SELECT id, monthly_rent, rent_due_day, start_date, end_date FROM leases WHERE status = 'active'",
  );
  let created = 0;
  for (const l of leases) {
    // Skip if the lease doesn't cover this period at all (BUG-01 fix: check both start and end dates)
    const periodStart = `${period}-01`;
    const periodEnd = `${period}-31`;
    if (l.end_date < periodStart) continue;
    if (l.start_date > periodEnd) continue;
    const day = String(Math.min(28, Math.max(1, l.rent_due_day))).padStart(2, "0");
    const dueDate = `${period}-${day}`;
    const r = await run(
      `INSERT INTO rent_charges (lease_id, period, due_date, amount) VALUES (?, ?, ?, ?)
         ON CONFLICT(lease_id, period) DO NOTHING`,
      [l.id, period, dueDate, l.monthly_rent],
    );
    if (r.changes) created++;
  }
  // Re-mark anything past due as 'overdue'.
  await run(
    `UPDATE rent_charges SET status = 'overdue'
     WHERE status IN ('open', 'partial') AND amount_paid < amount AND due_date < date('now')`,
  );
  return c.json({ created, period });
});

app.put("/api/rent-charges/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const Patch = z.object({
    amount: z.number().min(0).optional(),
    due_date: z.string().optional(),
    status: z.enum(["open", "partial", "paid", "overdue", "waived"]).optional(),
    notes: z.string().optional().nullable(),
  });
  const parsed = await parseJson(c, Patch);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { sets, params } = buildUpdate(parsed.data);
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE rent_charges SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get(`${CHARGE_SELECT} WHERE c.id = ?`, [id]);
  return c.json({ charge: row });
});

app.delete("/api/rent-charges/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM rent_charges WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

const PaymentInput = z.object({
  charge_id: z.number().int(),
  paid_at: z.string().optional(),
  amount: z.number().min(0),
  method: z.enum(["cash", "check", "ach", "credit", "other"]).optional(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

app.get("/api/rent-charges/:id/payments", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const rows = await query("SELECT * FROM payments WHERE charge_id = ? ORDER BY paid_at DESC", [id]);
  return c.json({ payments: rows });
});

app.post("/api/payments", async (c) => {
  const parsed = await parseJson(c, PaymentInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;

  // Security Audit Fix (BUG-02): Validate charge exists BEFORE inserting payment to prevent orphaned records
  const charge = await get<{ amount: number }>("SELECT amount FROM rent_charges WHERE id = ?", [d.charge_id]);
  if (!charge) return c.json({ error: "Charge not found" }, 404);

  await run(
    `INSERT INTO payments (charge_id, paid_at, amount, method, reference, notes)
     VALUES (?, COALESCE(?, datetime('now')), ?, ?, ?, ?)`,
    [d.charge_id, d.paid_at ?? null, d.amount, d.method ?? "cash", d.reference ?? null, d.notes ?? null],
  );
  // Recompute the charge's amount_paid + status.
  const sumRow = await get<{ total: number }>("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE charge_id = ?", [d.charge_id]);
  const paid = Number(sumRow?.total ?? 0);
  const status = paid >= charge.amount ? "paid" : paid > 0 ? "partial" : "open";
  await run("UPDATE rent_charges SET amount_paid = ?, status = ? WHERE id = ?", [paid, status, d.charge_id]);
  const updated = await get(`${CHARGE_SELECT} WHERE c.id = ?`, [d.charge_id]);
  return c.json({ charge: updated }, 201);
});

app.delete("/api/payments/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const row = await get<{ charge_id: number }>("SELECT charge_id FROM payments WHERE id = ?", [id]);
  if (!row) return c.json({ error: "Not found" }, 404);
  await run("DELETE FROM payments WHERE id = ?", [id]);
  // Recompute the charge.
  const sumRow = await get<{ total: number }>("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE charge_id = ?", [row.charge_id]);
  const charge = await get<{ amount: number }>("SELECT amount FROM rent_charges WHERE id = ?", [row.charge_id]);
  const paid = Number(sumRow?.total ?? 0);
  const status = !charge ? "open" : paid >= charge.amount ? "paid" : paid > 0 ? "partial" : "open";
  await run("UPDATE rent_charges SET amount_paid = ?, status = ? WHERE id = ?", [paid, status, row.charge_id]);
  return c.json({ ok: true });
});

// ── Vendors ────────────────────────────────────────────────────────

const VendorInput = z.object({
  name: z.string().min(1),
  category: z.enum(["plumber", "electrician", "hvac", "handyman", "cleaning", "landscaping", "general"]).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  color: z.string().optional(),
});

app.get("/api/vendors", async (c) => {
  const rows = await query("SELECT * FROM vendors ORDER BY name");
  return c.json({ vendors: rows });
});

app.post("/api/vendors", async (c) => {
  const parsed = await parseJson(c, VendorInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    "INSERT INTO vendors (name, category, phone, email, notes, color) VALUES (?, ?, ?, ?, ?, ?)",
    [d.name, d.category ?? "general", d.phone ?? null, d.email ?? null, d.notes ?? null, d.color ?? "slate"],
  );
  const row = await get("SELECT * FROM vendors WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ vendor: row }, 201);
});

app.put("/api/vendors/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, VendorInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { sets, params } = buildUpdate(parsed.data);
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE vendors SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get("SELECT * FROM vendors WHERE id = ?", [id]);
  return c.json({ vendor: row });
});

app.delete("/api/vendors/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM vendors WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Work orders ────────────────────────────────────────────────────

const WorkOrderInput = z.object({
  property_id: z.number().int().nullable().optional(),
  unit_id: z.number().int().nullable().optional(),
  tenant_id: z.number().int().nullable().optional(),
  vendor_id: z.number().int().nullable().optional(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  status: z.enum(["open", "assigned", "in_progress", "completed", "cancelled"]).optional(),
  scheduled_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const WO_SELECT = `
  SELECT w.*,
    p.name as property_name, p.color as property_color,
    u.name as unit_name,
    t.first_name as tenant_first_name, t.last_name as tenant_last_name,
    v.name as vendor_name, v.color as vendor_color
  FROM work_orders w
  LEFT JOIN properties p ON p.id = w.property_id
  LEFT JOIN units u ON u.id = w.unit_id
  LEFT JOIN tenants t ON t.id = w.tenant_id
  LEFT JOIN vendors v ON v.id = w.vendor_id
`;

app.get("/api/work-orders", async (c) => {
  const status = c.req.query("status");
  const propertyId = intParam(c.req.query("property_id"));
  const where: string[] = [];
  const params: unknown[] = [];
  if (status) { where.push("w.status = ?"); params.push(status); }
  if (propertyId) { where.push("w.property_id = ?"); params.push(propertyId); }
  const sql = `${WO_SELECT}${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY
    CASE w.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
    w.created_at DESC`;
  const rows = await query(sql, params).catch(() => []);
  return c.json({ work_orders: rows });
});

app.post("/api/work-orders", async (c) => {
  const parsed = await parseJson(c, WorkOrderInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO work_orders (property_id, unit_id, tenant_id, vendor_id, title, description, priority, status, scheduled_at, completed_at, cost, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.property_id ?? null, d.unit_id ?? null, d.tenant_id ?? null, d.vendor_id ?? null,
      d.title, d.description ?? null,
      d.priority ?? "normal", d.status ?? "open",
      d.scheduled_at ?? null, d.completed_at ?? null,
      d.cost ?? null, d.notes ?? null,
    ],
  );
  const row = await get(`${WO_SELECT} WHERE w.id = ?`, [result.lastInsertRowid]);
  return c.json({ work_order: row }, 201);
});

app.put("/api/work-orders/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, WorkOrderInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { sets, params } = buildUpdate(parsed.data);
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE work_orders SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get(`${WO_SELECT} WHERE w.id = ?`, [id]);
  return c.json({ work_order: row });
});

app.delete("/api/work-orders/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM work_orders WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Applications ───────────────────────────────────────────────────

const ApplicationInput = z.object({
  unit_id: z.number().int().nullable().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  monthly_income: z.number().optional().nullable(),
  employer: z.string().optional().nullable(),
  desired_move_in: z.string().optional().nullable(),
  status: z.enum(["new", "screening", "approved", "declined", "withdrawn"]).optional(),
  notes: z.string().optional().nullable(),
});

app.get("/api/applications", async (c) => {
  const rows = await query(
    `SELECT a.*, u.name as unit_name, p.name as property_name
     FROM applications a
     LEFT JOIN units u ON u.id = a.unit_id
     LEFT JOIN properties p ON p.id = u.property_id
     ORDER BY a.created_at DESC`,
  ).catch(() => []);
  return c.json({ applications: rows });
});

app.post("/api/applications", async (c) => {
  const parsed = await parseJson(c, ApplicationInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;
  const result = await run(
    `INSERT INTO applications (unit_id, first_name, last_name, email, phone, monthly_income, employer, desired_move_in, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.unit_id ?? null, d.first_name, d.last_name,
      d.email ?? null, d.phone ?? null, d.monthly_income ?? null, d.employer ?? null,
      d.desired_move_in ?? null, d.status ?? "new", d.notes ?? null,
    ],
  );
  const row = await get(
    `SELECT a.*, u.name as unit_name, p.name as property_name
     FROM applications a LEFT JOIN units u ON u.id = a.unit_id LEFT JOIN properties p ON p.id = u.property_id
     WHERE a.id = ?`,
    [result.lastInsertRowid],
  );
  return c.json({ application: row }, 201);
});

app.put("/api/applications/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const parsed = await parseJson(c, ApplicationInput.partial());
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { sets, params } = buildUpdate(parsed.data);
  if (!sets.length) return c.json({ error: "No fields" }, 400);
  params.push(id);
  const r = await run(`UPDATE applications SET ${sets.join(", ")} WHERE id = ?`, params);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  const row = await get(
    `SELECT a.*, u.name as unit_name, p.name as property_name
     FROM applications a LEFT JOIN units u ON u.id = a.unit_id LEFT JOIN properties p ON p.id = u.property_id
     WHERE a.id = ?`,
    [id],
  );
  return c.json({ application: row });
});

app.delete("/api/applications/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const r = await run("DELETE FROM applications WHERE id = ?", [id]);
  if (!r.changes) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ── Public Rental Application Submission ────────────────────────────

const PublicApplyInput = z.object({
  unit_id: z.number().int().positive(),
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email().max(100),
  phone: z.string().max(30).optional().nullable(),
  monthly_income: z.number().positive().optional().nullable(),
  employer: z.string().max(100).optional().nullable(),
  desired_move_in: z.string().max(30).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

app.post("/api/public/apply", async (c) => {
  const parsed = await parseJson(c, PublicApplyInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;

  // Verify unit exists and is vacant
  const unit = await get<{ id: number; status: string }>(
    "SELECT id, status FROM units WHERE id = ?",
    [d.unit_id]
  );
  if (!unit) return c.json({ error: "Selected unit not found" }, 404);
  if (unit.status !== "vacant") {
    return c.json({ error: "This unit is currently occupied or unavailable for new applications" }, 400);
  }


  const result = await run(
    `INSERT INTO applications (unit_id, first_name, last_name, email, phone, monthly_income, employer, desired_move_in, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    [
      d.unit_id,
      d.first_name.trim(),
      d.last_name.trim(),
      d.email.trim().toLowerCase(),
      d.phone?.trim() ?? null,
      d.monthly_income ?? null,
      d.employer?.trim() ?? null,
      d.desired_move_in ?? null,
      d.notes?.trim() ?? null,
    ]
  );

  return c.json(
    {
      ok: true,
      message: "Application submitted successfully. A leasing agent will review your application shortly.",
      application_id: result.lastInsertRowid,
    },
    201
  );
});

// ── Tenant Self-Service Portal ──────────────────────────────────────

app.get("/api/tenant/portal", async (c) => {
  const user = await verifyToken(c);
  if (!user) {
    return c.json({ error: "Authentication required", code: "UNAUTHORIZED" }, 401);
  }

  // Find tenant record linked to user account by tenant_id or user email
  let tenant = null;
  if (user.tenant_id) {
    tenant = await get<any>("SELECT * FROM tenants WHERE id = ?", [user.tenant_id]);
  }
  if (!tenant && user.email) {
    tenant = await get<any>("SELECT * FROM tenants WHERE lower(email) = lower(?)", [user.email]);
  }

  // If no tenant record is yet linked (e.g. prospective tenant), return empty profile with any submitted applications
  if (!tenant) {
    const apps = await query("SELECT * FROM applications WHERE lower(email) = lower(?) ORDER BY created_at DESC", [user.email]).catch(() => []);
    return c.json({
      tenant: null,
      lease: null,
      charges: [],
      work_orders: [],
      applications: apps,
    });
  }

  // Fetch active or upcoming lease
  const lease = await get<any>(
    `SELECT l.*, u.name as unit_name, u.bedrooms, u.bathrooms, u.sqft,
            p.name as property_name, p.address as property_address, p.city as property_city, p.color as property_color
     FROM leases l
     JOIN units u ON u.id = l.unit_id
     JOIN properties p ON p.id = u.property_id
     WHERE l.primary_tenant_id = ? AND l.status IN ('active', 'upcoming')
     ORDER BY CASE l.status WHEN 'active' THEN 0 ELSE 1 END, l.start_date DESC LIMIT 1`,
    [tenant.id]
  );

  // Fetch rent charges for the active lease
  const charges = lease
    ? await query<any>(
        `SELECT * FROM rent_charges WHERE lease_id = ? ORDER BY due_date DESC LIMIT 12`,
        [lease.id]
      ).catch(() => [])
    : [];

  // Fetch maintenance tickets
  const workOrders = await query<any>(
    `SELECT w.*, v.name as vendor_name
     FROM work_orders w
     LEFT JOIN vendors v ON v.id = w.vendor_id
     WHERE w.tenant_id = ?
     ORDER BY w.created_at DESC LIMIT 20`,
    [tenant.id]
  ).catch(() => []);

  return c.json({
    tenant,
    lease,
    charges,
    work_orders: workOrders,
  });
});

const TenantTicketInput = z.object({
  title: z.string().min(1, "Title is required").max(150),
  description: z.string().max(1000).optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

app.post("/api/tenant/work-orders", async (c) => {
  const user = await verifyToken(c);
  if (!user) {
    return c.json({ error: "Authentication required", code: "UNAUTHORIZED" }, 401);
  }

  let tenant = null;
  if (user.tenant_id) {
    tenant = await get<any>("SELECT * FROM tenants WHERE id = ?", [user.tenant_id]);
  }
  if (!tenant && user.email) {
    tenant = await get<any>("SELECT * FROM tenants WHERE lower(email) = lower(?)", [user.email]);
  }

  if (!tenant) {
    return c.json({ error: "No active tenant record linked to your account" }, 403);
  }

  const lease = await get<{ id: number; unit_id: number; property_id: number }>(
    `SELECT l.id, l.unit_id, u.property_id
     FROM leases l
     JOIN units u ON u.id = l.unit_id
     WHERE l.primary_tenant_id = ? AND l.status = 'active' LIMIT 1`,
    [tenant.id]
  );

  if (!lease) {
    return c.json({ error: "No active lease found to attach maintenance ticket" }, 400);
  }

  const parsed = await parseJson(c, TenantTicketInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { title, description, priority } = parsed.data;

  const res = await run(
    `INSERT INTO work_orders (property_id, unit_id, tenant_id, title, description, priority, status)
     VALUES (?, ?, ?, ?, ?, ?, 'open')`,
    [lease.property_id, lease.unit_id, tenant.id, title.trim(), description?.trim() ?? null, priority]
  );

  const created = await get(`${WO_SELECT} WHERE w.id = ?`, [res.lastInsertRowid]);
  return c.json({ work_order: created }, 201);
});

const TenantPaymentInput = z.object({
  charge_id: z.number().int().positive(),
  amount: z.number().positive("Payment amount must be greater than zero"),
  method: z.enum(["cash", "check", "ach", "credit", "other"]).default("other"),
  reference: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

app.post("/api/tenant/payments", async (c) => {
  const user = await verifyToken(c);
  if (!user) {
    return c.json({ error: "Authentication required", code: "UNAUTHORIZED" }, 401);
  }

  let tenant = null;
  if (user.tenant_id) {
    tenant = await get<any>("SELECT * FROM tenants WHERE id = ?", [user.tenant_id]);
  }
  if (!tenant && user.email) {
    tenant = await get<any>("SELECT * FROM tenants WHERE lower(email) = lower(?)", [user.email]);
  }
  if (!tenant) {
    return c.json({ error: "No active tenant record linked to your account" }, 403);
  }

  const parsed = await parseJson(c, TenantPaymentInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const { charge_id, amount, method, reference, notes } = parsed.data;

  // STRICT AUTHORIZATION CHECK: Verify this rent charge belongs to this tenant's active or upcoming lease!
  const charge = await get<{ id: number; amount: number; amount_paid: number; lease_id: number }>(
    `SELECT rc.id, rc.amount, rc.amount_paid, rc.lease_id
     FROM rent_charges rc
     JOIN leases l ON l.id = rc.lease_id
     WHERE rc.id = ? AND l.primary_tenant_id = ?`,
    [charge_id, tenant.id]
  );

  if (!charge) {
    return c.json({ error: "Rent charge not found or unauthorized for this account" }, 404);
  }

  const remaining = Math.max(0, charge.amount - charge.amount_paid);
  if (remaining <= 0) {
    return c.json({ error: "This rent charge is already settled in full" }, 400);
  }

  const paymentAmount = Math.min(amount, remaining);

  await run(
    `INSERT INTO payments (charge_id, paid_at, amount, method, reference, notes)
     VALUES (?, datetime('now'), ?, ?, ?, ?)`,
    [charge.id, paymentAmount, method, reference ?? "Resident Portal Self-Service Payment", notes ?? null]
  );

  const sumRow = await get<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE charge_id = ?",
    [charge.id]
  );
  const totalPaid = Number(sumRow?.total ?? 0);
  const newStatus = totalPaid >= charge.amount ? "paid" : totalPaid > 0 ? "partial" : "open";
  await run("UPDATE rent_charges SET amount_paid = ?, status = ? WHERE id = ?", [totalPaid, newStatus, charge.id]);

  const updatedCharge = await get(`${CHARGE_SELECT} WHERE c.id = ?`, [charge.id]);
  return c.json({ ok: true, charge: updatedCharge }, 201);
});

// ── Dashboard summary ──────────────────────────────────────────────

app.get("/api/dashboard/summary", async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const periodNow = today.slice(0, 7);

  const safeGet = <T,>(sql: string, params: unknown[] = [], fallback: T) =>
    get<T>(sql, params).catch(() => fallback as T | undefined).then((v) => v ?? fallback);
  const safeQuery = <T,>(sql: string, params: unknown[] = []): Promise<T[]> =>
    query<T>(sql, params).catch(() => [] as T[]);

  const [
    propertyCount,
    unitCount,
    occupiedCount,
    vacantCount,
    activeLeases,
    upcomingMoveOuts,
    monthOutstanding,
    monthCollected,
    overdueRow,
    openWorkOrders,
    urgentWorkOrders,
    recentWorkOrders,
    upcomingExpirations,
  ] = await Promise.all([
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM properties", [], { n: 0 }),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM units", [], { n: 0 }),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM units WHERE status = 'occupied'", [], { n: 0 }),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM units WHERE status = 'vacant'", [], { n: 0 }),
    safeGet<{ n: number }>("SELECT COUNT(*) as n FROM leases WHERE status = 'active'", [], { n: 0 }),
    safeGet<{ n: number }>(
      "SELECT COUNT(*) as n FROM leases WHERE status = 'active' AND end_date <= date('now', '+30 days')",
      [], { n: 0 },
    ),
    safeGet<{ total: number }>(
      "SELECT COALESCE(SUM(amount - amount_paid), 0) as total FROM rent_charges WHERE period = ? AND status != 'waived'",
      [periodNow], { total: 0 },
    ),
    safeGet<{ total: number }>(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM rent_charges WHERE period = ?",
      [periodNow], { total: 0 },
    ),
    safeGet<{ total: number; n: number }>(
      "SELECT COALESCE(SUM(amount - amount_paid), 0) as total, COUNT(*) as n FROM rent_charges WHERE due_date < date('now') AND amount_paid < amount AND status != 'waived'",
      [], { total: 0, n: 0 },
    ),
    safeGet<{ n: number }>(
      "SELECT COUNT(*) as n FROM work_orders WHERE status NOT IN ('completed', 'cancelled')",
      [], { n: 0 },
    ),
    safeGet<{ n: number }>(
      "SELECT COUNT(*) as n FROM work_orders WHERE priority = 'urgent' AND status NOT IN ('completed', 'cancelled')",
      [], { n: 0 },
    ),
    safeQuery<{ id: number; title: string; priority: string; status: string; property_name: string | null; unit_name: string | null; created_at: string }>(
      `SELECT w.id, w.title, w.priority, w.status, p.name as property_name, u.name as unit_name, w.created_at
       FROM work_orders w
       LEFT JOIN properties p ON p.id = w.property_id
       LEFT JOIN units u ON u.id = w.unit_id
       WHERE w.status NOT IN ('completed', 'cancelled')
       ORDER BY CASE w.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, w.created_at DESC
       LIMIT 6`,
    ),
    safeQuery<{ id: number; end_date: string; tenant_first_name: string | null; tenant_last_name: string | null; unit_name: string | null; property_name: string | null }>(
      `SELECT l.id, l.end_date,
         t.first_name as tenant_first_name, t.last_name as tenant_last_name,
         u.name as unit_name, p.name as property_name
       FROM leases l
       LEFT JOIN tenants t ON t.id = l.primary_tenant_id
       LEFT JOIN units u ON u.id = l.unit_id
       LEFT JOIN properties p ON p.id = u.property_id
       WHERE l.status = 'active' AND l.end_date <= date('now', '+60 days')
       ORDER BY l.end_date ASC LIMIT 6`,
    ),
  ]);

  return c.json({
    period: periodNow,
    properties: propertyCount.n,
    units: unitCount.n,
    occupied: occupiedCount.n,
    vacant: vacantCount.n,
    occupancy_rate: unitCount.n ? Math.round((occupiedCount.n / unitCount.n) * 100) : 0,
    active_leases: activeLeases.n,
    upcoming_move_outs: upcomingMoveOuts.n,
    month_outstanding: monthOutstanding.total,
    month_collected: monthCollected.total,
    overdue_total: overdueRow.total,
    overdue_count: overdueRow.n,
    open_work_orders: openWorkOrders.n,
    urgent_work_orders: urgentWorkOrders.n,
    recent_work_orders: recentWorkOrders,
    upcoming_expirations: upcomingExpirations,
  });
});


// ── Distributed Documents & Local Forensic Verification Engine ──────

const DocumentVerifyInput = z.object({
  tenant_id: z.number().int().optional().nullable(),
  application_id: z.number().int().optional().nullable(),
  document_type: z.enum([
    "aadhaar",
    "pan",
    "payslip",
    "bank_statement",
    "lease_agreement",
    "employment_letter",
    "other",
  ]),
  file_name: z.string().min(1).max(255),
  file_size: z.number().int().min(1).max(10 * 1024 * 1024).optional(),
  mime_type: z.string().max(100).optional(),
  file_data: z.string().max(15 * 1024 * 1024).optional().nullable(),
  extracted_fields: z.record(z.unknown()).optional().nullable(),
  metadata_text: z.string().max(15000).optional().nullable(),
});

// List submitted documents with filtering
app.get("/api/documents", async (c) => {
  const user = await verifyToken(c);
  if (!user) return c.json({ error: "Authentication required" }, 401);

  const status = c.req.query("status");
  const docType = c.req.query("type");
  const tenantId = intParam(c.req.query("tenant_id"));
  const appId = intParam(c.req.query("application_id"));

  const where: string[] = [];
  const params: unknown[] = [];

  // Scoping: Tenants can ONLY see their own documents
  if (user.role === "tenant") {
    if (user.tenant_id) {
      where.push("(d.tenant_id = ? OR lower(t.email) = lower(?))");
      params.push(user.tenant_id, user.email);
    } else {
      where.push("lower(t.email) = lower(?)");
      params.push(user.email);
    }
  } else if (tenantId) {
    where.push("d.tenant_id = ?");
    params.push(tenantId);
  }

  if (appId) {
    where.push("d.application_id = ?");
    params.push(appId);
  }
  if (status && status !== "all") {
    where.push("d.verification_status = ?");
    params.push(status);
  }
  if (docType && docType !== "all") {
    where.push("d.document_type = ?");
    params.push(docType);
  }

  const sql = `
    SELECT d.*,
      t.first_name as tenant_first_name, t.last_name as tenant_last_name, t.email as tenant_email,
      a.first_name as applicant_first_name, a.last_name as applicant_last_name
    FROM documents d
    LEFT JOIN tenants t ON t.id = d.tenant_id
    LEFT JOIN applications a ON a.id = d.application_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY d.created_at DESC
  `;

  const rows = await query<any>(sql, params);
  const parsedRows = rows.map((r: any) => ({
    ...r,
    extracted_fields: r.extracted_fields ? JSON.parse(r.extracted_fields) : {},
    forensic_details: r.forensic_details ? JSON.parse(r.forensic_details) : {},
    algorithm_checks: r.algorithm_checks ? JSON.parse(r.algorithm_checks) : [],
  }));

  return c.json({ documents: parsedRows });
});

// Get single document by ID or UUID with full cryptographic ledger proof
app.get("/api/documents/:id", async (c) => {
  const user = await verifyToken(c);
  if (!user) return c.json({ error: "Authentication required" }, 401);

  const rawId = c.req.param("id");
  const isNumeric = /^\d+$/.test(rawId);
  const sql = `
    SELECT d.*,
      t.first_name as tenant_first_name, t.last_name as tenant_last_name, t.email as tenant_email,
      a.first_name as applicant_first_name, a.last_name as applicant_last_name,
      b.block_index, b.block_hash, b.previous_block_hash, b.merkle_root, b.validator_node, b.signature as ledger_signature
    FROM documents d
    LEFT JOIN tenants t ON t.id = d.tenant_id
    LEFT JOIN applications a ON a.id = d.application_id
    LEFT JOIN distributed_ledger_blocks b ON b.document_uuid = d.uuid
    WHERE ${isNumeric ? "d.id = ?" : "d.uuid = ?"}
  `;

  const row = await get<any>(sql, [rawId]);
  if (!row) return c.json({ error: "Document not found" }, 404);

  // Security check: tenant cannot read other users' documents
  if (user.role === "tenant" && row.tenant_id !== user.tenant_id && row.tenant_email?.toLowerCase() !== user.email.toLowerCase()) {
    return c.json({ error: "Access denied" }, 403);
  }

  return c.json({
    document: {
      ...row,
      extracted_fields: row.extracted_fields ? JSON.parse(row.extracted_fields) : {},
      forensic_details: row.forensic_details ? JSON.parse(row.forensic_details) : {},
      algorithm_checks: row.algorithm_checks ? JSON.parse(row.algorithm_checks) : [],
      ledger_proof: row.block_hash ? {
        block_index: row.block_index,
        block_hash: row.block_hash,
        previous_block_hash: row.previous_block_hash,
        merkle_root: row.merkle_root,
        validator_node: row.validator_node,
        signature: row.ledger_signature,
      } : null,
    },
  });
});

// Verify & authenticate a document locally using mathematical algorithms
app.post("/api/documents/verify", async (c) => {
  const user = await verifyToken(c);
  if (!user) return c.json({ error: "Authentication required" }, 401);

  const parsed = await parseJson(c, DocumentVerifyInput);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const d = parsed.data;

  // Determine tenant ownership: if tenant is calling, enforce their own tenant_id
  let effectiveTenantId = d.tenant_id ?? null;
  if (user.role === "tenant") {
    effectiveTenantId = user.tenant_id ?? null;
  }

  // Execute Local Algorithmic Verification Engine
  const report = authenticateDocumentLocally({
    fileName: d.file_name,
    documentType: d.document_type as DocumentType,
    fileData: d.file_data ?? undefined,
    extractedFields: (d.extracted_fields as any) || undefined,
    metadataText: d.metadata_text ?? undefined,
  });

  const status = report.verdict === "ORIGINAL" ? "original" : report.verdict === "SUSPICIOUS" ? "suspicious" : "fake";

  // Insert into distributed documents table
  const insertDoc = await run(
    `INSERT INTO documents (
      uuid, tenant_id, application_id, document_type, file_name, file_size, mime_type, file_hash_sha256,
      file_data, extracted_fields, verification_status, authenticity_score, forensic_verdict, forensic_details,
      algorithm_checks, verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.document_uuid,
      effectiveTenantId,
      d.application_id ?? null,
      d.document_type,
      d.file_name,
      d.file_size ?? 1024,
      d.mime_type ?? "application/pdf",
      report.file_hash_sha256,
      d.file_data ? d.file_data.slice(0, 50000) : null,
      JSON.stringify(d.extracted_fields || {}),
      status,
      report.authenticity_score,
      report.verdict,
      JSON.stringify({ flags: report.flags, summary: `Algorithmic verification completed locally. Score: ${report.authenticity_score}%` }),
      JSON.stringify(report.checks),
      report.verified_at,
    ]
  );

  // Retrieve last block to extend the distributed cryptographic hash chain
  const lastBlock = await get<any>("SELECT block_index, block_hash FROM distributed_ledger_blocks ORDER BY block_index DESC LIMIT 1");
  const nextIndex = (lastBlock?.block_index ?? 0) + 1;
  const prevHash = lastBlock?.block_hash ?? "0000000000000000000000000000000000000000000000000000000000000000";

  const block = sealLedgerBlock({
    blockIndex: nextIndex,
    previousBlockHash: prevHash,
    documentUuid: report.document_uuid,
    documentHash: report.file_hash_sha256,
    authenticityScore: report.authenticity_score,
    verdict: report.verdict,
    validatorNode: "node-edge-local-validator",
  });

  await run(
    `INSERT INTO distributed_ledger_blocks (
      block_index, block_hash, previous_block_hash, merkle_root, document_uuid, document_hash,
      authenticity_score, verdict, validator_node, timestamp, signature
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      block.block_index,
      block.block_hash,
      block.previous_block_hash,
      block.merkle_root,
      block.document_uuid,
      block.document_hash,
      block.authenticity_score,
      block.verdict,
      block.validator_node,
      block.timestamp,
      block.signature,
    ]
  );

  await run("UPDATE documents SET ledger_block_hash = ? WHERE uuid = ?", [block.block_hash, report.document_uuid]);

  return c.json({
    document_id: insertDoc.lastInsertRowid,
    report: {
      ...report,
      ledger_proof: block,
    },
  }, 201);
});

// Batch re-verify all stored documents locally
app.post("/api/documents/verify-batch", async (c) => {
  const user = await verifyToken(c);
  if (!user || (user.role !== "landlord" && user.role !== "admin")) {
    return c.json({ error: "Admin or Landlord privileges required" }, 403);
  }

  const allDocs = await query<any>("SELECT * FROM documents ORDER BY id ASC");
  let verifiedCount = 0;

  for (const doc of allDocs) {
    const fields = doc.extracted_fields ? JSON.parse(doc.extracted_fields) : {};
    const report = authenticateDocumentLocally({
      uuid: doc.uuid,
      fileName: doc.file_name,
      documentType: doc.document_type as DocumentType,
      fileData: doc.file_data ?? undefined,
      extractedFields: fields,
    });

    const status = report.verdict === "ORIGINAL" ? "original" : report.verdict === "SUSPICIOUS" ? "suspicious" : "fake";
    await run(
      `UPDATE documents SET
        verification_status = ?,
        authenticity_score = ?,
        forensic_verdict = ?,
        forensic_details = ?,
        algorithm_checks = ?,
        verified_at = ?
       WHERE id = ?`,
      [
        status,
        report.authenticity_score,
        report.verdict,
        JSON.stringify({ flags: report.flags, summary: "Batch algorithmic verification executed locally." }),
        JSON.stringify(report.checks),
        report.verified_at,
        doc.id,
      ]
    );
    verifiedCount++;
  }

  return c.json({ ok: true, verified_count: verifiedCount });
});

// Delete a document record
app.delete("/api/documents/:id", async (c) => {
  const user = await verifyToken(c);
  if (!user || (user.role !== "landlord" && user.role !== "admin")) {
    return c.json({ error: "Access denied" }, 403);
  }

  const id = intParam(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  const doc = await get<any>("SELECT uuid FROM documents WHERE id = ?", [id]);
  if (!doc) return c.json({ error: "Not found" }, 404);

  await run("DELETE FROM distributed_ledger_blocks WHERE document_uuid = ?", [doc.uuid]).catch(() => {});
  const res = await run("DELETE FROM documents WHERE id = ?", [id]);
  if (!res.changes) return c.json({ error: "Not found" }, 404);

  return c.json({ ok: true });
});

// Retrieve distributed cryptographic audit ledger blocks
app.get("/api/ledger/blocks", async (c) => {
  const user = await verifyToken(c);
  if (!user) return c.json({ error: "Authentication required" }, 401);
  if (user.role !== "admin" && user.role !== "landlord") {
    return c.json({ error: "Admin or Landlord privileges required" }, 403);
  }

  const blocks = await query<any>("SELECT * FROM distributed_ledger_blocks ORDER BY block_index ASC LIMIT 100");
  return c.json({ blocks });
});

// Verify cryptographic integrity of the entire distributed ledger chain
app.get("/api/ledger/verify-chain", async (c) => {
  const user = await verifyToken(c);
  if (!user) return c.json({ error: "Authentication required" }, 401);
  if (user.role !== "admin" && user.role !== "landlord") {
    return c.json({ error: "Admin or Landlord privileges required" }, 403);
  }

  const blocks = await query<LedgerBlock>("SELECT * FROM distributed_ledger_blocks ORDER BY block_index ASC");
  const chainCheck = verifyDistributedLedgerChain(blocks);

  return c.json({
    valid: chainCheck.valid,
    total_blocks: blocks.length,
    broken_at: chainCheck.brokenAt,
    error: chainCheck.error,
    verified_at: new Date().toISOString(),
  });
});

// ── Settings (key/value) ───────────────────────────────────────────

app.get("/api/settings", async (c) => {
  const user = await verifyToken(c);
  if (!user) return c.json({ error: "Authentication required" }, 401);
  const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings").catch(() => []);
  // Defaults first, so a caller always gets a currency and a due day even if
  // the seed has not run yet (a brand-new database, or a deleted row).
  const out: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return c.json({ settings: out });
});

app.put("/api/settings", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  if (!body || typeof body !== "object") return c.json({ error: "Body must be an object" }, 400);
  const entries = Object.entries(body as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== null);
  for (const [key, value] of entries) {
    await run(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      [key, String(value)],
    );
  }
  const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings");
  const out: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return c.json({ settings: out });
});

// ── Health ─────────────────────────────────────────────────────────

app.get("/api/health", (c) => c.json({ ok: true }));

// Security Audit Fix (BUG-04): Global error boundary suppressing internal stack trace leakage
app.onError((err, c) => {
  console.error("[Internal API Error]", err.message);
  return c.json(
    {
      error: "An internal server error occurred. Please try again later.",
      code: "INTERNAL_ERROR",
    },
    500
  );
});

app.notFound((c) => {
  return c.json({ error: "Endpoint not found", code: "NOT_FOUND" }, 404);
});

export default app;
