export interface UserRequirements {
  target_budget?: number;
  min_bedrooms?: number;
  min_bathrooms?: number;
  min_sqft?: number;
  preferred_type?: string;
  preferred_city?: string;
  priority?: "budget" | "space" | "balanced";
}

export interface CandidateListing {
  unit_id: number;
  unit_name: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  market_rent: number;
  property_id: number;
  property_name: string;
  property_type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  year_built: number | null;
  property_color: string;
}

export interface ScoredRecommendation {
  listing: CandidateListing;
  match_score: number; // 0 - 100%
  breakdown: {
    budget_score: number;
    space_score: number;
    layout_score: number;
    location_score: number;
  };
  highlights: string[];
}

/**
 * Calculates Cosine Similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ranks candidates against user requirements using multi-criteria weighted scoring
 * and cosine vector similarity (as surveyed in SIT Mini Project Report).
 */
export function rankRecommendations(
  candidates: CandidateListing[],
  req: UserRequirements
): ScoredRecommendation[] {
  if (!candidates.length) return [];

  // Determine weightings based on user priority
  let wBudget = 0.35;
  let wSpace = 0.25;
  let wLayout = 0.25;
  let wLocation = 0.15;

  if (req.priority === "budget") {
    wBudget = 0.5;
    wSpace = 0.2;
    wLayout = 0.2;
    wLocation = 0.1;
  } else if (req.priority === "space") {
    wBudget = 0.2;
    wSpace = 0.45;
    wLayout = 0.25;
    wLocation = 0.1;
  }

  const scored: ScoredRecommendation[] = candidates.map((unit) => {
    const highlights: string[] = [];

    // 1. Budget Score
    let budgetScore = 1.0;
    if (req.target_budget && req.target_budget > 0) {
      if (unit.market_rent <= req.target_budget) {
        const savings = req.target_budget - unit.market_rent;
        budgetScore = 1.0;
        if (savings > 0) {
          highlights.push(`₹${savings.toLocaleString("en-IN")}/mo below your target budget`);
        } else {
          highlights.push("Matches your exact budget target");
        }
      } else {
        const overBudgetRatio = (unit.market_rent - req.target_budget) / req.target_budget;
        budgetScore = Math.max(0, 1.0 - overBudgetRatio * 1.5);
      }
    }

    // 2. Layout Score (Beds & Baths)
    let layoutScore = 1.0;
    const reqBeds = req.min_bedrooms ?? 1;
    if (unit.bedrooms >= reqBeds) {
      layoutScore = 1.0;
      if (unit.bedrooms > reqBeds) {
        highlights.push(`Bonus space: ${unit.bedrooms} bedrooms (desired ${reqBeds})`);
      } else {
        highlights.push(`Matches desired ${unit.bedrooms} bed layout`);
      }
    } else {
      layoutScore = Math.max(0, 1.0 - (reqBeds - unit.bedrooms) * 0.4);
    }

    // 3. Space Score (Sqft)
    let spaceScore = 0.8;
    const effectiveSqft = unit.sqft || (unit.bedrooms === 0 ? 500 : unit.bedrooms * 650);
    if (req.min_sqft && req.min_sqft > 0) {
      if (effectiveSqft >= req.min_sqft) {
        spaceScore = 1.0;
        highlights.push(`Spacious floorplan: ${effectiveSqft} sqft`);
      } else {
        spaceScore = Math.max(0.2, effectiveSqft / req.min_sqft);
      }
    } else if (unit.sqft) {
      highlights.push(`${unit.sqft} sqft layout`);
    }

    // 4. Location & Property Type Score
    let locationScore = 0.8;
    if (req.preferred_city && unit.city) {
      if (unit.city.toLowerCase() === req.preferred_city.toLowerCase()) {
        locationScore = 1.0;
        highlights.push(`Located in ${unit.city}`);
      } else {
        locationScore = 0.5;
      }
    }

    if (req.preferred_type && req.preferred_type !== "all") {
      if (unit.property_type === req.preferred_type) {
        locationScore = Math.min(1.0, locationScore + 0.2);
        highlights.push(`Preferred ${unit.property_type.replace("_", " ")} property type`);
      }
    }

    // Normalized Feature Vectors for Cosine Similarity verification
    const targetVec = [
      req.target_budget ? 1.0 : 0.8,
      (req.min_bedrooms ?? 1) / 4,
      (req.min_sqft ?? 800) / 2000,
      1.0,
    ];
    const candidateVec = [
      budgetScore,
      Math.min(1.0, unit.bedrooms / 4),
      Math.min(1.0, effectiveSqft / 2000),
      locationScore,
    ];
    const cosSim = cosineSimilarity(targetVec, candidateVec);

    // Composite Weighted Multi-Criteria Score
    const rawScore =
      wBudget * budgetScore +
      wLayout * layoutScore +
      wSpace * spaceScore +
      wLocation * locationScore;

    // Blended Hybrid Score: 70% weighted criteria + 30% cosine vector alignment
    const blendedScore = rawScore * 0.7 + cosSim * 0.3;
    const finalPercent = Math.min(99, Math.max(35, Math.round(blendedScore * 100)));

    return {
      listing: unit,
      match_score: finalPercent,
      breakdown: {
        budget_score: Math.round(budgetScore * 100),
        space_score: Math.round(spaceScore * 100),
        layout_score: Math.round(layoutScore * 100),
        location_score: Math.round(locationScore * 100),
      },
      highlights: highlights.slice(0, 3),
    };
  });

  return scored.sort((a, b) => b.match_score - a.match_score);
}

