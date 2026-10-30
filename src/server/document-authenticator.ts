/**
 * Nestara AI — Document Authenticity & Forensic Verification Engine
 *
 * Implements deterministic mathematical algorithms and digital forensic checks
 * to authenticate submitted tenant/applicant documents (Aadhaar, PAN, Payslips,
 * Bank Statements, Leases, ID Proofs) locally in the backend environment.
 *
 * Includes:
 * 1. Verhoeff D5 Checksum Algorithm (Indian UIDAI Aadhaar Validation)
 * 2. Indian PAN Card Structural & Entity Checksum Validation
 * 3. Financial & Accounting Balance Equation Reconciliation (Gross/Net/PF/PT/TDS)
 * 4. Bank Statement Continuous Arithmetic Balance Chain Verification
 * 5. PDF Raw Byte Structure & Incremental Update Tamper Detection
 * 6. Document Metadata & Graphics Editing Suite Signature Detection
 * 7. Distributed Merkle Root & Cryptographic Hash-Chain Ledger Sealing
 */

import crypto from "crypto";

export type DocumentType =
  | "aadhaar"
  | "pan"
  | "payslip"
  | "bank_statement"
  | "lease_agreement"
  | "employment_letter"
  | "other";

export type ForensicVerdict = "ORIGINAL" | "SUSPICIOUS" | "FAKE / TAMPERED" | "UNVERIFIED";

export interface AlgorithmicCheckResult {
  code: string;
  name: string;
  passed: boolean;
  severity: "critical" | "warning" | "info";
  penalty: number;
  details: string;
}

export interface DocumentVerificationReport {
  document_uuid: string;
  document_type: DocumentType;
  file_name: string;
  file_hash_sha256: string;
  authenticity_score: number; // 0.0 to 100.0
  verdict: ForensicVerdict;
  checks: AlgorithmicCheckResult[];
  flags: string[];
  extracted_fields: Record<string, unknown>;
  ledger_proof?: {
    block_index: number;
    block_hash: string;
    previous_block_hash: string;
    merkle_root: string;
    timestamp: string;
    validator_node: string;
    signature: string;
  };
  verified_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Verhoeff Dihedral (D5) Checksum Algorithm for Aadhaar / UID Validation
// ─────────────────────────────────────────────────────────────────────────────

// Multiplication table for dihedral group D5
const VERHOEFF_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// Permutation table
const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// Inverse table
const VERHOEFF_INV: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates a number string using the Verhoeff D5 algorithm.
 * Used for official 12-digit Indian Aadhaar number mathematical authenticity.
 */
export function validateVerhoeff(numStr: string): boolean {
  const clean = numStr.replace(/\D/g, "");
  if (!clean || clean.length < 2) return false;

  let c = 0;
  const len = clean.length;
  for (let i = 0; i < len; i++) {
    const digit = parseInt(clean[len - 1 - i], 10);
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digit]];
  }
  return c === 0;
}

/**
 * Computes the Verhoeff check digit for an 11-digit or n-digit number.
 */
export function computeVerhoeffCheckDigit(numStr: string): number {
  const clean = numStr.replace(/\D/g, "");
  let c = 0;
  const len = clean.length;
  for (let i = 0; i < len; i++) {
    const digit = parseInt(clean[len - 1 - i], 10);
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digit]];
  }
  return VERHOEFF_INV[c];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Indian Income Tax PAN Card Validation Algorithm
// ─────────────────────────────────────────────────────────────────────────────

export interface PANValidationResult {
  valid: boolean;
  entityType?: string;
  isIndividual: boolean;
  surnameMatches?: boolean;
  error?: string;
}

/**
 * Validates an Indian PAN card format and verifies individual residency status.
 * Format: [A-Z]{3}[P|C|H|F|A|T|B|L|J|G][A-Z][0-9]{4}[A-Z]
 * 4th character must be 'P' for Individual tenants/applicants.
 * 5th character is typically the first letter of the individual's surname.
 */
