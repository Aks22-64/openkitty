"use client";

import { useState, useMemo, useEffect } from "react";
import { AppItem } from "@/lib/types";
import { allApps, getTrendingApps, getRisingApps } from "@/lib/data";
import AppCard from "./AppCard";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { 
  Search, 
  LayoutGrid, 
  List, 
  Sparkles, 
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  TrendingUp,
  Layers
} from "lucide-react";

interface AppExplorerProps {
  catalog?: "all" | "trending" | "rising";
  title?: string;
  subtitle?: string;
  defaultSort?: string;
}

const ITEMS_PER_PAGE = 48;

export default function AppExplorer({ 
  catalog = "all",
  title = "Explore Mobile Apps & Games", 
  subtitle = "Market intelligence across the entire App Store & Google Play Store. Track revenue, downloads, velocity, and winning creatives.",
  defaultSort = "revenue"
}: AppExplorerProps) {
  // Keep the public catalog in the shared client bundle instead of serializing
  // every record into each page's HTML and React Server Component payload.
  const initialApps = useMemo(() => {
    if (catalog === "trending") return getTrendingApps();
    if (catalog === "rising") return getRisingApps();
    return allApps;
  }, [catalog]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [releaseFilter, setReleaseFilter] = useState<"all" | "new" | "classic">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortBy, setSortBy] = useState(defaultSort);
  const [minRevenue, setMinRevenue] = useState(0);
  const [minDownloads, setMinDownloads] = useState(0);
  const [hasAdsOnly, setHasAdsOnly] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Live Store Search across entire App Store & Play Store
  const [liveResults, setLiveResults] = useState<AppItem[] | null>(null);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Active working dataset
  const activeDataset = liveResults || initialApps;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, releaseFilter, minRevenue, minDownloads, hasAdsOnly, sortBy, liveResults]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeDataset.forEach(a => {
      if (a.category) set.add(a.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [activeDataset]);

  // Counts for release filter tabs
  const newReleasesCount = useMemo(() => activeDataset.filter(a => a.isNewRelease).length, [activeDataset]);
  const classicsCount = activeDataset.length - newReleasesCount;

  // Trigger search on the WHOLE App Store & Play Store
  const handleTriggerLiveStoreSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingLive(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&live=true`);
      const data = await res.json();
      if (!res.ok) setSearchError(data.error || "Search is temporarily unavailable. Please try again.");
      if (Array.isArray(data.results)) {
        setLiveResults(data.results);
      }
    } catch (err) {
      console.error("Live search failed:", err);
      setSearchError("Search is temporarily unavailable. Please try again.");
    } finally {
      setIsSearchingLive(false);
    }
  };

  const handleClearLiveResults = () => {
    setLiveResults(null);
    setSearchQuery("");
  };

  // Filtered & Sorted Apps
  const filteredApps = useMemo(() => {
    return activeDataset.filter(app => {
      // If live search is active, it's already matched by query
      if (!liveResults && searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = app.name.toLowerCase().includes(q);
        const matchesDev = app.developer.toLowerCase().includes(q);
        const matchesCat = app.category.toLowerCase().includes(q);
        if (!matchesName && !matchesDev && !matchesCat) return false;
      }
      // Category
      if (selectedCategory !== "All" && app.category !== selectedCategory) {
        return false;
      }
      // Release Era Filter
      if (releaseFilter === "new" && !app.isNewRelease) {
        return false;
      }
      if (releaseFilter === "classic" && app.isNewRelease) {
        return false;
      }
      // Min Revenue
      if (minRevenue > 0 && app.estMonthlyRevenue < minRevenue) {
        return false;
      }
      // Min Downloads
      if (minDownloads > 0 && app.estMonthlyDownloads < minDownloads) {
        return false;
      }
      // Has active ads
      if (hasAdsOnly && app.activeAdsCount === 0) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "newest") {
        return (b.releaseDate || "").localeCompare(a.releaseDate || "");
      }
      if (sortBy === "revenue") return b.estMonthlyRevenue - a.estMonthlyRevenue;
      if (sortBy === "downloads") return b.estMonthlyDownloads - a.estMonthlyDownloads;
      if (sortBy === "momentum") return b.momentumScore - a.momentumScore;
      if (sortBy === "rank") return a.currentRank - b.currentRank;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    });
  }, [activeDataset, liveResults, searchQuery, selectedCategory, releaseFilter, minRevenue, minDownloads, hasAdsOnly, sortBy]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredApps.length / ITEMS_PER_PAGE));
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApps.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredApps, currentPage]);

  // High-level aggregates
  const totalRev = useMemo(() => filteredApps.reduce((acc, a) => acc + a.estMonthlyRevenue, 0), [filteredApps]);
  const totalDl = useMemo(() => filteredApps.reduce((acc, a) => acc + a.estMonthlyDownloads, 0), [filteredApps]);
  const topBreakout = useMemo(() => [...filteredApps].sort((a, b) => b.rankVelocity - a.rankVelocity)[0], [filteredApps]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header & Stat Highlights */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {title}
            </h1>
            <span className="rounded-full bg-zinc-900 border border-zinc-700 px-3 py-0.5 text-xs font-mono font-bold text-zinc-300">
              {liveResults ? "Live Store Search" : `${filteredApps.length.toLocaleString()} Tracked`}
            </span>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Global Summary Stats (Mobile 2x2 grid, Desktop horizontal) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">
              Analyzed Revenue
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-white">
              {formatCurrency(totalRev)}/mo
            </span>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">
              Analyzed Downloads
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-zinc-200">
              {formatNumber(totalDl)}/mo
            </span>
          </div>

          {topBreakout && (
            <div className="col-span-2 sm:col-auto rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">
                Top Breakout
              </span>
              <span className="text-xs font-bold text-white truncate block max-w-[200px]">
                {topBreakout.name} (+{topBreakout.rankVelocity})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Live Store Search Banner */}
      {liveResults && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4 text-xs text-white">
          <div className="flex items-center gap-2.5">
            <Globe className="h-4 w-4 text-white shrink-0 animate-pulse" />
            <span>
              Showing live results queried from the <strong>Entire App Store & Google Play Store</strong> for &ldquo;{searchQuery}&rdquo;.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearLiveResults}
            className="self-start sm:self-auto shrink-0 rounded-xl bg-white hover:bg-zinc-200 text-black px-3.5 py-1.5 font-bold transition text-xs"
          >
            Reset to Curated Catalog
          </button>
        </div>
      )}

      {/* Release Era Filter Tabs (All / New Releases / Classics) */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => { setReleaseFilter("all"); setLiveResults(null); }}
          className={`flex shrink-0 items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl transition ${
            releaseFilter === "all" && !liveResults
              ? "bg-white text-black shadow-sm"
              : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <span>All Apps & Games</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.2 text-[10px] font-mono text-zinc-300">
            {initialApps.length.toLocaleString()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setReleaseFilter("new"); setLiveResults(null); }}
          className={`flex shrink-0 items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl transition ${
            releaseFilter === "new"
              ? "bg-white text-black shadow-sm"
              : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
          <span>✨ Latest Releases (2025–2026)</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.2 text-[10px] font-mono text-zinc-300">
            {newReleasesCount.toLocaleString()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setReleaseFilter("classic"); setLiveResults(null); }}
          className={`flex shrink-0 items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-bold rounded-xl transition ${
            releaseFilter === "classic"
              ? "bg-white text-black shadow-sm"
              : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
          }`}
        >
          <span>🏛️ Established Giants</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.2 text-[10px] font-mono text-zinc-300">
            {classicsCount.toLocaleString()}
          </span>
        </button>
      </div>

      {searchError && <p role="alert" className="text-sm text-red-300">{searchError}</p>}

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <form onSubmit={handleTriggerLiveStoreSearch} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input with integrated store button */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              maxLength={120}
              placeholder="Search across the whole App Store & Google Play Store (any app or game)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-24 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none transition shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setLiveResults(null); }}
                className="absolute right-24 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearchingLive || !searchQuery.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-white hover:bg-zinc-200 text-black px-2.5 py-1 text-[11px] font-bold disabled:opacity-30 transition flex items-center gap-1.5"
            >
              {isSearchingLive ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">Search Store</span>
            </button>
          </div>

          {/* Controls: Filter Drawer Toggle, Sort Dropdown & View Mode */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`flex items-center gap-2 rounded-xl border px-3 sm:px-3.5 py-2 text-xs font-semibold transition ${
                showFiltersPanel || minRevenue > 0 || minDownloads > 0 || hasAdsOnly
                  ? "border-white bg-white text-black font-bold"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {(minRevenue > 0 || minDownloads > 0 || hasAdsOnly) && (
                <span className="h-1.5 w-1.5 rounded-full bg-black" />
              )}
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-white focus:border-zinc-500 focus:outline-none transition"
            >
              <option value="newest">Sort: ✨ Latest Released</option>
              <option value="revenue">Sort: Highest Revenue</option>
              <option value="downloads">Sort: Most Downloads</option>
              <option value="momentum">Sort: Highest Momentum</option>
              <option value="rank">Sort: Store Rank</option>
              <option value="rating">Sort: User Rating</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid View"
                className={`rounded-lg p-1.5 transition ${
                  viewMode === "grid"
                    ? "bg-white text-black"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`rounded-lg p-1.5 transition ${
                  viewMode === "table"
                    ? "bg-white text-black"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>

        {/* Expandable Filters Drawer */}
        {showFiltersPanel && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition-all">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Min Revenue Slider */}
              <div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Min Monthly Revenue</span>
                  <span className="font-mono font-semibold text-white">
                    {minRevenue === 0 ? "Any" : formatCurrency(minRevenue)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000000"
                  step="50000"
                  value={minRevenue}
                  onChange={(e) => setMinRevenue(Number(e.target.value))}
                  className="mt-2 w-full accent-white cursor-pointer"
                />
              </div>

              {/* Min Downloads Slider */}
              <div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Min Monthly Downloads</span>
                  <span className="font-mono font-semibold text-white">
                    {minDownloads === 0 ? "Any" : formatNumber(minDownloads)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000000"
                  step="50000"
                  value={minDownloads}
                  onChange={(e) => setMinDownloads(Number(e.target.value))}
                  className="mt-2 w-full accent-white cursor-pointer"
                />
              </div>

              {/* Toggle: Has Active Ads */}
              <div className="flex items-center justify-between sm:justify-start gap-3 sm:pt-4">
                <label className="text-xs text-zinc-300 cursor-pointer flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={hasAdsOnly}
                    onChange={(e) => setHasAdsOnly(e.target.checked)}
                    className="rounded accent-white h-4 w-4"
                  />
                  <span>Active Ad Campaigns Only</span>
                </label>
                {(minRevenue > 0 || minDownloads > 0 || hasAdsOnly) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinRevenue(0);
                      setMinDownloads(0);
                      setHasAdsOnly(false);
                    }}
                    className="text-xs text-zinc-400 hover:text-white underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category Horizontal Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedCategory === cat
                  ? "bg-white text-black font-bold shadow-sm"
                  : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Pagination Info Header */}
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>
          Showing{" "}
          <strong className="text-white">
            {filteredApps.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
          </strong>{" "}
          to{" "}
          <strong className="text-white">
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredApps.length)}
          </strong>{" "}
          of <strong className="text-white">{filteredApps.length.toLocaleString()}</strong> apps
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-20 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-300" />
            </button>
            <span className="px-2 font-mono text-zinc-300 text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 disabled:opacity-20 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="h-4 w-4 text-zinc-300" />
            </button>
          </div>
        )}
      </div>

      {/* Results View */}
      {filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-white">
            <Globe className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">
            {searchQuery ? `No local matches for "${searchQuery}"` : "No apps found"}
          </h3>
          <p className="mt-1 text-xs text-zinc-400 max-w-md mx-auto">
            {searchQuery 
              ? "Query the entire App Store & Google Play Store live in real-time to analyze this app."
              : "Try adjusting your search query, clearing filters, or picking a different category."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => handleTriggerLiveStoreSearch()}
                disabled={isSearchingLive}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200 transition"
              >
                {isSearchingLive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                <span>Search Entire App Store Live</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
                setReleaseFilter("all");
                setMinRevenue(0);
                setMinDownloads(0);
                setHasAdsOnly(false);
                setLiveResults(null);
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {paginatedApps.map((app) => (
            <AppCard key={app.id} app={app} viewMode="grid" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">Rank</th>
                <th className="py-3 px-3 sm:px-4">App & Developer</th>
                <th className="py-3 px-4 hidden md:table-cell">Category</th>
                <th className="py-3 px-3 sm:px-4">Est. Revenue</th>
                <th className="py-3 px-3 sm:px-4">Est. Downloads</th>
                <th className="py-3 px-4 hidden sm:table-cell">Rating</th>
                <th className="py-3 px-3 sm:px-4 text-right">Velocity</th>
              </tr>
            </thead>
            <tbody>
              {paginatedApps.map((app) => (
                <AppCard key={app.id} app={app} viewMode="table" />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/80 pt-6 text-xs text-zinc-400">
          <div>
            Showing Page <strong className="text-white">{currentPage}</strong> of{" "}
            <strong className="text-white">{totalPages}</strong> ({filteredApps.length.toLocaleString()} total apps)
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-white disabled:opacity-20 disabled:cursor-not-allowed transition font-semibold"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-white disabled:opacity-20 disabled:cursor-not-allowed transition font-semibold"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