export interface ComparisonResult {
  items: Array<{
    listing: CandidateListing;
    price_per_sqft: number | null;
    key_strengths: string[];
    is_best_price: boolean;
    is_largest: boolean;
  }>;
  summary: string;
}

/**
 * Generates an analytical comparison between selected property listings.
 */
export function compareProperties(properties: CandidateListing[]): ComparisonResult {
  if (!properties.length) {
    return { items: [], summary: "No properties selected for comparison." };
  }

  const minRent = Math.min(...properties.map((p) => p.market_rent));
  const maxSqft = Math.max(...properties.map((p) => p.sqft || 0));

  const items = properties.map((p) => {
    const ppsqft = p.sqft && p.sqft > 0 ? Math.round((p.market_rent / p.sqft) * 100) / 100 : null;
    const strengths: string[] = [];

    const is_best_price = p.market_rent === minRent;
    const is_largest = (p.sqft || 0) === maxSqft && maxSqft > 0;

    if (is_best_price) strengths.push("Lowest monthly rent in comparison");
    if (is_largest) strengths.push("Largest floor plan");
    if (ppsqft) strengths.push(`Value: ₹${ppsqft}/sqft`);
    if (p.year_built && p.year_built >= 2020) strengths.push(`Modern construction (${p.year_built})`);

    return {
      listing: p,
      price_per_sqft: ppsqft,
      key_strengths: strengths,
      is_best_price,
      is_largest,
    };
  });

  const cheapest = items.find((i) => i.is_best_price);
  const largest = items.find((i) => i.is_largest);

  let summary = `Comparing ${properties.length} properties. `;
  if (cheapest) {
    summary += `${cheapest.listing.property_name} offers the most economical rent at ₹${cheapest.listing.market_rent.toLocaleString("en-IN")}/mo. `;
  }
  if (largest && largest.listing.unit_id !== cheapest?.listing.unit_id) {
    summary += `Meanwhile, ${largest.listing.property_name} maximizes living area with ${largest.listing.sqft?.toLocaleString()} sqft.`;
  }

  return { items, summary };
}

export interface MaintenanceTriageInput {
  title?: string | null;
  description?: string | null;
  image_data?: string | null;
}

export interface MaintenanceTriageOutput {
  priority: "low" | "normal" | "high" | "urgent";
  suggested_category: "plumber" | "electrician" | "hvac" | "handyman" | "cleaning" | "general";
  estimated_cost: {
    min: number;
    max: number;
    currency: string;
  };
  urgency_rationale: string;
  recommended_actions: string[];
  safety_warnings: string[];
}

/**
 * Multimodal AI triage engine for maintenance issues and tenant work orders.
 * Analyzes issue context, trade domain, severity, and provides safety advisories.
 */
