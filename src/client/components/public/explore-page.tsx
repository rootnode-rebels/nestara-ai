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
  Bed,
  Bath,
  Maximize2,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Train,
  Zap,
  VolumeX,
  Heart,
  Navigation,
  ShieldCheck,
  Check,
} from "lucide-react";

interface ExplorePageProps {
  navigate: (to: string) => void;
  onApply?: (listing: PublicListing) => void;
  currentPath?: string;
}

// Curated architectural photos for Bengaluru modern residences
const ARCHITECTURAL_PHOTOS = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
];

const LIFESTYLE_TAGS = [
  { id: "quiet", label: "Quiet Work Sanctuary", icon: VolumeX },
  { id: "pet", label: "Pet Friendly + Turf", icon: Heart },
  { id: "metro", label: "Metro Walkable (< 8 mins)", icon: Train },
  { id: "ev", label: "EV Charging Hub", icon: Zap },
  { id: "penthouse", label: "High Floor Penthouse", icon: Building2 },
  { id: "backup", label: "100% Power Backup", icon: ShieldCheck },
];

const NEIGHBORHOOD_TABS = [
  { label: "All Bengaluru", value: "" },
  { label: "Koramangala", value: "Koramangala" },
  { label: "Indiranagar", value: "Indiranagar" },
  { label: "HSR Layout", value: "HSR Layout" },
  { label: "Lavelle Road", value: "Lavelle Road" },
  { label: "Whitefield", value: "Whitefield" },
];

