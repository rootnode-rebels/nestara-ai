import { useState } from "react";
import { api } from "../../api";
import type { PublicListing } from "../../types";
import {
  Sparkles,
  Bed,
  CheckCircle2,
  X,
  ArrowRight,
  TrendingUp,
  Building,
  Maximize2,
  Percent,
  Cpu,
  ShieldCheck,
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
  const [budget, setBudget] = useState("75000");
  const [bedrooms, setBedrooms] = useState("2");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl glass-spec border border-emerald-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 p-5 px-6 bg-card/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  AI Property Recommender v2.4
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  Neural Commute
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Cosine vector similarity & multi-criteria weighted scoring
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Query Formulation Form */}
          <form onSubmit={handleMatch} className="space-y-4 rounded-2xl bg-card/50 p-4 border border-border/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Target Monthly Budget (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-emerald-400 font-mono">₹</span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g. 75000"
                    className="w-full rounded-xl border border-input bg-background/80 pl-8 pr-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Min Bedrooms
                </label>
                <div className="relative">
                  <Bed className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/80 pl-9 pr-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4+ BHK</option>
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
                  { id: "space", label: "📐 Maximum Area" },
                  { id: "balanced", label: "⚖️ Balanced Match" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPriority(opt.id as any)}
                    className={`rounded-xl border p-2 text-center text-xs font-medium transition-all ${
                      priority === opt.id
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold shadow-sm"
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
              className="w-full rounded-xl bg-primary hover:bg-primary/90 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                "Calculating Cosine Similarity & Commute Alignments…"
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Run AI Matchmaker
                </>
              )}
            </button>
          </form>

          {/* Results Display */}
          {searched && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Ranked Match Results</span>
                <span>{recommendations.length} residences evaluated</span>
              </div>

              {recommendations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                  No matching residences found. Try relaxing your budget target.
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div
                      key={rec.listing.unit_id}
                      className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-lg"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 font-mono">
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
                            BHK · {rec.listing.bathrooms} Baths ·{" "}
                            {rec.listing.sqft ? `${rec.listing.sqft} sqft` : "Flexible size"}
                          </p>
                        </div>

                        {/* Highlight bullet pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {rec.highlights.map((hl, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-foreground border border-border/50"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> {hl}
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
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-2 text-xs font-semibold transition-all shadow-sm"
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
