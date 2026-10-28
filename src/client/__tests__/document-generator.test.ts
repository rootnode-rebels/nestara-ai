import { describe, it, expect } from "vitest";
import {
  generateRentReceiptHtml,
  generateLeaseAgreementHtml,
  type ReceiptData,
  type LeaseAgreementData,
} from "../lib/document-generator";

describe("Document Generator — Rent Receipt Generation", () => {
  const sampleReceipt: ReceiptData = {
    receiptNumber: "REC-202610-101",
    tenantName: "Aarav Patel",
    tenantEmail: "aarav@example.com",
    propertyName: "Greenwood Palms",
    propertyAddress: "Outer Ring Road, Bengaluru",
    unitName: "Unit 302",
    period: "2026-10",
    dueDate: "2026-10-05",
    amount: 32000,
    amountPaid: 32000,
    status: "paid",
    paymentMethod: "UPI / Net Banking",
    paymentReference: "UPI-TXN-984210",
  };

  it("produces valid HTML with correct receipt number and status", () => {
    const html = generateRentReceiptHtml(sampleReceipt);
    expect(html).toContain("REC-202610-101");
    expect(html).toContain("Aarav Patel");
    expect(html).toContain("Greenwood Palms");
    expect(html).toContain("Unit 302");
    expect(html).toContain("SETTLED");
    expect(html).toContain("UPI-TXN-984210");
  });

  it("indicates outstanding balance when payment is partial", () => {
    const partialReceipt: ReceiptData = {
      ...sampleReceipt,
      amountPaid: 20000,
      status: "partial",
    };
    const html = generateRentReceiptHtml(partialReceipt);
    expect(html).toContain("Remaining Balance");
    expect(html).toContain("12,000"); // Remaining balance (32000 - 20000)
  });
});

describe("Document Generator — Residential Lease Agreement", () => {
  const sampleLease: LeaseAgreementData = {
    agreementNumber: "AGR-2026-0042",
    landlordName: "Nestara Realty Assets Pvt Ltd",
    landlordContact: "support@nestara.ai | +91 80 4000 1234",
    tenantName: "Rohan Verma",
    tenantPhone: "+91 98765 43210",
    tenantEmail: "rohan@example.com",
    propertyName: "Palm Vista Residences",
    propertyAddress: "77 Sarjapur Road",
    propertyCity: "Bengaluru, Karnataka 560035",
    unitName: "Apartment 5B",
    bedrooms: 3,
    bathrooms: 3,
    sqft: 1450,
    startDate: "2026-11-01",
    endDate: "2027-10-31",
    monthlyRent: 45000,
    deposit: 90000,
    rentDueDay: 5,
    lateFee: 500,
    currency: "INR",
  };

  it("generates an official lease contract containing parties, terms, and clauses", () => {
    const html = generateLeaseAgreementHtml(sampleLease);
    expect(html).toContain("Residential Tenancy Agreement");
    expect(html).toContain("AGR-2026-0042");
    expect(html).toContain("Nestara Realty Assets Pvt Ltd");
    expect(html).toContain("Rohan Verma");
    expect(html).toContain("Apartment 5B");
    expect(html).toContain("Palm Vista Residences");
    expect(html).toContain("45,000");
    expect(html).toContain("90,000"); // 2-month security deposit
    expect(html).toContain("LANDLORD / PROPERTY MANAGER");
    expect(html).toContain("TENANT / RESIDENT");
  });
});
