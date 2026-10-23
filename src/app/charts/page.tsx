"use client";

import { useState, useMemo } from "react";
import { allApps } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  DollarSign, 
  Download, 
  Percent, 
  Filter, 
  ArrowUpRight,
  SlidersHorizontal,
  Layers,
  Sparkles
} from "lucide-react";

type MetricType = "revenue" | "downloads" | "share" | "avgRevenue";
type ScopeType = "all" | "games" | "apps";

export default function ChartsPage() {
  const [metric, setMetric] = useState<MetricType>("revenue");
  const [scope, setScope] = useState<ScopeType>("all");
  const [limit, setLimit] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Aggregate stats by genre
  const genreStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      isGame: boolean;
      totalRevenue: number;
      totalDownloads: number;
      appCount: number;
      topApp: string;
      topAppIcon: string;
      topAppRevenue: number;
    }>();

    let grandTotalRevenue = 0;
    let grandTotalDownloads = 0;

    allApps.forEach((app) => {
      const cat = app.category || "Utilities";
      const isGame = cat.toLowerCase().includes("game");
      grandTotalRevenue += app.estMonthlyRevenue;
      grandTotalDownloads += app.estMonthlyDownloads;

      const current = map.get(cat) || {
        name: cat,
        isGame,
        totalRevenue: 0,
        totalDownloads: 0,
        appCount: 0,
        topApp: app.name,
        topAppIcon: app.iconUrl,
        topAppRevenue: app.estMonthlyRevenue,
      };

      current.totalRevenue += app.estMonthlyRevenue;
      current.totalDownloads += app.estMonthlyDownloads;
      current.appCount += 1;

      if (app.estMonthlyRevenue > current.topAppRevenue) {
        current.topApp = app.name;
        current.topAppIcon = app.iconUrl;
        current.topAppRevenue = app.estMonthlyRevenue;
      }

      map.set(cat, current);
    });

    const list = Array.from(map.values()).map((g) => ({
      ...g,
      marketShare: grandTotalRevenue > 0 ? (g.totalRevenue / grandTotalRevenue) * 100 : 0,
      downloadShare: grandTotalDownloads > 0 ? (g.totalDownloads / grandTotalDownloads) * 100 : 0,
      avgRevenuePerApp: g.appCount > 0 ? Math.round(g.totalRevenue / g.appCount) : 0,
    }));

    return { list, grandTotalRevenue, grandTotalDownloads };
  }, []);

  // Filter and sort by user specifications
  const filteredGenres = useMemo(() => {
    const filtered = genreStats.list.filter((g) => {
      if (scope === "games" && !g.isGame) return false;
      if (scope === "apps" && g.isGame) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (metric === "revenue") {
        valA = a.totalRevenue;
        valB = b.totalRevenue;
      } else if (metric === "downloads") {
        valA = a.totalDownloads;
        valB = b.totalDownloads;
      } else if (metric === "share") {
        valA = a.marketShare;
        valB = b.marketShare;
      } else if (metric === "avgRevenue") {
        valA = a.avgRevenuePerApp;
        valB = b.avgRevenuePerApp;
      }

      return sortOrder === "desc" ? valB - valA : valA - valB;
    });

    return filtered.slice(0, limit);
  }, [genreStats, metric, scope, limit, sortOrder]);

  // Determine max value for the relative bar widths
  const maxMetricValue = useMemo(() => {
    if (filteredGenres.length === 0) return 1;
    return Math.max(
      ...filteredGenres.map((g) => {
        if (metric === "revenue") return g.totalRevenue;
        if (metric === "downloads") return g.totalDownloads;
        if (metric === "share") return g.marketShare;
        return g.avgRevenuePerApp;
      })
    );
  }, [filteredGenres, metric]);

  const topGenre = filteredGenres[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Genre Performance & Market Share
          </h1>
          <span className="rounded-full bg-zinc-900 border border-zinc-700 px-3 py-0.5 text-xs font-mono font-bold text-zinc-300">
            Interactive Analytics
          </span>
        </div>
        <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Compare revenue generation, monthly download volumes, and market share distribution across mobile gaming and application genres.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4.5">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">
            Leading Genre
          </span>
          <div className="mt-1 text-lg font-bold text-white truncate">
            {topGenre ? topGenre.name : "N/A"}
          </div>
          <p className="mt-0.5 text-xs text-zinc-400 font-mono">
            {topGenre ? `${topGenre.marketShare.toFixed(1)}% market share` : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4.5">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">
            Total Market Revenue
          </span>
          <div className="mt-1 text-lg font-bold text-white font-mono">
            {formatCurrency(genreStats.grandTotalRevenue)}
            <span className="text-xs text-zinc-500 font-normal">/mo</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Across 15,000 tracked apps & games
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4.5">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">
            Total Market Downloads
          </span>
          <div className="mt-1 text-lg font-bold text-white font-mono">
            {formatNumber(genreStats.grandTotalDownloads)}
            <span className="text-xs text-zinc-500 font-normal">/mo</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Monthly installation volume
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4.5">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block">
            Average App Revenue
          </span>
          <div className="mt-1 text-lg font-bold text-white font-mono">
            {topGenre ? formatCurrency(topGenre.avgRevenuePerApp) : "$0"}
            <span className="text-xs text-zinc-500 font-normal">/app</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            For top performing genre
          </p>
        </div>
      </div>

      {/* Graph Customization Control Bar ("Specify the graph however he likes") */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
          <SlidersHorizontal className="h-3.5 w-3.5 text-white" />
          <span>Configure & Customize Graph</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Metric Switcher */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
              Primary Metric
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricType)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white focus:border-zinc-500 focus:outline-none transition"
            >
              <option value="revenue">Total Monthly Revenue ($)</option>
              <option value="downloads">Total Monthly Downloads (#)</option>
              <option value="share">Market Share Percentage (%)</option>
              <option value="avgRevenue">Avg. Revenue Per App ($/app)</option>
            </select>
          </div>

          {/* 2. Scope Filter (All / Games Only / Apps Only) */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
              Category Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ScopeType)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white focus:border-zinc-500 focus:outline-none transition"
            >
              <option value="all">All Genres (Games & Apps)</option>
              <option value="games">🎮 Games Only (18 Subgenres)</option>
              <option value="apps">📱 Non-Games Only (24 Categories)</option>
            </select>
          </div>

          {/* 3. Number of Genres displayed */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
              Genres to Show
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white focus:border-zinc-500 focus:outline-none transition"
            >
              <option value={5}>Top 5 Genres</option>
              <option value={10}>Top 10 Genres</option>
              <option value={15}>Top 15 Genres</option>
              <option value={20}>Top 20 Genres</option>
            </select>
          </div>

          {/* 4. Sort Order */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
              Ordering
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white focus:border-zinc-500 focus:outline-none transition"
            >
              <option value="desc">Highest to Lowest</option>
              <option value="asc">Lowest to Highest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Interactive Bar Chart Visualization */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-white" />
              <span>
                {metric === "revenue" && "Monthly Revenue Generated by Genre"}
                {metric === "downloads" && "Monthly Downloads Generated by Genre"}
                {metric === "share" && "Market Share of Total Store Revenue"}
                {metric === "avgRevenue" && "Average App Earnings by Genre"}
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Showing top {filteredGenres.length} genres ranked by {metric}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-white" />
            <span>Store Leaderboard</span>
          </div>
        </div>

        {/* Dynamic Horizontal Bars */}
        <div className="space-y-4 pt-2">
          {filteredGenres.map((genre, idx) => {
            let primaryDisplay = "";
            let rawVal = 0;

            if (metric === "revenue") {
              rawVal = genre.totalRevenue;
              primaryDisplay = formatCurrency(genre.totalRevenue);
            } else if (metric === "downloads") {
              rawVal = genre.totalDownloads;
              primaryDisplay = formatNumber(genre.totalDownloads);
            } else if (metric === "share") {
              rawVal = genre.marketShare;
              primaryDisplay = `${genre.marketShare.toFixed(1)}%`;
            } else {
              rawVal = genre.avgRevenuePerApp;
              primaryDisplay = formatCurrency(genre.avgRevenuePerApp);
            }

            const barPercentage = Math.max(Math.round((rawVal / maxMetricValue) * 100), 4);

            return (
              <div key={genre.name} className="group space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-zinc-500 font-bold w-5 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-white group-hover:text-zinc-300 transition truncate">
                      {genre.name}
                    </span>
                    <span className="hidden sm:inline text-[10px] text-zinc-500 font-mono">
                      ({genre.appCount.toLocaleString()} apps)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-white text-xs sm:text-sm">
                      {primaryDisplay}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono w-14 text-right">
                      {genre.marketShare.toFixed(1)}% share
                    </span>
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="relative h-4 sm:h-5 w-full rounded-lg bg-zinc-900/80 overflow-hidden border border-zinc-800">
                  <div
                    className="h-full rounded-md bg-white transition-all duration-500 ease-out group-hover:bg-zinc-200"
                    style={{ width: `${barPercentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Genre Breakdown Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-white" />
            <span>Detailed Genre Breakdown & Top Performer</span>
          </h2>
          <span className="text-xs text-zinc-500">
            Click any genre to explore its apps
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">Rank</th>
                <th className="py-3 px-3 sm:px-4">Genre</th>
                <th className="py-3 px-3 sm:px-4">Monthly Revenue</th>
                <th className="py-3 px-3 sm:px-4">Market Share</th>
                <th className="py-3 px-3 sm:px-4 hidden sm:table-cell">Monthly Downloads</th>
                <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Avg. App Earnings</th>
                <th className="py-3 px-3 sm:px-4">#1 App in Genre</th>
              </tr>
            </thead>
            <tbody>
              {filteredGenres.map((genre, idx) => (
                <tr
                  key={genre.name}
                  className="border-b border-zinc-800/60 hover:bg-zinc-900/60 transition"
                >
                  <td className="py-3 px-3 sm:px-4 font-mono font-bold text-zinc-500">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-3 sm:px-4 font-semibold text-white">
                    <Link
                      href={`/?category=${encodeURIComponent(genre.name)}`}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      <span>{genre.name}</span>
                      <ArrowUpRight className="h-3 w-3 text-zinc-500" />
                    </Link>
                  </td>
                  <td className="py-3 px-3 sm:px-4 font-mono font-bold text-white">
                    {formatCurrency(genre.totalRevenue)}
                  </td>
                  <td className="py-3 px-3 sm:px-4 font-mono text-zinc-300">
                    {genre.marketShare.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 sm:px-4 font-mono text-zinc-400 hidden sm:table-cell">
                    {formatNumber(genre.totalDownloads)}
                  </td>
                  <td className="py-3 px-3 sm:px-4 font-mono text-zinc-300 hidden md:table-cell">
                    {formatCurrency(genre.avgRevenuePerApp)}
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={genre.topAppIcon}
                        alt={genre.topApp}
                        className="h-6 w-6 rounded-md border border-zinc-800 object-cover"
                      />
                      <span className="text-white truncate max-w-[120px]">
                        {genre.topApp}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
