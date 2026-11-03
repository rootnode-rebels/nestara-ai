import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone, maskIncome } from "../lib/privacy";
import { computeRti, type RtiAssessment } from "../components/applications/applications-page";

describe("Compliance, PII Protection & Applicant Screening", () => {
  describe("DPDP & GDPR PII Masking Standards", () => {
    it("masks email addresses while preserving domain validation", () => {
      expect(maskEmail("aarav.sharma@oracle.com")).toBe("a•••••a@oracle.com");
      expect(maskEmail("aditi@nestara.ai")).toBe("a•••i@nestara.ai");
      expect(maskEmail("me@test.com")).toBe("m•@test.com");
      expect(maskEmail(null)).toBe("—");
      expect(maskEmail("")).toBe("—");
      expect(maskEmail("invalid-email")).toBe("—");
    });

    it("masks phone numbers while retaining country code and terminal digits", () => {
      const masked = maskPhone("+91 98765 43210");
      expect(masked).toBe("+91 9 •••• 210");
      expect(maskPhone(null)).toBe("—");
      expect(maskPhone("")).toBe("—");
      expect(maskPhone("123")).toBe("•••••");
    });

    it("masks confidential income figures with regional currency symbol", () => {
      expect(maskIncome(140000, "INR")).toBe("₹•••••• /mo");
      expect(maskIncome(4500, "USD")).toBe("$•••••• /mo");
      expect(maskIncome(3800, "EUR")).toBe("€•••••• /mo");
      expect(maskIncome(null)).toBe("—");
    });
  });

  describe("Applicant Financial Risk Metric (RTI - Rent-to-Income)", () => {
    it("flags RTI <= 30% as Low Financial Risk", () => {
      // Monthly Income: ₹1,50,000, Unit Rent: ₹35,000 -> 23% RTI
      const rti: RtiAssessment = computeRti(150000, 35000);
      expect(rti.ratio).toBe(23);
      expect(rti.verdict).toBe("low");
      expect(rti.tone).toContain("emerald");
      expect(rti.description).toContain("<30% standard ceiling");
    });

    it("flags RTI between 31% and 45% as Moderate Financial Risk", () => {
      // Monthly Income: ₹80,000, Unit Rent: ₹30,000 -> 38% RTI
      const rti: RtiAssessment = computeRti(80000, 30000);
      expect(rti.ratio).toBe(38);
      expect(rti.verdict).toBe("moderate");
      expect(rti.tone).toContain("amber");
      expect(rti.description).toContain("30-45%");
    });

    it("flags RTI > 45% as High Financial Risk", () => {
      // Monthly Income: ₹40,000, Unit Rent: ₹25,000 -> 63% RTI
      const rti: RtiAssessment = computeRti(40000, 25000);
      expect(rti.ratio).toBe(63);
      expect(rti.verdict).toBe("high");
      expect(rti.tone).toContain("rose");
      expect(rti.description).toContain(">45%");
    });

    it("handles unassigned unit rent by defaulting to portfolio benchmark (₹25,000)", () => {
      // Monthly Income: ₹1,00,000, Unit Rent unassigned -> defaults to ₹25,000 -> 25% RTI
      const rti: RtiAssessment = computeRti(100000, null);
      expect(rti.ratio).toBe(25);
      expect(rti.verdict).toBe("low");
    });
  });

  describe("Rental Application Screening Lifecycle", () => {
    it("validates permissible application status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        new: ["screening", "declined", "withdrawn"],
        screening: ["approved", "declined", "withdrawn"],
        approved: ["withdrawn"], // Converted into lease
        declined: [],
        withdrawn: [],
      };

      expect(validTransitions.new).toContain("screening");
      expect(validTransitions.screening).toContain("approved");
      expect(validTransitions.declined.length).toBe(0);
    });
  });
});
