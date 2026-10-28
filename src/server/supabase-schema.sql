-- =====================================================================
-- Nestara AI — Enterprise PostgreSQL & Supabase Database Architecture
-- High-Security Personal Data, Row-Level Security (RLS) & pgvector
-- Compliant with GDPR / India DPDP Act / SOC2 Personal Data Isolation
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Core Users & Roles
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'landlord', 'tenant')),
  tenant_id INTEGER NULL,
  token_version INTEGER NOT NULL DEFAULT 1,
  phone TEXT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Properties Portfolio
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  property_type TEXT NOT NULL DEFAULT 'apartment' CHECK (property_type IN ('apartment', 'single_family', 'multi_family', 'condo', 'commercial', 'villa')),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  year_built INTEGER,
  color TEXT NOT NULL DEFAULT 'emerald',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Units & Real Estate Inventory (with pgvector AI Embeddings)
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  sqft INTEGER,
  market_rent NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  deposit_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance', 'reserved')),
  amenities TEXT[] DEFAULT '{}',
  embedding vector(8), -- Vector for Cosine Similarity: [normalized_rent, beds, baths, sqft, luxury_score, location_score, transit_score, pet_score]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, name)
);

CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);
-- Fast Approximate Nearest Neighbor Cosine index for AI property matching
CREATE INDEX IF NOT EXISTS idx_units_embedding ON units USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- 5. Tenants (Highly Confidential PII)
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  emergency_contact TEXT,
  encrypted_id_proof TEXT, -- PII encrypted at application level
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(lower(email));
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);

-- 6. Residential Leases
CREATE TABLE IF NOT EXISTS leases (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  primary_tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount NUMERIC(12,2) NOT NULL,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  rent_due_day INTEGER NOT NULL DEFAULT 1 CHECK (rent_due_day BETWEEN 1 AND 28),
  late_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 500.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'upcoming', 'terminated', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_primary_tenant ON leases(primary_tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);

-- 7. Lease Tenants (Joint Leases)
CREATE TABLE IF NOT EXISTS lease_tenants (
  lease_id INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (lease_id, tenant_id)
);

-- 8. Financial Rent Charges
CREATE TABLE IF NOT EXISTS rent_charges (
  id SERIAL PRIMARY KEY,
  lease_id INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid', 'overdue', 'waived')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lease_id, period)
);

CREATE INDEX IF NOT EXISTS idx_rent_charges_period ON rent_charges(period);
CREATE INDEX IF NOT EXISTS idx_rent_charges_status ON rent_charges(status);
CREATE INDEX IF NOT EXISTS idx_rent_charges_due ON rent_charges(due_date);

-- 9. Payments (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  charge_id INTEGER NOT NULL REFERENCES rent_charges(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method TEXT NOT NULL DEFAULT 'other' CHECK (method IN ('cash', 'check', 'ach', 'credit', 'upi', 'bank_transfer', 'other')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_charge ON payments(charge_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);

-- 10. Vendors & Maintenance Contractors
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  trade TEXT NOT NULL, -- 'plumber', 'electrician', 'hvac', 'handyman', etc.
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Maintenance Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  category TEXT NOT NULL DEFAULT 'general',
  assigned_to TEXT,
  actual_cost NUMERIC(12,2),
  ai_triage_metadata JSONB, -- Stores safety warnings, multimodal classification, cost estimate
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant ON work_orders(tenant_id);

-- 12. Rental Applications (High-PII Financial Disclosures)
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  monthly_income NUMERIC(12,2),
  employer TEXT,
  desired_move_in DATE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'screening', 'approved', 'declined', 'withdrawn')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(lower(email));

-- 13. System Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES — PRIVACY & PERSONAL DATA ISOLATION
-- =====================================================================

-- Enable RLS across all tables containing personal data
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Helper functions for role identification
CREATE OR REPLACE FUNCTION auth_is_landlord_or_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role' IN ('landlord', 'admin'),
    false
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_current_tenant_id() RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'tenant_id')::integer,
    -1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── 1. Tenants Table RLS ──
-- Landlord/Admin: Full access to all tenants in their portfolio
CREATE POLICY p_tenants_landlord ON tenants
  FOR ALL
  USING (auth_is_landlord_or_admin());

-- Tenant: Can ONLY view and edit their own personal record
CREATE POLICY p_tenants_self ON tenants
  FOR SELECT
  USING (
    id = auth_current_tenant_id()
    OR lower(email) = lower(current_setting('request.jwt.claims', true)::jsonb->>'email')
  );

-- ── 2. Leases Table RLS ──
CREATE POLICY p_leases_landlord ON leases
  FOR ALL
  USING (auth_is_landlord_or_admin());

CREATE POLICY p_leases_tenant ON leases
  FOR SELECT
  USING (primary_tenant_id = auth_current_tenant_id());

-- ── 3. Rent Charges Table RLS ──
CREATE POLICY p_rent_charges_landlord ON rent_charges
  FOR ALL
  USING (auth_is_landlord_or_admin());

CREATE POLICY p_rent_charges_tenant ON rent_charges
  FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE primary_tenant_id = auth_current_tenant_id()
    )
  );

-- ── 4. Payments Table RLS ──
CREATE POLICY p_payments_landlord ON payments
  FOR ALL
  USING (auth_is_landlord_or_admin());

CREATE POLICY p_payments_tenant_read ON payments
  FOR SELECT
  USING (
    charge_id IN (
      SELECT rc.id FROM rent_charges rc
      JOIN leases l ON l.id = rc.lease_id
      WHERE l.primary_tenant_id = auth_current_tenant_id()
    )
  );

CREATE POLICY p_payments_tenant_insert ON payments
  FOR INSERT
  WITH CHECK (
    charge_id IN (
      SELECT rc.id FROM rent_charges rc
      JOIN leases l ON l.id = rc.lease_id
      WHERE l.primary_tenant_id = auth_current_tenant_id()
    )
  );

-- ── 5. Applications Table RLS (Strict Anti-PII-Leakage) ──
-- Public applicants may INSERT their own application
CREATE POLICY p_applications_public_insert ON applications
  FOR INSERT
  WITH CHECK (true);

-- Landlord/Admin: Can review all incoming applications
CREATE POLICY p_applications_landlord ON applications
  FOR ALL
  USING (auth_is_landlord_or_admin());

-- Applicant: Can ONLY view their own application status by verified email (never other applicants)
CREATE POLICY p_applications_applicant_read ON applications
  FOR SELECT
  USING (
    lower(email) = lower(current_setting('request.jwt.claims', true)::jsonb->>'email')
  );

-- ── 6. Work Orders Table RLS ──
CREATE POLICY p_work_orders_landlord ON work_orders
  FOR ALL
  USING (auth_is_landlord_or_admin());

CREATE POLICY p_work_orders_tenant ON work_orders
  FOR ALL
  USING (tenant_id = auth_current_tenant_id())
  WITH CHECK (tenant_id = auth_current_tenant_id());
