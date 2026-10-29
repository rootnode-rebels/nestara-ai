import { describe, it, expect } from "vitest";
import { maskEmail, maskPhone, maskIncome } from "../lib/privacy";

describe("Personal Data Privacy — PII Masking Utilities", () => {
  it("masks standard email while preserving first/last letters and domain", () => {
    const masked = maskEmail("priya.sharma@example.com");
    expect(masked).toBe("p•••••a@example.com");
    expect(masked).not.toContain("priya");
    expect(masked).toContain("@example.com");
  });

  it("handles short usernames and invalid emails safely", () => {
    expect(maskEmail("ab@domain.com")).toBe("a•@domain.com");
    expect(maskEmail(null)).toBe("—");
    expect(maskEmail("")).toBe("—");
  });

  it("masks mobile numbers while keeping first prefix and last 3 digits", () => {
    const masked = maskPhone("+91 98765 43210");
    expect(masked).toBe("+91 9 •••• 210");
    expect(masked).not.toContain("98765");
  });

  it("handles empty or short phone strings", () => {
    expect(maskPhone(null)).toBe("—");
    expect(maskPhone("1234")).toBe("•••••");
  });

  it("masks sensitive financial salary values with proper currency indicator", () => {
    expect(maskIncome(75000, "INR")).toBe("₹•••••• /mo");
    expect(maskIncome(4500, "USD")).toBe("$•••••• /mo");
    expect(maskIncome(null)).toBe("—");
  });
});

