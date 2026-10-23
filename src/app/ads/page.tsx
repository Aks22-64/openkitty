"use client";

import { useState, useMemo } from "react";
import { getAdCreatives } from "@/lib/data";
import CatalogPagination, { CATALOG_PAGE_SIZE } from "@/components/CatalogPagination";
import { 
  Eye, 
  Search, 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  Video, 
  Image as ImageIcon, 
  Layers,
  Sparkles
} from "lucide-react";

export default function AdsPage() {
  const creatives = useMemo(() => getAdCreatives(), []);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("All");
  const [format, setFormat] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return creatives.filter((ad) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!ad.appName.toLowerCase().includes(q) && !ad.hook.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (platform !== "All" && ad.platform !== platform) return false;
      if (format !== "All" && ad.format !== format) return false;
      return true;
    });
  }, [creatives, search, platform, format]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Mobile Ad Creative Spy
          </h1>
          <span className="rounded-full bg-zinc-900 border border-zinc-700/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
            {filtered.length} Creatives
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
          Discover top-performing active ad creatives, winning copywriting hooks, and video formats driving installs across Meta & TikTok.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by app name or creative hook..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-zinc-800 bg-[#09090b] pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none transition"
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <select
            value={platform}
            onChange={(e) => { setPlatform(e.target.value); setPage(1); }}
            className="rounded-xl border border-zinc-800 bg-[#09090b] px-3 py-2 text-xs font-semibold text-white focus:border-white focus:outline-none transition"
          >
            <option value="All">All Platforms</option>
            <option value="Meta">Meta (FB & IG)</option>
            <option value="TikTok">TikTok Ads</option>
          </select>

          <select
            value={format}
            onChange={(e) => { setFormat(e.target.value); setPage(1); }}
            className="rounded-xl border border-zinc-800 bg-[#09090b] px-3 py-2 text-xs font-semibold text-white focus:border-white focus:outline-none transition"
          >
            <option value="All">All Formats</option>
            <option value="Video">Video Ads</option>
            <option value="Image">Static Image</option>
            <option value="Carousel">Carousel</option>
          </select>
        </div>
      </div>

      {/* Creatives Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE).map((ad) => (
          <div
            key={ad.id}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-[#09090b] transition duration-200 hover:border-zinc-500 hover:shadow-[0_0_25px_rgba(255,255,255,0.05)]"
          >
            {/* Header info */}
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={ad.appIcon}
                  alt={ad.appName}
                  className="h-10 w-10 rounded-xl border border-zinc-700 object-cover"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-white truncate max-w-[150px]">
                    {ad.appName}
                  </span>
                  <span className="text-[11px] text-zinc-400">{ad.category}</span>
                </div>
              </div>

              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold border bg-zinc-900 border-zinc-700 text-zinc-300"
              >
                {ad.platform}
              </span>
            </div>

            {/* Creative Preview / Thumbnail */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
              <img
                src={ad.thumbnailUrl}
                alt={ad.hook}
                className="h-full w-full object-cover group-hover:scale-105 transition duration-300 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white border border-zinc-700">
                {ad.format === "Video" ? (
                  <Video className="h-3 w-3 text-white" />
                ) : ad.format === "Carousel" ? (
                  <Layers className="h-3 w-3 text-zinc-300" />
                ) : (
                  <ImageIcon className="h-3 w-3 text-zinc-300" />
                )}
                <span>{ad.format}</span>
              </div>
            </div>

            {/* Hook text & Meta stats */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Winning Creative Hook
                </span>
                <p className="text-xs font-medium text-white/90 line-clamp-2">
                  &ldquo;{ad.hook}&rdquo;
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-800/80 pt-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 block">Active Duration</span>
                  <span className="font-mono font-semibold text-white">
                    {ad.activeDays} Days Running
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Est. Ad Spend</span>
                  <span className="font-mono font-semibold text-white">
                    {ad.estimatedSpend}
                  </span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="p-4 pt-0">
              <a
                href={ad.adUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-zinc-900 hover:bg-white hover:text-black border border-zinc-700/80 py-2 text-xs font-bold text-white transition duration-200"
              >
                <span>Inspect in Meta Ad Library</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
      <CatalogPagination page={page} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}
