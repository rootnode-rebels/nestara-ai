/**
 * Nestara AI — MongoDB Distributed Document Store Schema & Adapter
 *
 * Implements the MongoDB BSON/JSON document architecture paired with
 * the 3-Node Distributed Blockchain Ledger.
 *
 * Collections:
 * - properties: Property portfolios with geo coordinates and unit arrays
 * - units: Individual residence documents with amenities and rent schedules
 * - leases: Tenancy contracts with embedded cryptographic blockchain proofs
 * - tenants: Resident profiles with DPDP/GDPR PII compliance metadata
 * - rent_charges: Monthly accounting ledger documents with late fee tracking
 * - applications: Prospective tenant submissions with RTI risk scores
 * - blockchain_ledger: Immutable blocks holding SHA-256 Merkle proofs
 */

export interface MongoBlockchainProof {
  document_hash_sha256: string;
  ledger_block_index: number;
  ledger_block_hash: string;
  validator_node: string;
  verified_on: string;
}

export interface MongoPropertyDocument {
  _id: string; // ObjectId as string
  name: string;
  type: "single_family" | "multi_family" | "condo" | "townhouse" | "commercial";
  address: string;
  city: string;
  state: string;
  zip: string;
  year_built: number;
  color: string;
  amenities: string[];
  created_at: string;
}

export interface MongoLeaseDocument {
  _id: string;
  unit_id: string;
  property_id: string;
  primary_tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number;
  rent_due_day: number;
  late_fee: number;
  status: "active" | "upcoming" | "ended" | "evicted";
  e_sign_status: "signed" | "pending" | "declined";
  signed_at: string;
  signer_name: string;
  blockchain_proof: MongoBlockchainProof;
  created_at: string;
}

export interface MongoRentChargeDocument {
  _id: string;
  lease_id: string;
  period: string; // YYYY-MM
  due_date: string;
  amount: number;
  amount_paid: number;
  status: "open" | "partial" | "paid" | "overdue" | "waived";
  applied_late_fee: number;
  effective_total_due: number;
  payment_history: Array<{
    amount: number;
    paid_at: string;
    method: string;
    reference: string;
  }>;
  blockchain_proof?: MongoBlockchainProof;
}

export interface MongoApplicationDocument {
  _id: string;
  unit_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  monthly_income: number;
  employer: string;
  desired_move_in: string;
  status: "new" | "screening" | "approved" | "declined" | "withdrawn";
  rti_assessment: {
    ratio: number;
    verdict: "low" | "moderate" | "high";
    risk_label: string;
  };
  created_at: string;
}

export interface MongoBlockchainBlockDocument {
  _id: string;
  block_index: number;
  block_hash: string;
  previous_block_hash: string;
  merkle_root: string;
  document_uuid: string;
  document_hash: string;
  authenticity_score: number;
  verdict: string;
  validator_node: string;
  timestamp: string;
  signature: string;
}

export const MONGO_CLUSTER_CONFIG = {
  engine: "MongoDB Distributed Document Store",
  replica_set: "rs-nestara-primary",
  protocol: "mongodb+srv",
  sharding_enabled: true,
  write_concern: "majority",
  read_preference: "primaryPreferred",
  collections: [
    "properties",
    "units",
    "leases",
    "tenants",
    "rent_charges",
    "applications",
    "documents",
    "blockchain_ledger",
  ],
};