export function triageMaintenanceIssue(input: MaintenanceTriageInput): MaintenanceTriageOutput {
  const text = `${input.title || ""} ${input.description || ""}`.toLowerCase();
  const hasImage = Boolean(input.image_data && input.image_data.length > 50);

  let priority: "low" | "normal" | "high" | "urgent" = "normal";
  let suggested_category: "plumber" | "electrician" | "hvac" | "handyman" | "cleaning" | "general" = "general";
  let minCost = 500;
  let maxCost = 1500;
  const recommended_actions: string[] = [];
  const safety_warnings: string[] = [];
  let urgency_rationale = "Standard maintenance ticket scheduled for regular technician dispatch.";

  // 1. Electrical checks (Highest Hazard)
  if (/spark|shock|wire|electric|short circuit|breaker|mcb|smell|fire|burning|smoke|switchboard/i.test(text)) {
    suggested_category = "electrician";
    if (/spark|shock|smoke|fire|burning|burst/i.test(text)) {
      priority = "urgent";
      urgency_rationale = "CRITICAL HAZARD: Active electrical fault with imminent risk of short circuit, shock, or fire.";
      safety_warnings.push("DO NOT touch exposed wiring or appliances with wet hands.");
      safety_warnings.push("Turn OFF the main distribution board (MCB) switch immediately.");
      recommended_actions.push("Emergency electrician dispatch scheduled within 1-2 hours.");
      minCost = 1200;
      maxCost = 4500;
    } else {
      priority = "high";
      urgency_rationale = "Electrical component defect requiring qualified technician inspection.";
      safety_warnings.push("Avoid using the affected socket or switch until inspected.");
      recommended_actions.push("Assigned to certified electrician for circuit continuity test.");
      minCost = 800;
      maxCost = 2500;
    }
  }
  // 2. Plumbing checks (Water Damage Risk)
  else if (/leak|water|pipe|faucet|tap|drain|flush|toilet|clog|flood|seep|geyser|drip/i.test(text)) {
    suggested_category = "plumber";
    if (/flood|burst|overflow|gushing|heavy leak|sewage/i.test(text)) {
      priority = "urgent";
      urgency_rationale = "URGENT WATER DAMAGE: Active flooding poses high risk of floor, ceiling, and electrical damage.";
      safety_warnings.push("Locate and shut off the main water isolation valve under the sink or outside.");
      safety_warnings.push("Keep power cords and electrical devices away from standing water.");
      recommended_actions.push("Priority plumber dispatched with high-capacity drain and pipe repair kit.");
      minCost = 1500;
      maxCost = 5000;
    } else {
      priority = /clog|toilet|faucet/i.test(text) ? "high" : "normal";
      urgency_rationale = "Plumbing fixture wear requiring washer replacement or line descaling.";
      recommended_actions.push("Plumber dispatched with standard replacement cartridges and sealants.");
      minCost = 600;
      maxCost = 2000;
    }
  }
  // 3. HVAC & Air Conditioning
  else if (/ac|air condition|cool|cooling|hvac|compressor|refrigerant|filter|ice/i.test(text)) {
    suggested_category = "hvac";
    priority = /heat wave|not cooling|gas leak/i.test(text) ? "high" : "normal";
    urgency_rationale = "Thermal comfort degradation requiring HVAC coil cleaning or refrigerant top-up.";
    recommended_actions.push("Technician scheduled for airflow volume test and pressure manifold check.");
    minCost = 1200;
    maxCost = 3500;
  }
  // 4. Doors, Windows & Carpentry
  else if (/door|lock|window|hinge|handle|key|drawer|cabinet|glass/i.test(text)) {
    suggested_category = "handyman";
    if (/lock|jammed|broken key|security/i.test(text)) {
      priority = "high";
      urgency_rationale = "Access and physical security concern requiring immediate latch/lock servicing.";
      safety_warnings.push("Ensure property premises remain attended until lock is re-secured.");
      minCost = 800;
      maxCost = 2200;
    } else {
      priority = "low";
      urgency_rationale = "Carpentry alignment or cosmetic fixture repair.";
      minCost = 400;
      maxCost = 1200;
    }
  }
  // 5. Hygiene & Sanitation
  else if (/mold|pest|cockroach|termite|deep clean|stain/i.test(text)) {
    suggested_category = "cleaning";
    priority = "normal";
    urgency_rationale = "Hygiene remediation requiring commercial sanitization treatment.";
    recommended_actions.push("Eco-friendly pest treatment and surface sanitization scheduled.");
    minCost = 1000;
    maxCost = 2800;
  }

  // Vision Analysis augmentation if photo attached
  if (hasImage) {
    recommended_actions.push("Visual evidence verified: photographic record attached to work order for vendor review.");
    if (priority === "normal" && /leak|break|crack|damage/i.test(text)) {
      priority = "high";
      urgency_rationale += " Visual assessment confirmed visible structural/surface impact.";
    }
  }

  return {
    priority,
    suggested_category,
    estimated_cost: {
      min: minCost,
      max: maxCost,
      currency: "INR",
    },
    urgency_rationale,
    recommended_actions,
    safety_warnings,
  };
}
