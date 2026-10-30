-- Clean rebuild: drops (in reverse dependency order) then creates fresh.
-- D1 doesn't have an interactive shell by default, so keep this idempotent.

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS distributed_ledger_blocks;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS rent_charges;
DROP TABLE IF EXISTS work_orders;
DROP TABLE IF EXISTS leases;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

-- ── Properties ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single_family', -- 'single_family' | 'multi_family' | 'condo' | 'townhouse' | 'commercial'
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  year_built INTEGER,
  notes TEXT,
  color TEXT NOT NULL DEFAULT 'sky',           -- badge/card accent: 'emerald' | 'amber' | 'rose' | 'indigo' | 'violet' | 'sky' | 'teal'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);

-- ── Units ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- e.g. 'Unit 1A', 'Suite 200', 'Main House'
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms REAL NOT NULL DEFAULT 1.0,
  sqft INTEGER,
  market_rent INTEGER NOT NULL DEFAULT 0,      -- integer cents or integer rupees/dollars
  status TEXT NOT NULL DEFAULT 'vacant',       -- 'vacant' | 'occupied' | 'maintenance' | 'reserved'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);

-- ── Tenants ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  employer TEXT,
  monthly_income INTEGER,
  emergency_contact TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- ── Applications (Prospective Tenants) ─────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  monthly_income INTEGER,
  employer TEXT,
  desired_move_in TEXT,
  status TEXT NOT NULL DEFAULT 'new',          -- 'new' | 'screening' | 'approved' | 'rejected' | 'withdrawn'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_applications_unit ON applications(unit_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);

-- ── Leases ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  primary_tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  start_date TEXT NOT NULL,                    -- ISO 'YYYY-MM-DD'
  end_date TEXT NOT NULL,                      -- ISO 'YYYY-MM-DD'
  monthly_rent INTEGER NOT NULL,
  deposit INTEGER NOT NULL DEFAULT 0,
  rent_due_day INTEGER NOT NULL DEFAULT 1,     -- day of month (1..28)
  late_fee INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',       -- 'draft' | 'active' | 'upcoming' | 'expired' | 'terminated'
  e_sign_status TEXT NOT NULL DEFAULT 'signed',-- 'pending' | 'signed' | 'waived'
  signed_at TEXT,                              -- ISO timestamp of resident signature
  signer_name TEXT,                            -- Full verified resident signature name
  signature_hash TEXT,                         -- Cryptographic SHA-256 seal of the execution
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(primary_tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_dates ON leases(start_date, end_date);

-- ── Rent Charges (Monthly Ledger) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS rent_charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lease_id INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  period TEXT NOT NULL,                        -- 'YYYY-MM'
  due_date TEXT NOT NULL,                      -- ISO 'YYYY-MM-DD'
  amount INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',         -- 'open' | 'partial' | 'paid' | 'overdue' | 'void'
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_charges_lease_period ON rent_charges(lease_id, period);
CREATE INDEX IF NOT EXISTS idx_charges_status ON rent_charges(status);
CREATE INDEX IF NOT EXISTS idx_charges_due ON rent_charges(due_date);

-- ── Payments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  charge_id INTEGER NOT NULL REFERENCES rent_charges(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_date TEXT NOT NULL DEFAULT (datetime('now')),
  method TEXT NOT NULL DEFAULT 'other',        -- 'cash' | 'check' | 'ach' | 'credit' | 'other'
  reference TEXT,                              -- check #, transaction ID, etc.
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_charge ON payments(charge_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ── Vendors ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',    -- 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'roofing' | 'cleaning' | 'landscaping' | 'general'
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);

-- ── Work Orders (Maintenance Tickets) ───────────────────────────────
CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',     -- 'low' | 'normal' | 'high' | 'urgent'
  status TEXT NOT NULL DEFAULT 'open',         -- 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  cost INTEGER,                                -- total cost when completed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_work_orders_property ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_unit ON work_orders(unit_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant ON work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vendor ON work_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);

-- ── Settings (key/value store for app-wide defaults) ───────────────
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Users (Authentication & Multi-Tenant Access) ────────────────────
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tenant',         -- 'admin' | 'landlord' | 'tenant'
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  token_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- ── Audit Logs (Security & Compliance Tracking) ────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,                        -- 'reveal_pii' | 'export_data' | 'update_role' | 'delete_record'
  target_type TEXT NOT NULL,                   -- 'tenant' | 'application' | 'lease' | 'rent_ledger'
  target_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ── Submitted Tenant & Applicant Documents ──────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,                 -- 'aadhaar' | 'pan' | 'payslip' | 'bank_statement' | 'lease_agreement' | 'employment_letter' | 'other'
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash_sha256 TEXT NOT NULL,
  file_data TEXT,                              -- base64 or secure text preview
  extracted_fields TEXT,                       -- JSON string of extracted document fields
  verification_status TEXT NOT NULL DEFAULT 'pending', -- 'original' | 'suspicious' | 'fake' | 'pending'
  authenticity_score REAL NOT NULL DEFAULT 0.0, -- 0.0 to 100.0
  forensic_verdict TEXT NOT NULL DEFAULT 'Unverified',
  forensic_details TEXT,                       -- JSON string of forensic analysis summary & flags
  algorithm_checks TEXT,                       -- JSON string of individual algorithmic checks
  ledger_block_hash TEXT,                      -- Link to distributed cryptographic ledger
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_app ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(file_hash_sha256);

-- ── Distributed Cryptographic Audit Ledger (Merkle & Hash Chain) ──
CREATE TABLE IF NOT EXISTS distributed_ledger_blocks (
  block_index INTEGER PRIMARY KEY AUTOINCREMENT,
  block_hash TEXT NOT NULL UNIQUE,
  previous_block_hash TEXT NOT NULL,
  merkle_root TEXT NOT NULL,
  document_uuid TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  authenticity_score REAL NOT NULL,
  verdict TEXT NOT NULL,
  validator_node TEXT NOT NULL DEFAULT 'node-edge-primary',
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  signature TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_doc ON distributed_ledger_blocks(document_uuid);
CREATE INDEX IF NOT EXISTS idx_ledger_hash ON distributed_ledger_blocks(block_hash);

-- Demo data is seeded by the app on first read (ensureSeeded in
-- src/server/index.ts), never here: this file is applied as DDL only.
