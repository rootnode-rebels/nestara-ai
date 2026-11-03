import { describe, expect, it } from "vitest";
import { computeRti } from "../components/applications/applications-page";

describe("Financial Risk Assessment — Rent-to-Income (RTI) Calculations", () => {
  it("classifies affordability < 30% as Low Risk", () => {
    // ₹1,00,000 monthly income, ₹25,000 rent => 25% RTI
    const result = computeRti(100000, 25000);
    expect(result.ratio).toBe(25);
    expect(result.verdict).toBe("low");
    expect(result.label).toContain("Low Risk");
  });

  it("classifies affordability between 30% and 45% as Moderate Risk", () => {
    // ₹70,000 monthly income, ₹25,000 rent => 36% RTI
    const result = computeRti(70000, 25000);
    expect(result.ratio).toBe(36);
    expect(result.verdict).toBe("moderate");
    expect(result.label).toContain("Moderate");
  });

  it("classifies affordability > 45% as High Risk", () => {
    // ₹40,000 monthly income, ₹25,000 rent => 63% RTI
    const result = computeRti(40000, 25000);
    expect(result.ratio).toBe(63);
    expect(result.verdict).toBe("high");
    expect(result.label).toContain("High Risk");
  });

  it("gracefully handles missing or zero income", () => {
    const result = computeRti(null, 25000);
    expect(result.ratio).toBeNull();
    expect(result.verdict).toBe("unknown");
    expect(result.label).toBe("RTI N/A");
  });

  it("uses default portfolio benchmark rent when unit is unassigned", () => {
    // ₹1,00,000 income, unassigned rent defaults to ₹25,000 benchmark => 25%
    const result = computeRti(100000, null);
    expect(result.ratio).toBe(25);
    expect(result.verdict).toBe("low");
  });
});

