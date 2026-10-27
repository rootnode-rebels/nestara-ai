import { useState, useEffect } from "react";
import { api } from "../../api";
import type { PublicListing } from "../../types";
import {
  X,
  SlidersHorizontal,
  DollarSign,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  Building2,
  Check,
  Sparkles,
  ArrowRight,
  Shield,
} from "lucide-react";

interface CompareModalProps {
  selectedListings: PublicListing[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (unitId: number) => void;
  onApply: (listing: PublicListing) => void;
}

interface ComparisonData {
  items: Array<{
    listing: PublicListing;
    price_per_sqft: number | null;
    key_strengths: string[];
    is_best_price: boolean;
    is_largest: boolean;
  }>;
  summary: string;
}

export function CompareModal({
  selectedListings,
  isOpen,
  onClose,
  onRemove,
  onApply,
}: CompareModalProps) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || selectedListings.length === 0) return;
    const loadComparison = async () => {
      setLoading(true);
      try {
        const res = await api<{ comparison: ComparisonData }>("POST", "/api/ai/compare", {
          unit_ids: selectedListings.map((l) => l.unit_id),
        });
        setData(res.comparison);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    loadComparison();
  }, [isOpen, selectedListings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 p-5 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                AI Side-by-Side Property Comparison
              </h2>
              <p className="text-xs text-muted-foreground">
                Comparing {selectedListings.length} selected units
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Computing analytical metrics…
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No comparison metrics available.
            </div>
          ) : (
            <>
              {/* AI Analytical Synthesis Banner */}
              <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-primary">AI Evaluation Summary</span>
                  <p className="text-muted-foreground leading-relaxed">{data.summary}</p>
                </div>
              </div>

              {/* Comparison Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/70">
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground w-1/4">
                        Attribute
                      </th>
                      {data.items.map((item) => (
                        <th
                          key={item.listing.unit_id}
                          className="py-3 px-4 text-xs font-bold text-foreground text-center"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="truncate">{item.listing.unit_name}</span>
                            <button
                              onClick={() => onRemove(item.listing.unit_id)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Remove"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="text-[11px] font-normal text-muted-foreground truncate">
                            {item.listing.property_name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-xs">
                    {/* Monthly Rent */}
                    <tr>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Monthly Rent
                      </td>
                      {data.items.map((item) => (
                        <td
                          key={item.listing.unit_id}
                          className="py-3.5 px-4 text-center font-bold text-foreground"
                        >
                          ₹{item.listing.market_rent.toLocaleString("en-IN")}
                          {item.is_best_price && (
                            <span className="ml-2 inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                              Best Price
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Layout (Beds / Baths) */}
                    <tr>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground flex items-center gap-1.5">
                        <Bed className="h-3.5 w-3.5 text-blue-500" /> Bedrooms / Baths
                      </td>
                      {data.items.map((item) => (
                        <td key={item.listing.unit_id} className="py-3.5 px-4 text-center">
                          {item.listing.bedrooms} Beds · {item.listing.bathrooms} Baths
                        </td>
                      ))}
                    </tr>

                    {/* Square Footage */}
                    <tr>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground flex items-center gap-1.5">
                        <Maximize2 className="h-3.5 w-3.5 text-violet-500" /> Floor Area
                      </td>
                      {data.items.map((item) => (
                        <td key={item.listing.unit_id} className="py-3.5 px-4 text-center">
                          {item.listing.sqft ? `${item.listing.sqft.toLocaleString()} sqft` : "—"}
                          {item.is_largest && (
                            <span className="ml-2 inline-flex rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-600 border border-violet-500/20">
                              Largest
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Price per Sq Ft */}
                    <tr>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground">
                        Value per Sq Ft
                      </td>
                      {data.items.map((item) => (
                        <td key={item.listing.unit_id} className="py-3.5 px-4 text-center">
                          {item.price_per_sqft ? `₹${item.price_per_sqft.toFixed(2)}/sqft` : "—"}
                        </td>
                      ))}
                    </tr>

                    {/* Property Type */}
                    <tr>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-amber-500" /> Property Type
                      </td>
                      {data.items.map((item) => (
                        <td
                          key={item.listing.unit_id}
                          className="py-3.5 px-4 text-center capitalize"
                        >
                          {item.listing.property_type.replace("_", " ")}
                        </td>
                      ))}
                    </tr>

                    {/* Strengths */}
                    <tr>
                      <td className="py-3.5 px-4 font-medium text-muted-foreground">
                        Key Advantages
                      </td>
                      {data.items.map((item) => (
                        <td key={item.listing.unit_id} className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-center">
                            {item.key_strengths.map((str, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                              >
                                <Check className="h-3 w-3 text-emerald-500" /> {str}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Apply Actions */}
                    <tr>
                      <td className="py-4 px-4 font-medium text-muted-foreground">Next Step</td>
                      {data.items.map((item) => (
                        <td key={item.listing.unit_id} className="py-4 px-4 text-center">
                          <button
                            onClick={() => {
                              onClose();
                              onApply(item.listing);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
                          >
                            Apply Now <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
