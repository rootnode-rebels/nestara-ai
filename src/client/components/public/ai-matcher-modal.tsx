import { useState } from "react";
import { api } from "../../api";
import type { PublicListing } from "../../types";
import {
  Sparkles,
  DollarSign,
  Bed,
  CheckCircle2,
  X,
  ArrowRight,
  TrendingUp,
  Building,
  Maximize2,
  Percent,
} from "lucide-react";

interface AiMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (listing: PublicListing) => void;
}

interface ScoredRecommendation {
  listing: PublicListing;
  match_score: number;
  breakdown: {
    budget_score: number;
    space_score: number;
    layout_score: number;
    location_score: number;
  };
  highlights: string[];
}

export function AiMatcherModal({ isOpen, onClose, onApply }: AiMatcherModalProps) {
  const [budget, setBudget] = useState("2000");
  const [bedrooms, setBedrooms] = useState("1");
  const [priority, setPriority] = useState<"budget" | "space" | "balanced">("balanced");
  const [recommendations, setRecommendations] = useState<ScoredRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const res = await api<{ recommendations: ScoredRecommendation[] }>("POST", "/api/ai/recommend", {
        target_budget: budget ? parseFloat(budget) : undefined,
        min_bedrooms: parseInt(bedrooms, 10),
        priority,
      });
      setRecommendations(res.recommendations || []);
    } catch {
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 p-5 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                AI Property Recommender
              </h2>
              <p className="text-xs text-muted-foreground">
                Cosine vector similarity & multi-criteria matching
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Query Formulation Form */}
          <form onSubmit={handleMatch} className="space-y-4 rounded-2xl bg-muted/30 p-4 border border-border/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Target Monthly Budget (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Min Bedrooms
                </label>
                <div className="relative">
                  <Bed className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <select
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="0">Studio (0+)</option>
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3+ Bedrooms</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Recommendation Priority Focus
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "budget", label: "💰 Maximize Savings" },
                  { id: "space", label: "📐 Maximum Living Space" },
                  { id: "balanced", label: "⚖️ Balanced Match" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPriority(opt.id as any)}
                    className={`rounded-xl border p-2 text-center text-xs font-medium transition-all ${
                      priority === opt.id
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                "Calculating Vector Similarity…"
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate AI Recommendations
                </>
              )}
            </button>
          </form>

          {/* Results Display */}
          {searched && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Ranked Match Results</span>
                <span>{recommendations.length} properties evaluated</span>
              </div>

              {recommendations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  No matching properties found. Try relaxing your budget target.
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div
                      key={rec.listing.unit_id}
                      className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-500/20">
                            <Percent className="h-3 w-3" /> {rec.match_score}% Match
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            #{i + 1} Best Fit
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-foreground">
                            {rec.listing.unit_name} — {rec.listing.property_name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            ₹{rec.listing.market_rent.toLocaleString("en-IN")}/mo · {rec.listing.bedrooms}{" "}
                            Beds · {rec.listing.bathrooms} Baths ·{" "}
                            {rec.listing.sqft ? `${rec.listing.sqft} sqft` : "Flexible size"}
                          </p>
                        </div>

                        {/* Highlight bullet pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {rec.highlights.map((hl, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                            >
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" /> {hl}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          onClick={() => {
                            onClose();
                            onApply(rec.listing);
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                        >
                          Apply Now <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
