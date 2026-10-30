import { describe, it, expect } from "vitest";
import {
  validateVerhoeff,
  computeVerhoeffCheckDigit,
  validatePAN,
  verifyPayslipCalculations,
  verifyBankStatementContinuity,
  inspectPDFStructure,
  inspectMetadataTemporal,
  authenticateDocumentLocally,
  sealLedgerBlock,
  verifyDistributedLedgerChain,
  type BankTransactionRow,
} from "../document-authenticator";

describe("Document Authenticator — Verhoeff Dihedral (D5) Checksum Algorithm", () => {
  it("authenticates valid Indian Aadhaar UID checksums", () => {
    // Known valid Verhoeff 12-digit sequence
    // Let's compute a valid 12-digit Aadhaar using 11 digits + check digit
    const base11 = "29384756102";
    const checkDigit = computeVerhoeffCheckDigit(base11);
    const validAadhaar = `${base11}${checkDigit}`;

    expect(validateVerhoeff(validAadhaar)).toBe(true);
  });

  it("detects single-digit typographical or fabricated errors", () => {
    const base11 = "29384756102";
    const checkDigit = computeVerhoeffCheckDigit(base11);
    const validAadhaar = `${base11}${checkDigit}`;

    // Flip the last digit
    const wrongLastDigit = `${base11}${(checkDigit + 1) % 10}`;
    expect(validateVerhoeff(wrongLastDigit)).toBe(false);

    // Flip an internal digit
    const alteredBody = `3${base11.slice(1)}${checkDigit}`;
    expect(validateVerhoeff(alteredBody)).toBe(false);
  });

  it("detects 100% of adjacent digit transpositions (e.g. 56 -> 65)", () => {
    const base11 = "29384756102";
    const checkDigit = computeVerhoeffCheckDigit(base11);
    const validAadhaar = `${base11}${checkDigit}`;

    // Transpose '47' to '74'
    const transposed = validAadhaar.replace("47", "74");
    expect(validateVerhoeff(transposed)).toBe(false);
  });
});

describe("Document Authenticator — Indian PAN Structural & Entity Checks", () => {
  it("validates authentic Individual PAN card structure", () => {
    const pan = "ABCDE1234F"; // 4th letter 'D' is not P
    expect(validatePAN(pan).isIndividual).toBe(false);

    const individualPAN = "ABCPE1234F"; // 4th letter 'P'
    const res = validatePAN(individualPAN, "Easwaran");
    expect(res.valid).toBe(true);
    expect(res.isIndividual).toBe(true);
    expect(res.entityType).toBe("Individual");
    expect(res.surnameMatches).toBe(true);
  });

  it("flags Company / Corporate PAN presented for individual applicant", () => {
    const companyPAN = "ABC CE 1234 F".replace(/\s+/g, ""); // 4th letter 'C' = Company
    const res = validatePAN(companyPAN);
    expect(res.valid).toBe(true);
    expect(res.isIndividual).toBe(false);
    expect(res.entityType).toBe("Company");
  });

  it("flags surname initial mismatch on PAN card", () => {
    const pan = "ABCP S 9988 K".replace(/\s+/g, ""); // 5th letter 'S'
    const res = validatePAN(pan, "Verma"); // Verma starts with 'V' != 'S'
    expect(res.valid).toBe(true);
    expect(res.surnameMatches).toBe(false);
  });
});

describe("Document Authenticator — Financial Payslip Mathematical Equation Reconciliation", () => {
  it("confirms genuine balanced salary slip with standard EPF and PT", () => {
    const result = verifyPayslipCalculations({
      basic_salary: 50000,
      hra: 25000,
      special_allowance: 20000,
      other_allowances: 5000,
      gross_earnings: 100000,
      provident_fund: 6000, // 12% of 50,000
      professional_tax: 200,
      tds: 8800,
      total_deductions: 15000,
      net_pay: 85000, // 100,000 - 15,000
    });

    expect(result.valid).toBe(true);
    expect(result.anomalies).toHaveLength(0);
    expect(result.net_discrepancy).toBe(0);
  });

  it("detects fabricated salary slips where Gross doesn't match earnings", () => {
    const result = verifyPayslipCalculations({
      basic_salary: 30000,
      hra: 15000,
      special_allowance: 10000,
      gross_earnings: 95000, // Altered figure! Sum is 55,000
      provident_fund: 1800,
      professional_tax: 200,
      total_deductions: 2000,
      net_pay: 93000,
    });

    expect(result.valid).toBe(false);
    expect(result.gross_discrepancy).toBe(40000);
    expect(result.anomalies.some((a) => a.includes("Earnings breakdown"))).toBe(true);
  });

  it("detects fake salary slips where Net Pay != Gross - Deductions", () => {
    const result = verifyPayslipCalculations({
      basic_salary: 40000,
      hra: 20000,
      gross_earnings: 60000,
      provident_fund: 4800,
      professional_tax: 200,
      total_deductions: 5000,
      net_pay: 58000, // Fraudster typed 58,000 instead of 55,000
    });

    expect(result.valid).toBe(false);
    expect(result.net_discrepancy).toBe(3000);
    expect(result.anomalies.some((a) => a.includes("Net Pay equation mismatch"))).toBe(true);
  });
});