export function validatePAN(panStr: string, applicantSurname?: string): PANValidationResult {
  const clean = panStr.trim().toUpperCase();
  const panRegex = /^[A-Z]{3}([PCHFATBLJG])([A-Z])([0-9]{4})([A-Z])$/;
  const match = clean.match(panRegex);

  if (!match) {
    return {
      valid: false,
      isIndividual: false,
      error: "Invalid PAN structure. Must match 5 letters, 4 digits, 1 letter format.",
    };
  }

  const entityCode = match[1];
  const surnameChar = match[2];
  const isIndividual = entityCode === "P";

  let surnameMatches: boolean | undefined = undefined;
  if (applicantSurname && applicantSurname.trim().length > 0) {
    const expectedInitial = applicantSurname.trim().toUpperCase()[0];
    surnameMatches = surnameChar === expectedInitial;
  }

  const entityMap: Record<string, string> = {
    P: "Individual",
    C: "Company",
    H: "Hindu Undivided Family (HUF)",
    F: "Firm / Partnership",
    A: "Association of Persons (AOP)",
    T: "Trust",
    B: "Body of Individuals (BOI)",
    L: "Local Authority",
    J: "Artificial Juridical Person",
    G: "Government Agency",
  };

  return {
    valid: true,
    entityType: entityMap[entityCode] || "Unknown",
    isIndividual,
    surnameMatches,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Financial & Accounting Mathematical Consistency Algorithm (Salary Slips)
// ─────────────────────────────────────────────────────────────────────────────

export interface PayslipMathInput {
  basic_salary?: number;
  hra?: number;
  conveyance?: number;
  special_allowance?: number;
  other_allowances?: number;
  gross_earnings?: number;
  provident_fund?: number;
  professional_tax?: number;
  tds?: number;
  other_deductions?: number;
  total_deductions?: number;
  net_pay?: number;
}

export interface PayslipMathResult {
  valid: boolean;
  computed_gross: number;
  stated_gross: number;
  gross_discrepancy: number;
  computed_deductions: number;
  stated_deductions: number;
  deduction_discrepancy: number;
  computed_net_pay: number;
  stated_net_pay: number;
  net_discrepancy: number;
  pf_rule_check: {
    passed: boolean;
    expected_standard: number;
    difference: number;
    comment: string;
  };
  pt_rule_check: {
    passed: boolean;
    comment: string;
  };
  anomalies: string[];
}

/**
 * Reconciles payslip line items and statutory deductions.
 * Detects fabricated salary slips where figures fail mathematical reconciliation.
 */
export function verifyPayslipCalculations(input: PayslipMathInput): PayslipMathResult {
  const basic = Math.max(0, input.basic_salary ?? 0);
  const hra = Math.max(0, input.hra ?? 0);
  const conveyance = Math.max(0, input.conveyance ?? 0);
  const special = Math.max(0, input.special_allowance ?? 0);
  const otherAllowances = Math.max(0, input.other_allowances ?? 0);

  const statedGross = input.gross_earnings ?? (basic + hra + conveyance + special + otherAllowances);
  const computedGross = basic + hra + conveyance + special + otherAllowances;
  const grossDiscrepancy = Math.abs(statedGross - computedGross);

  const pf = Math.max(0, input.provident_fund ?? 0);
  const pt = Math.max(0, input.professional_tax ?? 0);
  const tds = Math.max(0, input.tds ?? 0);
  const otherDeductions = Math.max(0, input.other_deductions ?? 0);

  const statedDeductions = input.total_deductions ?? (pf + pt + tds + otherDeductions);
  const computedDeductions = pf + pt + tds + otherDeductions;
  const deductionDiscrepancy = Math.abs(statedDeductions - computedDeductions);

  const statedNet = input.net_pay ?? (statedGross - statedDeductions);
  const computedNet = statedGross - statedDeductions;
  const netDiscrepancy = Math.abs(statedNet - computedNet);

  const anomalies: string[] = [];

  // 1. Gross Equation Reconciliation (Tolerance ₹5 for rounding)
  if (computedGross > 0 && grossDiscrepancy > 5) {
    anomalies.push(
      `Earnings breakdown (₹${computedGross.toLocaleString("en-IN")}) does not sum to stated Gross Pay (₹${statedGross.toLocaleString("en-IN")}). Discrepancy: ₹${grossDiscrepancy.toLocaleString("en-IN")}`
    );
  }

  // 2. Deduction Equation Reconciliation
  if (computedDeductions > 0 && deductionDiscrepancy > 5) {
    anomalies.push(
      `Deductions breakdown (₹${computedDeductions.toLocaleString("en-IN")}) does not sum to stated Total Deductions (₹${statedDeductions.toLocaleString("en-IN")}). Discrepancy: ₹${deductionDiscrepancy.toLocaleString("en-IN")}`
    );
  }

  // 3. Net Pay Balance Equation: Net = Gross - Deductions
  if (netDiscrepancy > 5) {
    anomalies.push(
      `Net Pay equation mismatch: Stated Net (₹${statedNet.toLocaleString("en-IN")}) does not equal Gross (₹${statedGross.toLocaleString("en-IN")}) minus Deductions (₹${statedDeductions.toLocaleString("en-IN")}). Difference: ₹${netDiscrepancy.toLocaleString("en-IN")}`
    );
  }

  // 4. Statutory Provident Fund (PF) Heuristics
  // Standard India EPF is 12% of Basic Salary (or statutory cap of ₹1,800/mo on 15k basic ceiling)
  let pfRulePassed = true;
  let expectedPF = Math.round(basic * 0.12);
  let pfDifference = Math.abs(pf - expectedPF);
  let pfComment = "Statutory 12% EPF matches expected contribution.";

  if (basic > 0 && pf > 0) {
    const isStatutoryCap = Math.abs(pf - 1800) <= 2; // Capped at ₹1,800
    const isStandard12Pct = pfDifference <= 10;

    if (!isStatutoryCap && !isStandard12Pct) {
      pfRulePassed = false;
      pfComment = `PF contribution (₹${pf.toLocaleString("en-IN")}) deviates from standard 12% of basic (₹${expectedPF.toLocaleString("en-IN")}) and statutory ceiling of ₹1,800.`;
      anomalies.push(pfComment);
    }
  }

  // 5. Professional Tax (PT) Verification
  // Karnataka PT is ₹200/mo for gross salary > ₹15,000; other states ₹200 or ₹0/208.
  let ptRulePassed = true;
  let ptComment = "Professional tax deduction consistent with state slabs.";
  if (statedGross > 15000 && pt === 0) {
    ptRulePassed = false;
    ptComment = "Zero Professional Tax deduction on monthly gross exceeding ₹15,000 (standard slab ₹200/mo).";
    anomalies.push(ptComment);
  } else if (pt > 500) {
    ptRulePassed = false;
    ptComment = `Professional Tax of ₹${pt} exceeds constitutional maximum monthly ceiling of ₹208.33 (₹2,500/year).`;
    anomalies.push(ptComment);
  }

  const valid = anomalies.length === 0;

  return {
    valid,
    computed_gross: computedGross,
    stated_gross: statedGross,
    gross_discrepancy: grossDiscrepancy,
    computed_deductions: computedDeductions,
    stated_deductions: statedDeductions,
    deduction_discrepancy: deductionDiscrepancy,
    computed_net_pay: computedNet,
    stated_net_pay: statedNet,
    net_discrepancy: netDiscrepancy,
    pf_rule_check: {
      passed: pfRulePassed,
      expected_standard: expectedPF,
      difference: pfDifference,
      comment: pfComment,
    },
    pt_rule_check: {
      passed: ptRulePassed,
      comment: ptComment,
    },
    anomalies,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Bank Statement Continuous Arithmetic Balance Chain Verification
// ─────────────────────────────────────────────────────────────────────────────

export interface BankTransactionRow {
  date: string;
  description: string;
  credit?: number;
  debit?: number;
  balance: number;
}

export interface BankStatementMathResult {
  valid: boolean;
  total_transactions: number;
  broken_links: {
    index: number;
    expected_balance: number;
    stated_balance: number;
    discrepancy: number;
    description: string;
  }[];
  anomalies: string[];
}

/**
 * Validates sequential running ledger balances across bank statement transactions.
 * Balance(n) must equal Balance(n-1) + Credit(n) - Debit(n).
 */
export function verifyBankStatementContinuity(
  transactions: BankTransactionRow[],
  startingBalance?: number
): BankStatementMathResult {
  if (!transactions.length) {
    return { valid: true, total_transactions: 0, broken_links: [], anomalies: [] };
  }

  const brokenLinks: BankStatementMathResult["broken_links"] = [];
  let currentBalance = startingBalance !== undefined ? startingBalance : transactions[0].balance;

  const startIndex = startingBalance !== undefined ? 0 : 1;

  for (let i = startIndex; i < transactions.length; i++) {
    const tx = transactions[i];
    const prevBalance = i === 0 ? currentBalance : transactions[i - 1].balance;
    const credit = tx.credit ?? 0;
    const debit = tx.debit ?? 0;
    const expected = Math.round((prevBalance + credit - debit) * 100) / 100;
    const stated = Math.round(tx.balance * 100) / 100;

    if (Math.abs(expected - stated) > 0.05) {
      brokenLinks.push({
        index: i + 1,
        expected_balance: expected,
        stated_balance: stated,
        discrepancy: Math.round(Math.abs(expected - stated) * 100) / 100,
        description: tx.description || `Row ${i + 1}`,
      });
    }
  }

  const anomalies: string[] = [];
  if (brokenLinks.length > 0) {
    anomalies.push(
      `Detected ${brokenLinks.length} mathematical balance breaks in bank statement running totals. This strongly indicates modified or copy-pasted transaction rows.`
    );
  }

  return {
    valid: brokenLinks.length === 0,
    total_transactions: transactions.length,
    broken_links: brokenLinks,
    anomalies,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PDF Raw Byte Structure & Incremental Tamper Detection
// ─────────────────────────────────────────────────────────────────────────────

export interface PDFStructureAnalysis {
  is_valid_pdf: boolean;
  version?: string;
  has_multiple_revisions: boolean;
  revision_count: number;
  has_digital_signature: boolean;
  has_suspicious_annotations: boolean;
  has_form_widget_overlays: boolean;
  detected_editing_software: string[];
  anomalies: string[];
}

/**
 * Performs local binary and stream inspection on raw PDF bytes.
 * Detects incremental update injection (editing a signed or issued PDF),
 * annotation overlays used to hide figures, and graphics editing software signatures.
 */
export function inspectPDFStructure(content: string | Buffer | Uint8Array): PDFStructureAnalysis {
  let text = "";
  if (typeof content === "string") {
    // If base64 string, decode to binary string or ascii
    if (content.startsWith("data:") || /^[A-Za-z0-9+/=]+$/.test(content.slice(0, 100).trim())) {
      try {
        const base64Data = content.includes(",") ? content.split(",")[1] : content;
        text = Buffer.from(base64Data, "base64").toString("latin1");
      } catch {
        text = content;
      }
    } else {
      text = content;
    }
  } else if (Buffer.isBuffer(content)) {
    text = content.toString("latin1");
  } else {
    text = Buffer.from(content).toString("latin1");
  }

  const anomalies: string[] = [];
  const headerMatch = text.match(/%PDF-([0-9.]+)/);
  const isValidPdf = !!headerMatch;

  if (!isValidPdf) {
    return {
      is_valid_pdf: false,
      has_multiple_revisions: false,
      revision_count: 0,
      has_digital_signature: false,
      has_suspicious_annotations: false,
      has_form_widget_overlays: false,
      detected_editing_software: [],
      anomalies: ["Document missing valid PDF magic header (%PDF-)."],
    };
  }

  const version = headerMatch[1];

  // 1. Check for Incremental Revisions
  // In legitimate issued documents (e.g. DigiLocker, Bank statements, IT department),
  // there is normally 1 trailer and 1 %%EOF. Multiple %%EOF and trailer occurrences
  // indicate post-issuance append/modification.
  const eofMatches = text.match(/%%EOF/g) || [];
  const trailerMatches = text.match(/trailer\s*<</gi) || [];
  const revisionCount = Math.max(eofMatches.length, trailerMatches.length);
  const hasMultipleRevisions = revisionCount > 1;

  if (hasMultipleRevisions) {
    anomalies.push(
      `Detected ${revisionCount} incremental revisions (post-creation modifications). The document has been appended or edited after its initial generation.`
    );
  }

  // 2. Check Digital Signature Presence & Integrity
  const hasDigitalSignature = /Type\s*\/Sig/i.test(text) || /\/ByteRange\s*\[/i.test(text);

  // If signed but with multiple revisions, flag potential signature invalidation
  if (hasDigitalSignature && hasMultipleRevisions) {
    anomalies.push(
      "Document contains a digital signature dictionary accompanied by post-signing incremental updates. Modifying a signed document invalidates legal provenance."
    );
  }

  // 3. Scan for Suspicious Annotations or Overlay Layers
  const hasSuspiciousAnnotations = /\/Subtype\s*\/FreeText/i.test(text) || /\/Subtype\s*\/Redact/i.test(text);
  const hasFormWidgetOverlays = /\/Type\s*\/Annot\s*\/Subtype\s*\/Widget/i.test(text);

  if (hasSuspiciousAnnotations) {
    anomalies.push(
      "Suspicious FreeText or redaction annotation layer detected. Frequently used to superimpose fake numbers over original text."
    );
  }

  // 4. Scan Metadata for Graphic Editing Tools
  const knownEditingSoftware = [
    { pattern: /Photoshop/i, name: "Adobe Photoshop" },
    { pattern: /GIMP/i, name: "GIMP Image Editor" },
    { pattern: /Canva/i, name: "Canva Design Suite" },
    { pattern: /Sejda/i, name: "Sejda PDF Editor" },
    { pattern: /ILovePDF/i, name: "iLovePDF Modification Suite" },
    { pattern: /PDFescape/i, name: "PDFescape Online Editor" },
    { pattern: /Pixlr/i, name: "Pixlr Graphic Tool" },
    { pattern: /Illustrator/i, name: "Adobe Illustrator" },
    { pattern: /InDesign/i, name: "Adobe InDesign" },
    { pattern: /CorelDraw/i, name: "CorelDRAW" },
  ];

  const detectedEditingSoftware: string[] = [];
  for (const tool of knownEditingSoftware) {
    if (tool.pattern.test(text)) {
      detectedEditingSoftware.push(tool.name);
    }
  }

  if (detectedEditingSoftware.length > 0) {
    anomalies.push(
      `Metadata contains traces of graphic editing software: ${detectedEditingSoftware.join(", ")}. Official government and bank documents are never authored via consumer design/editing tools.`
    );
  }

  return {
    is_valid_pdf: true,
    version,
    has_multiple_revisions: hasMultipleRevisions,
    revision_count: revisionCount,
    has_digital_signature: hasDigitalSignature,
    has_suspicious_annotations: hasSuspiciousAnnotations,
    has_form_widget_overlays: hasFormWidgetOverlays,
    detected_editing_software: detectedEditingSoftware,
    anomalies,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Metadata Temporal & Producer Anomaly Detection
// ─────────────────────────────────────────────────────────────────────────────

export interface MetadataTemporalResult {
  has_temporal_anomaly: boolean;
  creation_date?: string;
  mod_date?: string;
  producer?: string;
  creator?: string;
  anomalies: string[];
}

export function inspectMetadataTemporal(rawMetadataText: string): MetadataTemporalResult {
  const anomalies: string[] = [];

  const createMatch = rawMetadataText.match(/\/CreationDate\s*\((D:[^)]+)\)/i);
  const modMatch = rawMetadataText.match(/\/ModDate\s*\((D:[^)]+)\)/i);
  const producerMatch = rawMetadataText.match(/\/Producer\s*\(([^)]+)\)/i);
  const creatorMatch = rawMetadataText.match(/\/Creator\s*\(([^)]+)\)/i);

  const creationDate = createMatch ? createMatch[1] : undefined;
  const modDate = modMatch ? modMatch[1] : undefined;
  const producer = producerMatch ? producerMatch[1] : undefined;
  const creator = creatorMatch ? creatorMatch[1] : undefined;

  let hasTemporalAnomaly = false;

  // Inverted timestamp check
  if (creationDate && modDate && creationDate !== modDate) {
    // If creation and modification dates differ, document was re-saved or modified after creation
    hasTemporalAnomaly = true;
    anomalies.push(
      `Modification timestamp (${modDate}) differs from initial creation timestamp (${creationDate}), confirming post-issuance alteration.`
    );
  }

  // Generator heuristic: Check if claiming to be official but built with dev/html tools
  const devTools = ["wkhtmltopdf", "cairo", "pdfcrowd", "dompdf", "mpdf", "puppeteer", "playwright"];
  const combined = `${producer || ""} ${creator || ""}`.toLowerCase();
  for (const dt of devTools) {
    if (combined.includes(dt)) {
      anomalies.push(
        `Document was generated by client-side HTML-rendering engine "${dt}". This is a known marker of synthetic payslips or statements created from templates.`
      );
    }
  }

  return {
    has_temporal_anomaly: hasTemporalAnomaly,
    creation_date: creationDate,
    mod_date: modDate,
    producer,
    creator,
    anomalies,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Core Composite Document Authenticator
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthenticateDocumentOptions {
  uuid?: string;
  fileName: string;
  documentType: DocumentType;
  fileData?: string | Buffer;
  extractedFields?: {
    aadhaar_number?: string;
    pan_number?: string;
    applicant_name?: string;
    applicant_surname?: string;
    dob?: string;
    employer?: string;
    monthly_income?: number;
    payslip_math?: PayslipMathInput;
    bank_transactions?: BankTransactionRow[];
    starting_balance?: number;
  };
  metadataText?: string;
}

/**
 * Master local authentication function.
 * Evaluates all algorithmic and forensic rules locally without external cloud dependencies.
 */
export function authenticateDocumentLocally(
  opts: AuthenticateDocumentOptions
): DocumentVerificationReport {
  const uuid = opts.uuid || crypto.randomUUID();
  const checks: AlgorithmicCheckResult[] = [];
  const flags: string[] = [];
  let score = 100.0;

  // Compute Document Hash
  let fileHash = "";
  if (opts.fileData) {
    const buf = Buffer.isBuffer(opts.fileData)
      ? opts.fileData
      : Buffer.from(opts.fileData.toString(), "utf-8");
    fileHash = crypto.createHash("sha256").update(buf).digest("hex");
  } else {
    fileHash = crypto.createHash("sha256").update(`${opts.fileName}:${uuid}`).digest("hex");
  }

  const fields = opts.extractedFields || {};

  // ── Algorithm Check 1: Aadhaar Checksum (Verhoeff) ──
  if (opts.documentType === "aadhaar" || fields.aadhaar_number) {
    const aadhaar = fields.aadhaar_number || "";
    if (aadhaar.replace(/\D/g, "").length === 12) {
      const isVerhoeffValid = validateVerhoeff(aadhaar);
      if (isVerhoeffValid) {
        checks.push({
          code: "VERHOEFF_UID_VALID",
          name: "Verhoeff Dihedral (D5) Checksum",
          passed: true,
          severity: "critical",
          penalty: 0,
          details: "Aadhaar 12-digit number satisfies official UIDAI Verhoeff permutation checksum.",
        });
      } else {
        const penalty = 50;
        score -= penalty;
        flags.push("Aadhaar Verhoeff checksum failure (invalid UID number).");
        checks.push({
          code: "VERHOEFF_UID_FAILED",
          name: "Verhoeff Dihedral (D5) Checksum",
          passed: false,
          severity: "critical",
          penalty,
          details: "12-digit Aadhaar number mathematically failed the Verhoeff permutation checksum. Detects transposition or fabricated UID.",
        });
      }
    } else {
      const penalty = 30;
      score -= penalty;
      flags.push("Aadhaar number format invalid (must be 12 digits).");
      checks.push({
        code: "AADHAAR_FORMAT_INVALID",
        name: "Aadhaar Length Check",
        passed: false,
        severity: "critical",
        penalty,
        details: "Aadhaar number does not contain required 12 digits.",
      });
    }
  }

  // ── Algorithm Check 2: PAN Card Structure & Surname Verification ──
  if (opts.documentType === "pan" || fields.pan_number) {
    const pan = fields.pan_number || "";
    const panResult = validatePAN(pan, fields.applicant_surname);

    if (panResult.valid) {
      if (panResult.isIndividual) {
        checks.push({
          code: "PAN_INDIVIDUAL_VALID",
          name: "PAN Individual Residency Check",
          passed: true,
          severity: "info",
          penalty: 0,
          details: "4th character confirms individual taxpayer status ('P').",
        });
      } else {
        const penalty = 40;
        score -= penalty;
        flags.push(`PAN entity type mismatch: Document is registered to a ${panResult.entityType}, not an Individual.`);
        checks.push({
          code: "PAN_ENTITY_MISMATCH",
          name: "PAN Individual Residency Check",
          passed: false,
          severity: "critical",
          penalty,
          details: `4th character indicates entity type "${panResult.entityType}". Individual tenancy applications require an Individual ('P') PAN.`,
        });
      }

      if (panResult.surnameMatches === false) {
        const penalty = 25;
        score -= penalty;
        flags.push("PAN 5th character does not match applicant surname initial.");
        checks.push({
          code: "PAN_SURNAME_MISMATCH",
          name: "PAN Surname Initial Matching",
          passed: false,
          severity: "warning",
          penalty,
          details: `5th character of PAN (${pan[4]}) does not match the first letter of applicant's surname (${fields.applicant_surname}).`,
        });
      } else if (panResult.surnameMatches === true) {
        checks.push({
          code: "PAN_SURNAME_MATCHED",
          name: "PAN Surname Initial Matching",
          passed: true,
          severity: "info",
          penalty: 0,
          details: "PAN 5th character matches applicant surname initial.",
        });
      }
    } else {
      const penalty = 50;
      score -= penalty;
      flags.push(`PAN format validation failed: ${panResult.error}`);
      checks.push({
        code: "PAN_FORMAT_INVALID",
        name: "PAN Syntax Validation",
        passed: false,
        severity: "critical",
        penalty,
        details: panResult.error || "PAN does not conform to Indian Income Tax format.",
      });
    }
  }

  // ── Algorithm Check 3: Payslip Financial Balance Reconciliation ──
  if (opts.documentType === "payslip" || fields.payslip_math) {
    const mathInput: PayslipMathInput = fields.payslip_math || {
      gross_earnings: fields.monthly_income,
      net_pay: fields.monthly_income,
    };

    const mathResult = verifyPayslipCalculations(mathInput);
    if (mathResult.valid) {
      checks.push({
        code: "PAYSLIP_MATH_RECONCILED",
        name: "Financial Equation Balance",
        passed: true,
        severity: "info",
        penalty: 0,
        details: `Earnings (Gross ₹${mathResult.computed_gross.toLocaleString("en-IN")}) and statutory deductions reconcile perfectly to Net Pay (₹${mathResult.computed_net_pay.toLocaleString("en-IN")}).`,
      });
    } else {
      const penalty = Math.min(45, mathResult.anomalies.length * 15);
      score -= penalty;
      for (const a of mathResult.anomalies) {
        flags.push(a);
      }
      checks.push({
        code: "PAYSLIP_MATH_CONTRADICTION",
        name: "Financial Equation Balance",
        passed: false,
        severity: "critical",
        penalty,
        details: mathResult.anomalies.join(" | "),
      });
    }
  }

  // ── Algorithm Check 4: Bank Statement Continuous Ledger Arithmetic ──
  if (opts.documentType === "bank_statement" && fields.bank_transactions) {
    const bankResult = verifyBankStatementContinuity(fields.bank_transactions, fields.starting_balance);
    if (bankResult.valid) {
      checks.push({
        code: "BANK_LEDGER_CONTINUOUS",
        name: "Bank Ledger Continuity",
        passed: true,
        severity: "info",
        penalty: 0,
        details: `All ${bankResult.total_transactions} sequential transaction balances reconcile accurately without breaks.`,
      });
    } else {
      const penalty = Math.min(45, bankResult.broken_links.length * 20);
      score -= penalty;
      for (const anom of bankResult.anomalies) {
        flags.push(anom);
      }
      checks.push({
        code: "BANK_LEDGER_BROKEN",
        name: "Bank Ledger Continuity",
        passed: false,
        severity: "critical",
        penalty,
        details: `Detected ${bankResult.broken_links.length} running balance discrepancies. First break at row ${bankResult.broken_links[0]?.index} (expected ₹${bankResult.broken_links[0]?.expected_balance}, stated ₹${bankResult.broken_links[0]?.stated_balance}).`,
      });
    }
  }

  // ── Algorithm Check 5: PDF Structure & Incremental Revision Forensics ──
  if (opts.fileData || opts.fileName.toLowerCase().endsWith(".pdf")) {
    const pdfData = opts.fileData || opts.metadataText || "";
    const pdfAnalysis = inspectPDFStructure(pdfData);

    if (pdfAnalysis.is_valid_pdf) {
      if (pdfAnalysis.has_multiple_revisions) {
        const penalty = 30;
        score -= penalty;
        flags.push(`PDF has ${pdfAnalysis.revision_count} incremental revision updates (post-issuance edits).`);
        checks.push({
          code: "PDF_INCREMENTAL_REVISION",
          name: "PDF Revision Structure",
          passed: false,
          severity: "warning",
          penalty,
          details: `Document has been modified ${pdfAnalysis.revision_count - 1} time(s) after initial compilation.`,
        });
      } else {
        checks.push({
          code: "PDF_ORIGINAL_COMPILATION",
          name: "PDF Revision Structure",
          passed: true,
          severity: "info",
          penalty: 0,
          details: "Clean single-revision PDF structure with zero post-issuance trailers.",
        });
      }

      if (pdfAnalysis.detected_editing_software.length > 0) {
        const penalty = 35;
        score -= penalty;
        flags.push(`Graphic editing software markers found: ${pdfAnalysis.detected_editing_software.join(", ")}.`);
        checks.push({
          code: "GRAPHIC_EDITOR_DETECTED",
          name: "Software Signature Forensics",
          passed: false,
          severity: "critical",
          penalty,
          details: `Document metadata reveals authoring via ${pdfAnalysis.detected_editing_software.join(", ")}. Standard institutional documents are never generated via graphic design suites.`,
        });
      } else {
        checks.push({
          code: "CLEAN_SOFTWARE_SIGNATURE",
          name: "Software Signature Forensics",
          passed: true,
          severity: "info",
          penalty: 0,
          details: "No known consumer image manipulation or PDF tampering tools detected in metadata stream.",
        });
      }

      if (pdfAnalysis.has_suspicious_annotations) {
        const penalty = 20;
        score -= penalty;
        flags.push("Suspicious annotation / overlay layer detected.");
        checks.push({
          code: "SUSPICIOUS_ANNOTATIONS",
          name: "Visual Overlay Forensics",
          passed: false,
          severity: "warning",
          penalty,
          details: "Detected FreeText/Redaction annotation object layer.",
        });
      }
    }
  }

  // ── Algorithm Check 6: Temporal Inversion & Producer Analysis ──
  if (opts.metadataText) {
    const temporalResult = inspectMetadataTemporal(opts.metadataText);
    if (temporalResult.has_temporal_anomaly) {
      const penalty = 20;
      score -= penalty;
      for (const a of temporalResult.anomalies) {
        flags.push(a);
      }
      checks.push({
        code: "TEMPORAL_METADATA_ANOMALY",
        name: "Temporal Integrity Check",
        passed: false,
        severity: "warning",
        penalty,
        details: temporalResult.anomalies.join(" | "),
      });
    }
  }

  // Clamp final score between 0.0 and 100.0
  const finalScore = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  // Determine Final Verdict
  let verdict: ForensicVerdict = "ORIGINAL";
  const hasCriticalFailure = checks.some((c) => !c.passed && c.severity === "critical");

  if (hasCriticalFailure || finalScore < 60) {
    verdict = "FAKE / TAMPERED";
  } else if (finalScore < 85 || flags.length > 0) {
    verdict = "SUSPICIOUS";
  } else {
    verdict = "ORIGINAL";
  }

  return {
    document_uuid: uuid,
    document_type: opts.documentType,
    file_name: opts.fileName,
    file_hash_sha256: fileHash,
    authenticity_score: finalScore,
    verdict,
    checks,
    flags,
    extracted_fields: fields,
    verified_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Distributed Cryptographic Hash-Chain & Merkle Root Sealing
// ─────────────────────────────────────────────────────────────────────────────

export interface LedgerBlock {
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

/**
 * Computes the 2-leaf or n-leaf Merkle root for a set of data hashes.
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (!hashes.length) return crypto.createHash("sha256").update("EMPTY_MERKLE_TREE").digest("hex");
  if (hashes.length === 1) return hashes[0];

  let currentLevel = [...hashes];
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = crypto.createHash("sha256").update(left + right).digest("hex");
      nextLevel.push(combined);
    }
    currentLevel = nextLevel;
  }
  return currentLevel[0];
}

/**
 * Constructs and signs a new block in the distributed audit ledger.
 */
export function sealLedgerBlock(params: {
  blockIndex: number;
  previousBlockHash: string;
  documentUuid: string;
  documentHash: string;
  authenticityScore: number;
  verdict: string;
  validatorNode?: string;
  secretKey?: string;
}): LedgerBlock {
  const node = params.validatorNode || "node-edge-primary";
  const timestamp = new Date().toISOString();
  const merkleRoot = computeMerkleRoot([params.documentHash, crypto.createHash("sha256").update(params.verdict).digest("hex")]);

  const blockPayload = [
    params.blockIndex,
    params.previousBlockHash,
    merkleRoot,
    params.documentUuid,
    params.documentHash,
    params.authenticityScore,
    params.verdict,
    node,
    timestamp,
  ].join("|");

  const secret = params.secretKey || "nestara-distributed-ledger-v1-secret-key";
  const blockHash = crypto.createHash("sha256").update(blockPayload).digest("hex");
  const signature = crypto.createHmac("sha256", secret).update(blockHash).digest("hex");

  return {
    block_index: params.blockIndex,
    block_hash: blockHash,
    previous_block_hash: params.previousBlockHash,
    merkle_root: merkleRoot,
    document_uuid: params.documentUuid,
    document_hash: params.documentHash,
    authenticity_score: params.authenticityScore,
    verdict: params.verdict,
    validator_node: node,
    timestamp,
    signature,
  };
}

/**
 * Verifies the cryptographic continuity of an entire chain of distributed ledger blocks.
 * Detects any tampering or block modification in the distributed database.
 */
export function verifyDistributedLedgerChain(
  blocks: LedgerBlock[],
  secretKey?: string
): { valid: boolean; brokenAt?: number; error?: string } {
  if (!blocks.length) return { valid: true };

  const secret = secretKey || "nestara-distributed-ledger-v1-secret-key";

  for (let i = 0; i < blocks.length; i++) {
    const current = blocks[i];

    // 1. Genesis block check
    if (i === 0) {
      if (current.block_index !== 1) {
        return { valid: false, brokenAt: 1, error: "Genesis block index must be 1." };
      }
    } else {
      // 2. Hash-chain linkage check
      const prev = blocks[i - 1];
      if (current.previous_block_hash !== prev.block_hash) {
        return {
          valid: false,
          brokenAt: current.block_index,
          error: `Broken hash link at block #${current.block_index}. Expected previous hash ${prev.block_hash}, found ${current.previous_block_hash}.`,
        };
      }
      if (current.block_index !== prev.block_index + 1) {
        return {
          valid: false,
          brokenAt: current.block_index,
          error: `Non-sequential block index at block #${current.block_index}.`,
        };
      }
    }

    // 2.5 Recompute block hash from payload to detect field tampering
    const blockPayload = [
      current.block_index,
      current.previous_block_hash,
      current.merkle_root,
      current.document_uuid,
      current.document_hash,
      current.authenticity_score,
      current.verdict,
      current.validator_node,
      current.timestamp,
    ].join("|");
    const recomputedHash = crypto.createHash("sha256").update(blockPayload).digest("hex");
    if (current.block_hash !== recomputedHash) {
      return {
        valid: false,
        brokenAt: current.block_index,
        error: `Block #${current.block_index} payload does not match block hash. Content has been tampered with.`,
      };
    }

    // 3. Signature verification
    const expectedSig = crypto.createHmac("sha256", secret).update(current.block_hash).digest("hex");
    if (current.signature !== expectedSig) {
      return {
        valid: false,
        brokenAt: current.block_index,
        error: `Invalid cryptographic signature at block #${current.block_index}. Block content has been tampered with.`,
      };
    }
  }

  return { valid: true };
}