export function ExplorePage({ navigate, onApply, currentPath }: ExplorePageProps) {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("200000");
  const [bedrooms, setBedrooms] = useState("all");
  const [propertyType, setPropertyType] = useState<string>("all");
  const [city, setCity] = useState("all");
  const [activeLifestyleTags, setActiveLifestyleTags] = useState<string[]>(["quiet", "metro"]);
  const [commuteHub, setCommuteHub] = useState("Embassy TechVillage / RMZ Ecospace (Max 25 mins)");
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("loc") || "";
  });

  // AI, Comparison, & Apply state
  const [selectedForComparison, setSelectedForComparison] = useState<PublicListing[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isAiMatcherOpen, setIsAiMatcherOpen] = useState(false);
  const [applyListing, setApplyListing] = useState<PublicListing | null>(null);

  // Sync with URL query parameters whenever currentPath changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loc = urlParams.get("loc");
    setActiveTab(loc || "");
  }, [currentPath]);

  const handleApply = (listing: PublicListing) => {
    if (onApply) {
      onApply(listing);
    } else {
      setApplyListing(listing);
    }
  };

  const toggleLifestyleTag = (id: string) => {
    setActiveLifestyleTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const combinedSearch = [search.trim(), activeTab].filter(Boolean).join(" ");
      if (combinedSearch) params.append("search", combinedSearch);
      if (minRent) params.append("minRent", minRent);
      if (maxRent && Number(maxRent) < 250000) params.append("maxRent", maxRent);
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
  }, [search, activeTab, minRent, maxRent, bedrooms, propertyType, city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchListings]);

  const resetFilters = () => {
    setSearch("");
    setMinRent("");
    setMaxRent("200000");
    setBedrooms("all");
    setPropertyType("all");
    setCity("all");
    setActiveTab("");
    setActiveLifestyleTags(["quiet", "metro"]);
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
    activeTab !== "" ||
    minRent !== "" ||
    (maxRent !== "" && Number(maxRent) < 250000) ||
    bedrooms !== "all" ||
    propertyType !== "all" ||
    city !== "all";

  return (
    <PageShell
      title="Curated Living in Bengaluru"
      meta={`${listings.length} verified residences · Direct Owner Listings`}
      width="max-w-7xl"
      actions={
        <button
          onClick={() => setIsAiMatcherOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-2 text-xs font-semibold shadow-sm transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Matchmaker
        </button>
      }
    >
      {/* ── HUMAN-CRAFTED PROPERTY SEARCH & DISCOVERY BANNER ─────────── */}
      <section className="rounded-2xl border border-border bg-card p-6 md:p-7 mb-7 shadow-sm">
        {/* Banner Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border/60">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-muted text-foreground text-xs font-medium mb-2 border border-border/50">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Verified Portfolios</span>
              <span className="text-muted-foreground">• Zero Brokerage</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Rentals calibrated to your lifestyle and commute
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Curated residences across Koramangala, Indiranagar, HSR Layout, and Lavelle Road with verified leases and direct owner pricing.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[11px] font-medium text-muted-foreground">
                Match Confidence
              </div>
              <div className="text-base font-bold text-foreground">99.4% Accurate</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Calibration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5">
          {/* Left Column: Lifestyle Calibration Tags (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-2.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>Lifestyle Preferences</span>
              <span className="text-foreground text-[11px] font-normal">
                {activeLifestyleTags.length} active
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LIFESTYLE_TAGS.map((tag) => {
                const TagIcon = tag.icon;
                const active = activeLifestyleTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleLifestyleTag(tag.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <TagIcon className="h-3.5 w-3.5" />
                    <span>{tag.label}</span>
                    {active && <Check className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: INR Budget Slider & Commute Corridor (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Budget Box */}
            <div className="flex flex-col justify-between p-3.5 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  Monthly Budget
                </span>
                <span className="text-xs font-bold text-foreground">
                  Up to ₹{Number(maxRent).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="py-2">
                <input
                  type="range"
                  min="30000"
                  max="250000"
                  step="5000"
                  value={maxRent}
                  onChange={(e) => setMaxRent(e.target.value)}
                  className="w-full h-1.5 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer custom-slider"
                />
                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1.5">
                  <span>₹30k</span>
                  <span>₹75k</span>
                  <span>₹1.5L</span>
                  <span className="font-medium text-foreground">₹2.5L+</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                <span>0% Brokerage</span>
                <span className="font-medium text-foreground">2-Month Security Deposit</span>
              </div>
            </div>

            {/* Commute Corridor Target */}
            <div className="flex flex-col justify-between p-3.5 rounded-xl bg-muted/30 border border-border">
              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Commute Target</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Navigation className="h-3 w-3 text-emerald-600" /> Real-time
                  </span>
                </label>
                <div className="relative mt-2">
                  <select
                    value={commuteHub}
                    onChange={(e) => setCommuteHub(e.target.value)}
                    className="w-full py-1.5 pl-7 pr-3 rounded-lg bg-card border border-input text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="Embassy TechVillage / RMZ Ecospace (Max 25 mins)">
                      Embassy TechVillage / RMZ Ecospace (&lt;25m)
                    </option>
                    <option value="Indiranagar 100ft Rd / CMH Metro (Max 10 mins)">
                      Indiranagar 100ft Rd / Metro (&lt;10m)
                    </option>
                    <option value="Bagmane Tech Park / CV Raman Nagar (Max 15 mins)">
                      Bagmane Tech Park (&lt;15m)
                    </option>
                    <option value="Manyata Tech Park / Hebbal (Max 20 mins)">
                      Manyata Tech Park (&lt;20m)
                    </option>
                    <option value="Electronic City Expressway Hub (Max 25 mins)">
                      Electronic City Expressway (&lt;25m)
                    </option>
                  </select>
                  <MapPin className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Recalibrate Button */}
              <button
                onClick={() => setIsAiMatcherOpen(true)}
                className="mt-2.5 w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <span>Recalibrate Matchmaker</span>
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── NEIGHBORHOOD QUICK TABS & FILTERS ─────────────────────────── */}
      <section className="space-y-3 mb-6">
        {/* Neighborhood Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {NEIGHBORHOOD_TABS.map((tab) => {
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 rounded-xl bg-card border border-border">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by neighborhood, building, or address..."
              className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bedrooms */}
            <select
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Any BHK</option>
              <option value="1">1 BHK+</option>
              <option value="2">2 BHK+</option>
              <option value="3">3 BHK+</option>
              <option value="4">4 BHK+</option>
            </select>

            {/* Property Type */}
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="multi_family">Apartment / Penthouse</option>
              <option value="single_family">Gated Villa</option>
              <option value="condo">Condominium</option>
              <option value="townhouse">Townhouse</option>
            </select>

            {/* Zero Brokerage Badge */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium border border-border">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>0% Brokerage</span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── PROPERTY LISTINGS GRID ───────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-88 rounded-2xl border border-border bg-card animate-pulse overflow-hidden space-y-3"
            >
              <div className="h-48 bg-muted" />
              <div className="p-4 space-y-2.5">
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/3 bg-muted rounded" />
                <div className="h-8 bg-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3 bg-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            No properties matching your requirements
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your budget or bedroom requirements, or reset the filters to see all available properties.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((item, index) => {
            const selected = isSelected(item.unit_id);
            const photoUrl = ARCHITECTURAL_PHOTOS[index % ARCHITECTURAL_PHOTOS.length];
            const matchScore = 98 - (index % 5) * 2;
            const maintenance = Math.round(item.market_rent * 0.05);

            return (
              <article
                key={item.unit_id}
                className={`group rounded-2xl bg-card overflow-hidden flex flex-col justify-between border transition-all duration-200 ${
                  selected
                    ? "border-primary ring-1 ring-primary shadow-sm"
                    : "border-border hover:border-muted-foreground/40 hover:shadow-md"
                }`}
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative h-52 w-full overflow-hidden bg-muted">
                    <img
                      src={photoUrl}
                      alt={item.unit_name}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Match Score Badge (Top-Left) */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur text-white text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{matchScore}% Match</span>
                    </div>

                    {/* Zero Brokerage Badge (Top-Right) */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-black/75 backdrop-blur text-amber-300 text-[10px] font-semibold">
                        0% Brokerage
                      </span>
                    </div>

                    {/* Type Badge (Bottom-Right) */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="capitalize rounded bg-black/75 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-white">
                        {item.property_type.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {item.unit_name} — {item.property_name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                        <span>
                          {item.address || "Bengaluru Prime Enclave"},{" "}
                          {item.city || "Bengaluru"}
                        </span>
                      </p>
                    </div>

                    {/* Specs Row */}
                    <div className="flex items-center justify-around py-2 px-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs text-foreground font-medium">
                      <div className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{item.bedrooms} BHK</span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1">
                        <Bath className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{item.bathrooms} Baths</span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1">
                        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{item.sqft ? item.sqft.toLocaleString() : "1,850"} sq.ft</span>
                      </div>
                    </div>

                    {/* Amenity Badges */}
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                        100% Power Backup
                      </span>
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                        Private EV Charger
                      </span>
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                        Pet Friendly
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer: Price & Actions */}
                <div className="p-4 pt-0 border-t border-border/50">
                  <div className="flex items-baseline justify-between pt-2.5 pb-2.5">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-foreground">
                          ₹{item.market_rent.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-muted-foreground">/ month</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        + ₹{maintenance.toLocaleString("en-IN")} maint • 2 Mo. Deposit
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                      Available Now
                    </span>
                  </div>

                  {/* Dual Action Controls */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleComparison(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      title={selected ? "Selected for comparison" : "Compare"}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                      <span>{selected ? "Selected" : "Compare"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApply(item)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition-all"
                    >
                      <span>Schedule Visit / Apply</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── CLEAN COMPARISON DOCK ────────────────────────────────────── */}
      {selectedForComparison.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-2.5 shadow-xl animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {selectedForComparison.length}
            </span>
            <span>of 3 properties selected</span>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <button
              onClick={() => setSelectedForComparison([])}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 font-medium"
            >
              Clear
            </button>
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              <span>Compare Side-by-Side</span>
              <ArrowRight className="h-3.5 w-3.5" />
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
