import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  rankRecommendations,
  triageMaintenanceIssue,
  type CandidateListing,
  type UserRequirements,
} from "../ai";

describe("AI Engine — Cosine Similarity Math", () => {
  it("computes 1.0 similarity for identical vectors", () => {
    const v1 = [1, 2, 3, 4];
    const v2 = [1, 2, 3, 4];
    const similarity = cosineSimilarity(v1, v2);
    expect(similarity).toBeCloseTo(1.0, 5);
  });

  it("computes 0.0 similarity for orthogonal vectors", () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    const similarity = cosineSimilarity(v1, v2);
    expect(similarity).toBeCloseTo(0.0, 5);
  });

  it("handles empty or mismatched vector lengths safely", () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it("computes valid cosine similarity for scaled vectors", () => {
    const v1 = [2, 4, 6];
    const v2 = [1, 2, 3];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
  });
});

describe("AI Recommendation Engine — Multi-Criteria Ranking", () => {
  const sampleListings: CandidateListing[] = [
    {
      unit_id: 1,
      unit_name: "101",
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1100,
      market_rent: 28000,
      property_id: 10,
      property_name: "Greenwood Heights",
      property_type: "apartment",
      address: "12 Outer Ring Rd",
      city: "Bengaluru",
      state: "Karnataka",
      zip: "560103",
      year_built: 2021,
      property_color: "emerald",
    },
    {
      unit_id: 2,
      unit_name: "204",
      bedrooms: 3,
      bathrooms: 3,
      sqft: 1600,
      market_rent: 48000,
      property_id: 20,
      property_name: "Skyline Towers",
      property_type: "apartment",
      address: "88 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      zip: "560001",
      year_built: 2023,
      property_color: "blue",
    },
    {
      unit_id: 3,
      unit_name: "Villa 4",
      bedrooms: 4,
      bathrooms: 4,
      sqft: 2800,
      market_rent: 95000,
      property_id: 30,
      property_name: "Palm Meadows",
      property_type: "villa",
      address: "Whitefield Main Rd",
      city: "Bengaluru",
      state: "Karnataka",
      zip: "560066",
      year_built: 2019,
      property_color: "violet",
    },
  ];

  it("ranks budget-aligned 2BHK ahead of an expensive villa for 30k budget", () => {
    const reqs: UserRequirements = {
      target_budget: 30000,
      min_bedrooms: 2,
      min_bathrooms: 1,
      priority: "budget",
    };

    const results = rankRecommendations(sampleListings, reqs);
    expect(results.length).toBe(3);
    // Listing 1 (28k) fits budget perfectly, should be ranked first
    expect(results[0].listing.unit_id).toBe(1);
    expect(results[0].match_score).toBeGreaterThan(results[2].match_score);
    expect(results[0].highlights.length).toBeGreaterThan(0);
  });

  it("properly penalizes listings exceeding target budget by large margins", () => {
    const reqs: UserRequirements = {
      target_budget: 25000,
      priority: "budget",
    };
    const results = rankRecommendations(sampleListings, reqs);
    const expensiveVilla = results.find((r) => r.listing.unit_id === 3);
    expect(expensiveVilla).toBeDefined();
    expect(expensiveVilla!.breakdown.budget_score).toBeLessThan(0.4);
  });
});

describe("AI Maintenance Triage — Multimodal Fallback Analysis", () => {
  it("triages water leak as urgent plumbing issue", async () => {
    const res = await triageMaintenanceIssue({
      title: "Flooding in Bathroom",
      description: "Major pipe burst in bathroom, water flooding living area",
    });
    expect(res.suggested_category).toBe("plumber");
    expect(["urgent", "high"]).toContain(res.priority);
    expect(res.recommended_actions.length).toBeGreaterThan(0);
  });

  it("triages spark hazard as urgent electrical issue", async () => {
    const res = await triageMaintenanceIssue({
      title: "Breaker Box Sparks",
      description: "Main breaker sparking with burning odor",
    });
    expect(res.suggested_category).toBe("electrician");
    expect(res.priority).toBe("urgent");
    expect(res.safety_warnings.length).toBeGreaterThan(0);
  });

  it("triages air conditioner cooling issue as HVAC", async () => {
    const res = await triageMaintenanceIssue({
      title: "AC Not Cooling",
      description: "AC compressor making clicking sound, room not cooling",
    });
    expect(res.suggested_category).toBe("hvac");
    expect(res.urgency_rationale).toBeDefined();
  });

  it("gracefully falls back on generic description without crashing", async () => {
    const res = await triageMaintenanceIssue({ title: "", description: "" });
    expect(res).toBeDefined();
    expect(res.priority).toBeDefined();
    expect(Array.isArray(res.recommended_actions)).toBe(true);
  });
});
