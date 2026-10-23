"use client";

import { useMemo, useState } from "react";
import { getPaywalls } from "@/lib/data";
import CatalogPagination, { CATALOG_PAGE_SIZE } from "@/components/CatalogPagination";
import { CreditCard, Search, Tag, CheckCircle2, Sparkles, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function PaywallsPage() {
  const paywalls = useMemo(() => getPaywalls(), []);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return paywalls.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.appName.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedType !== "All" && p.paywallType !== selectedType) {
        return false;
      }
      return true;
    });
  }, [paywalls, search, selectedType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Paywall & Onboarding Teardowns
          </h1>
          <span className="rounded-full bg-zinc-900 border border-zinc-700/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
            {filtered.length} Paywalls
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
          Analyze monetization screens, subscription pricing tiers, free trial structures, and psychological conversion tactics used by top mobile apps.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by app name or category..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-zinc-800 bg-[#09090b] pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none transition"
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
            className="rounded-xl border border-zinc-800 bg-[#09090b] px-3 py-2 text-xs font-semibold text-white focus:border-white focus:outline-none transition"
          >
            <option value="All">All Paywall Types</option>
            <option value="Trial with Toggle">Trial with Toggle</option>
            <option value="Hard">Hard Paywall</option>
            <option value="Soft (Freemium)">Soft (Freemium)</option>
          </select>
        </div>
      </div>

      {/* Paywalls Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE).map((pw) => (
          <div
            key={pw.id}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-[#09090b] transition duration-200 hover:border-zinc-500 hover:shadow-[0_0_25px_rgba(255,255,255,0.05)]"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={pw.appIcon}
                  alt={pw.appName}
                  className="h-10 w-10 rounded-xl border border-zinc-700 object-cover"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-white truncate max-w-[140px]">
                    {pw.appName}
                  </span>
                  <span className="text-[11px] text-zinc-400">{pw.category}</span>
                </div>
              </div>

              <span className="rounded-full bg-zinc-900 border border-zinc-700 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                {pw.paywallType}
              </span>
            </div>

            {/* Paywall Screenshot Preview */}
            <div className="relative aspect-[9/16] w-full max-h-[380px] overflow-hidden bg-black flex items-center justify-center p-2">
              <img
                src={pw.screenshotUrl}
                alt={pw.headline}
                className="h-full rounded-xl object-contain shadow-lg border border-zinc-800"
              />
              {pw.discountBadge && (
                <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-black shadow">
                  <Tag className="h-3 w-3" />
                  <span>{pw.discountBadge}</span>
                </div>
              )}
            </div>

            {/* Pricing Matrix */}
            <div className="p-4 border-t border-zinc-800/80 space-y-3">
              <span className="text-xs font-semibold text-white block">
                Detected Pricing Architecture:
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-black border border-zinc-800 p-2">
                  <span className="text-[10px] text-zinc-400 block">Annual Tier</span>
                  <span className="font-mono font-bold text-white">{pw.annualPrice}</span>
                </div>
                <div className="rounded-lg bg-black border border-zinc-800 p-2">
                  <span className="text-[10px] text-zinc-400 block">Weekly Tier</span>
                  <span className="font-mono font-bold text-zinc-300">{pw.weeklyPrice}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                <span>Includes {pw.trialDays}-day free trial before charge</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 pt-0">
              <Link
                href={`/app/${pw.appId}`}
                className="block w-full text-center rounded-xl bg-white hover:bg-zinc-200 py-2 text-xs font-bold text-black transition duration-200"
              >
                View Full App Breakdown
              </Link>
            </div>
          </div>
        ))}
      </div>
      <CatalogPagination page={page} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}
