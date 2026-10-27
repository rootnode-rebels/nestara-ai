import { useState, useEffect, useCallback } from "react";
import { api } from "../../api";
import type { PublicListing } from "../../types";
import { PageShell } from "../page-shell";
import { CompareModal } from "./compare-modal";
import { AiMatcherModal } from "./ai-matcher-modal";
import { ApplyModal } from "./apply-modal";
import {
  Search,
  Building2,
  DollarSign,
  Bed,
  Bath,
  Maximize2,
  MapPin,
  CheckCircle,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ArrowRight,
  X,
} from "lucide-react";

interface ExplorePageProps {
  navigate: (to: string) => void;
  onApply?: (listing: PublicListing) => void;
}

export function ExplorePage({ navigate, onApply }: ExplorePageProps) {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [bedrooms, setBedrooms] = useState("all");
  const [propertyType, setPropertyType] = useState<string>("all");
  const [city, setCity] = useState("all");

  // AI, Comparison, & Apply state
  const [selectedForComparison, setSelectedForComparison] = useState<PublicListing[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isAiMatcherOpen, setIsAiMatcherOpen] = useState(false);
  const [applyListing, setApplyListing] = useState<PublicListing | null>(null);

  const handleApply = (listing: PublicListing) => {
    if (onApply) {
      onApply(listing);
    } else {
      setApplyListing(listing);
    }
  };


  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (minRent) params.append("minRent", minRent);
      if (maxRent) params.append("maxRent", maxRent);
      if (bedrooms !== "all") params.append("bedrooms", bedrooms);
      if (propertyType !== "all") params.append("propertyType", propertyType);
      if (city !== "all") params.append("city", city);

      const qs = params.toString();
      const url = `/api/public/listings${qs ? `?${qs}` : ""}`;
      const res = await api<{ listings: PublicListing[] }>("GET", url);
      setListings(res.listings || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [search, minRent, maxRent, bedrooms, propertyType, city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchListings]);

  const resetFilters = () => {
    setSearch("");
    setMinRent("");
    setMaxRent("");
    setBedrooms("all");
    setPropertyType("all");
    setCity("all");
  };

  const toggleComparison = (listing: PublicListing) => {
    setSelectedForComparison((prev) => {
      const exists = prev.some((l) => l.unit_id === listing.unit_id);
      if (exists) {
        return prev.filter((l) => l.unit_id !== listing.unit_id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), listing];
      }
      return [...prev, listing];
    });
  };

  const removeFromComparison = (unitId: number) => {
    setSelectedForComparison((prev) => prev.filter((l) => l.unit_id !== unitId));
  };

  const isSelected = (unitId: number) =>
    selectedForComparison.some((item) => item.unit_id === unitId);

  const hasActiveFilters =
    search.trim() !== "" ||
    minRent !== "" ||
    maxRent !== "" ||
    bedrooms !== "all" ||
    propertyType !== "all" ||
    city !== "all";

  return (
    <PageShell
      title="Explore Available Properties"
      meta={`${listings.length} verified available units matching criteria`}
      width="max-w-7xl"
      actions={
        <button
          onClick={() => setIsAiMatcherOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Recommender
        </button>
      }
    >
      {/* Hero Requirement Capture Panel */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-primary/5 p-6 md:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Assisted Renter Discovery
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Find Your Next Sanctuary
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Specify your requirements below: budget, location, size, and layout. Compare listings side-by-side or submit your online rental application directly.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mt-6 max-w-2xl">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by neighborhood, building name, or address..."
            className="w-full rounded-2xl border border-input bg-background/80 backdrop-blur pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
          />
        </div>

        {/* Structured Requirement Capture Controls */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Budget Filter */}
          <div className="rounded-xl border border-border/60 bg-background/50 p-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <span className="font-bold text-emerald-600 text-sm">₹</span>
              Max Monthly Budget (₹)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="e.g. 25000"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Bedrooms Filter */}
          <div className="rounded-xl border border-border/60 bg-background/50 p-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Bed className="h-3.5 w-3.5 text-blue-500" />
              Bedrooms
            </label>
            <select
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Any Bedrooms</option>
              <option value="1">1+ Bedrooms</option>
              <option value="2">2+ Bedrooms</option>
              <option value="3">3+ Bedrooms</option>
            </select>
          </div>

          {/* Property Type Filter */}
          <div className="rounded-xl border border-border/60 bg-background/50 p-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Building2 className="h-3.5 w-3.5 text-violet-500" />
              Property Type
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="single_family">Single Family</option>
              <option value="multi_family">Multi Family / Apt</option>
              <option value="condo">Condominium</option>
              <option value="townhouse">Townhouse</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          {/* City / Locality Filter */}
          <div className="rounded-xl border border-border/60 bg-background/50 p-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              City / Market
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Locations</option>
              <option value="Austin">Austin, TX</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
            <span className="text-muted-foreground">Filters applied</span>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <RotateCcw className="h-3 w-3" /> Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Property Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 rounded-2xl border border-border bg-card/60 animate-pulse p-6 space-y-4"
            >
              <div className="h-6 w-1/3 bg-muted rounded-md" />
              <div className="h-4 w-2/3 bg-muted rounded-md" />
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3 bg-card/40">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No properties matching your requirements
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your budget or bedroom requirements, or reset the filters to see all available units in the portfolio.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => {
            const selected = isSelected(item.unit_id);
            return (
              <div
                key={item.unit_id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 bg-card hover:shadow-lg ${
                  selected
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border/80 hover:border-primary/50"
                }`}
              >
                {/* Header Banner */}
                <div className="p-5 pb-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold">
                      <CheckCircle className="h-3 w-3" /> Available Now
                    </span>
                    <span className="capitalize rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {item.property_type.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.unit_name} — {item.property_name}
                    </h3>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      {item.address || "Address available upon inquiry"},{" "}
                      {item.city || "Austin"}, {item.state || "TX"}
                    </p>
                  </div>

                  {/* Rent Price Badge */}
                  <div className="pt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-foreground tracking-tight">
                      ₹{item.market_rent.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">/month</span>
                  </div>

                  {/* Specs & Features */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2.5 text-center mt-3 border border-border/40">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-center gap-1 text-xs font-semibold text-foreground">
                        <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.bedrooms}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Beds</div>
                    </div>
                    <div className="space-y-0.5 border-x border-border/50">
                      <div className="flex items-center justify-center gap-1 text-xs font-semibold text-foreground">
                        <Bath className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.bathrooms}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Baths</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-center gap-1 text-xs font-semibold text-foreground">
                        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.sqft ? item.sqft.toLocaleString() : "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Sq Ft</div>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="border-t border-border/60 bg-muted/20 p-4 pt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleComparison(item)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                      selected
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {selected ? "Selected" : "Compare"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApply(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground px-3 py-1.5 text-xs font-semibold transition-all"
                  >
                    Apply Online <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Comparison Dock */}
      {selectedForComparison.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md px-5 py-3 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span>{selectedForComparison.length} of 3 properties selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedForComparison([])}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Clear
            </button>
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
            >
              Compare Side-by-Side <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CompareModal
        selectedListings={selectedForComparison}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onRemove={removeFromComparison}
        onApply={(listing) => {
          setIsCompareModalOpen(false);
          handleApply(listing);
        }}
      />

      <AiMatcherModal
        isOpen={isAiMatcherOpen}
        onClose={() => setIsAiMatcherOpen(false)}
        onApply={(listing) => {
          setIsAiMatcherOpen(false);
          handleApply(listing);
        }}
      />

      <ApplyModal
        listing={applyListing}
        isOpen={Boolean(applyListing)}
        onClose={() => setApplyListing(null)}
      />
    </PageShell>
  );
}