describe("Document Authenticator — Bank Statement Continuous Ledger Arithmetic", () => {
  it("verifies continuous, unbroken running balances", () => {
    const txs: BankTransactionRow[] = [
      { date: "2026-10-01", description: "Opening Balance", balance: 50000 },
      { date: "2026-10-02", description: "Salary Credit", credit: 85000, balance: 135000 },
      { date: "2026-10-05", description: "Rent Transfer", debit: 35000, balance: 100000 },
      { date: "2026-10-10", description: "Groceries UPI", debit: 2500, balance: 97500 },
    ];

    const result = verifyBankStatementContinuity(txs);
    expect(result.valid).toBe(true);
    expect(result.broken_links).toHaveLength(0);
  });

  it("detects spliced or manually modified transaction rows", () => {
    const txs: BankTransactionRow[] = [
      { date: "2026-10-01", description: "Opening Balance", balance: 50000 },
      { date: "2026-10-02", description: "Salary Credit", credit: 85000, balance: 135000 },
      { date: "2026-10-05", description: "Altered Row", debit: 35000, balance: 120000 }, // Balance should be 100,000!
    ];

    const result = verifyBankStatementContinuity(txs);
    expect(result.valid).toBe(false);
    expect(result.broken_links).toHaveLength(1);
    expect(result.broken_links[0].expected_balance).toBe(100000);
    expect(result.broken_links[0].stated_balance).toBe(120000);
  });
});

describe("Document Authenticator — PDF Structure & Metadata Forensics", () => {
  it("identifies clean institutional PDF structures", () => {
    const mockCleanPdf = "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 2\ntrailer\n<< /Size 2 >>\nstartxref\n100\n%%EOF\n";
    const analysis = inspectPDFStructure(mockCleanPdf);

    expect(analysis.is_valid_pdf).toBe(true);
    expect(analysis.has_multiple_revisions).toBe(false);
    expect(analysis.detected_editing_software).toHaveLength(0);
  });

  it("detects incremental revision post-creation edits and graphic editors", () => {
    const mockTamperedPdf =
      "%PDF-1.6\n1 0 obj\n<< /Producer (Adobe Photoshop CC 2024) >>\nendobj\nxref\n0 2\ntrailer\n<< /Size 2 >>\nstartxref\n100\n%%EOF\n" +
      "2 0 obj\n<< /Type /Annot /Subtype /FreeText >>\nendobj\nxref\n2 1\ntrailer\n<< /Size 3 >>\nstartxref\n250\n%%EOF\n";

    const analysis = inspectPDFStructure(mockTamperedPdf);
    expect(analysis.is_valid_pdf).toBe(true);
    expect(analysis.has_multiple_revisions).toBe(true);
    expect(analysis.detected_editing_software).toContain("Adobe Photoshop");
    expect(analysis.has_suspicious_annotations).toBe(true);
  });
});

describe("Document Authenticator — Composite Verification & Distributed Ledger Sealing", () => {
  it("rates an authentic document as ORIGINAL with high authenticity score", () => {
    const base11 = "98765432101";
    const checkDigit = computeVerhoeffCheckDigit(base11);

    const report = authenticateDocumentLocally({
      fileName: "Aadhaar_Verified.pdf",
      documentType: "aadhaar",
      extractedFields: {
        aadhaar_number: `${base11}${checkDigit}`,
      },
    });

    expect(report.authenticity_score).toBeGreaterThanOrEqual(85);
    expect(report.verdict).toBe("ORIGINAL");
    expect(report.flags).toHaveLength(0);
  });

  it("rates a forged document as FAKE / TAMPERED upon mathematical failure", () => {
    const report = authenticateDocumentLocally({
      fileName: "Fake_Salary_Slip.pdf",
      documentType: "payslip",
      extractedFields: {
        payslip_math: {
          basic_salary: 20000,
          gross_earnings: 120000, // Fabricated gross
          provident_fund: 1000,
          total_deductions: 1000,
          net_pay: 119000,
        },
      },
    });

    expect(report.verdict).toBe("FAKE / TAMPERED");
    expect(report.authenticity_score).toBeLessThan(60);
  });

  it("creates cryptographically verifiable distributed ledger blocks with Merkle roots", () => {
    const block1 = sealLedgerBlock({
      blockIndex: 1,
      previousBlockHash: "0000000000000000000000000000000000000000000000000000000000000000",
      documentUuid: "doc-1",
      documentHash: "hash-doc-1",
      authenticityScore: 98.5,
      verdict: "ORIGINAL",
      validatorNode: "node-blr-1",
    });

    const block2 = sealLedgerBlock({
      blockIndex: 2,
      previousBlockHash: block1.block_hash,
      documentUuid: "doc-2",
      documentHash: "hash-doc-2",
      authenticityScore: 22.0,
      verdict: "FAKE / TAMPERED",
      validatorNode: "node-blr-1",
    });

    const chain = [block1, block2];
    const verification = verifyDistributedLedgerChain(chain);
    expect(verification.valid).toBe(true);

    // Tamper test: modify block 1 payload
    const tamperedBlock1 = { ...block1, verdict: "FAKE / TAMPERED" };
    const brokenChain = [tamperedBlock1, block2];
    const tamperedResult = verifyDistributedLedgerChain(brokenChain);
    expect(tamperedResult.valid).toBe(false);
  });
});
