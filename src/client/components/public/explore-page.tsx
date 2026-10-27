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
  CheckCircle,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Cpu,
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
}

// Curated architectural photos matching luxury modern residences
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
  { label: "Koramangala (4th & 6th Block)", value: "Koramangala" },
  { label: "Indiranagar (100ft Rd Corridor)", value: "Indiranagar" },
  { label: "HSR Layout (Sector 1-4)", value: "HSR Layout" },
  { label: "Lavelle Road & Central", value: "Lavelle Road" },
  { label: "Whitefield Tech Corridor", value: "Whitefield" },
];

export function ExplorePage({ navigate, onApply }: ExplorePageProps) {
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
  const [activeTab, setActiveTab] = useState("");

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
    }, 200);
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
      title="Curated Living for Modern Bengaluru"
      meta={`${listings.length} verified residences · Zero Brokerage`}
      width="max-w-7xl"
      actions={
        <button
          onClick={() => setIsAiMatcherOpen(true)}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-emerald-500/25 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Sparkles className="h-3.5 w-3.5 fill-black" />
          AI Matchmaker v2.4
        </button>
      }
    >
      {/* ── STITCH OBSIDIAN EMERALD AI HERO BANNER ────────────────────── */}
      <section className="relative rounded-3xl glass-spec p-6 md:p-8 mb-8 overflow-hidden border border-emerald-500/25 shadow-2xl">
        {/* Ambient Radial Backlights */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Hero Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/50">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
                AI MATCHMAKER v2.4
              </span>
              <span className="text-muted-foreground text-[11px]">
                • Neural Commute Engine Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Rentals calibrated to your lifestyle and commute
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Deep hyper-spatial discovery covering Koramangala, Indiranagar, HSR Layout, and Lavelle Road with verified zero-brokerage listings.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Model Confidence
              </div>
              <div className="text-xl font-black text-emerald-400">99.4% Accurate</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Cpu className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Hero Interactive Calibration Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          {/* Left Column: Lifestyle Calibration Tags (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Lifestyle Calibration Tags</span>
              <span className="text-emerald-400 font-semibold">
                {activeLifestyleTags.length} Active
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {LIFESTYLE_TAGS.map((tag) => {
                const TagIcon = tag.icon;
                const active = activeLifestyleTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleLifestyleTag(tag.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                      active
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                        : "bg-card/70 text-muted-foreground border border-border/60 hover:border-emerald-500/30 hover:text-foreground"
                    }`}
                  >
                    <TagIcon className="h-3.5 w-3.5" />
                    <span>{tag.label}</span>
                    {active && <Check className="h-3 w-3 text-emerald-400 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: INR Budget Slider & Office Commute Corridor (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* INR Budget Slider Box */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Monthly Budget
                </span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono">
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
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer custom-slider"
                />
                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 font-mono">
                  <span>₹30k</span>
                  <span>₹75k</span>
                  <span>₹1.5L</span>
                  <span className="text-emerald-400 font-bold">₹2.5L+</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                <span className="text-[11px] font-medium text-emerald-400/90">0% Brokerage</span>
                <span className="text-[11px] font-semibold text-amber-400">2-Mo. Security Deposit</span>
              </div>
            </div>

            {/* Commute / Hub Target */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-md">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Office Commute Corridor</span>
                  <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                    <Navigation className="h-3 w-3" /> Live Traffic
                  </span>
                </label>
                <div className="relative mt-2">
                  <select
                    value={commuteHub}
                    onChange={(e) => setCommuteHub(e.target.value)}
                    className="w-full py-2 pl-8 pr-3 rounded-xl bg-background/80 border border-border text-xs text-foreground focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Embassy TechVillage / RMZ Ecospace (Max 25 mins)">
                      Embassy TechVillage / RMZ Ecospace (Max 25m)
                    </option>
                    <option value="Indiranagar 100ft Rd / CMH Metro (Max 10 mins)">
                      Indiranagar 100ft Rd / CMH Metro (Max 10m)
                    </option>
                    <option value="Bagmane Tech Park / CV Raman Nagar (Max 15 mins)">
                      Bagmane Tech Park / CV Raman Nagar (Max 15m)
                    </option>
                    <option value="Manyata Tech Park / Hebbal (Max 20 mins)">
                      Manyata Tech Park / Hebbal (Max 20m)
                    </option>
                    <option value="Electronic City Expressway Hub (Max 25 mins)">
                      Electronic City Expressway Hub (Max 25m)
                    </option>
                  </select>
                  <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-emerald-400" />
                </div>
              </div>

              {/* Recalibrate AI Matches Button */}
              <button
                onClick={() => setIsAiMatcherOpen(true)}
                className="mt-3 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]"
              >
                <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                <span>Recalibrate AI Matchmaker</span>
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── DISCOVERY TOOLBAR & NEIGHBORHOOD QUICK TABS ───────────────── */}
      <section className="space-y-4 mb-6">
        {/* Neighborhood Tabs */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2">
            {NEIGHBORHOOD_TABS.map((tab) => {
              const active = activeTab === tab.value;
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? "bg-emerald-500/15 border border-emerald-500/50 text-emerald-400 shadow-sm"
                      : "bg-card/70 border border-border/70 hover:border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-card/60 border border-border/70 backdrop-blur-md">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address, landmark, building name..."
              className="w-full rounded-xl border border-input bg-background/80 pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bedrooms */}
            <select
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
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
              className="rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="multi_family">Apartment / Penthouse</option>
              <option value="single_family">Gated Villa</option>
              <option value="condo">Condominium</option>
              <option value="townhouse">Townhouse</option>
            </select>

            {/* Zero Brokerage Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>0% Direct Owner</span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── CURATED APARTMENT GRID (3 COLUMNS) ───────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-96 rounded-3xl border border-border bg-card/60 animate-pulse overflow-hidden space-y-4"
            >
              <div className="h-56 bg-muted/60" />
              <div className="p-5 space-y-3">
                <div className="h-5 w-2/3 bg-muted rounded-md" />
                <div className="h-4 w-1/3 bg-muted rounded-md" />
                <div className="h-10 bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 p-12 text-center space-y-4 bg-card/40">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Building2 className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            No properties matching your requirements
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Try adjusting your budget slider or bedroom requirements, or reset the filters to see all available curated residences in Bengaluru.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition-all shadow-md"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item, index) => {
            const selected = isSelected(item.unit_id);
            const photoUrl = ARCHITECTURAL_PHOTOS[index % ARCHITECTURAL_PHOTOS.length];
            // Compute realistic AI Match Score based on index & features
            const matchScore = 98 - (index % 5) * 2;
            const maintenance = Math.round(item.market_rent * 0.05);

            return (
              <article
                key={item.unit_id}
                className={`group rounded-3xl glass-spec overflow-hidden glass-card-hover flex flex-col justify-between border transition-all duration-300 ${
                  selected
                    ? "border-emerald-500 ring-2 ring-emerald-500/25 shadow-xl shadow-emerald-500/10"
                    : "border-border/70 hover:border-emerald-500/40"
                }`}
              >
                <div>
                  {/* Architectural Image Container with Overlays */}
                  <div className="relative h-60 w-full overflow-hidden bg-muted">
                    <img
                      src={photoUrl}
                      alt={item.unit_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-black/50" />

                    {/* AI Match Chip (Top-Left) */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      <div className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/50 flex items-center gap-1.5 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-black tracking-wide text-emerald-400 font-mono">
                          {matchScore}% MATCH
                        </span>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] text-zinc-300 max-w-[210px] leading-tight">
                        AI Note: Near Indiranagar / Koramangala corridor & sound-insulated
                      </div>
                    </div>

                    {/* Top-Right: 0% Brokerage & Save */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/50 text-[10px] font-bold text-amber-300 tracking-wider">
                        0% BROKERAGE
                      </span>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-300 hover:text-emerald-400 transition-colors"
                      >
                        <Heart className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Property Type Badge (Bottom Right of Image) */}
                    <div className="absolute bottom-3 right-3 z-10">
                      <span className="capitalize rounded-lg bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-200">
                        {item.property_type.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5">
                    {/* Title & Landmark */}
                    <div className="mb-3">
                      <h3 className="text-base font-bold text-foreground group-hover:text-emerald-400 transition-colors leading-snug">
                        {item.unit_name} — {item.property_name}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>
                          {item.address || "Prime Enclave"},{" "}
                          {item.city || "Bengaluru"}
                        </span>
                      </p>
                    </div>

                    {/* Specs Row */}
                    <div className="flex items-center justify-around py-2.5 px-3 rounded-2xl bg-card/80 border border-border/50 text-xs text-foreground mb-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{item.bedrooms} BHK</span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1.5">
                        <Bath className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{item.bathrooms} Baths</span>
                      </div>
                      <span className="text-border">•</span>
                      <div className="flex items-center gap-1.5">
                        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{item.sqft ? item.sqft.toLocaleString() : "1,850"} sq.ft</span>
                      </div>
                    </div>

                    {/* Amenity Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 text-[10px] font-medium text-muted-foreground">
                        100% Power Backup
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 text-[10px] font-medium text-muted-foreground">
                        Private EV Charger
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 text-[10px] font-medium text-muted-foreground">
                        Pet Friendly
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Pricing & Actions */}
                <div className="p-5 pt-0 border-t border-border/40">
                  <div className="flex items-baseline justify-between pt-3 pb-3">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-foreground font-mono">
                          ₹{item.market_rent.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">/ month</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        + ₹{maintenance.toLocaleString("en-IN")} maint • 2 Mo. Deposit
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Ready to move
                      </span>
                    </div>
                  </div>

                  {/* Dual Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleComparison(item)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                        selected
                          ? "bg-emerald-500 text-black shadow-sm"
                          : "border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      title={selected ? "Remove from comparison" : "Add to comparison"}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApply(item)}
                      className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                    >
                      <span>Schedule Visit / Apply</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── FLOATING BOTTOM COMPARISON DOCK ──────────────────────────── */}
      {selectedForComparison.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl glass-spec border border-emerald-500/40 px-5 py-3 shadow-2xl emerald-glow animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black text-[10px] font-black">
              {selectedForComparison.length}
            </span>
            <span>of 3 residences selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedForComparison([])}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 font-medium"
            >
              Clear
            </button>
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-1.5 text-xs font-bold text-black shadow-md hover:bg-emerald-400 transition-all"
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
