"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { AppItem } from "@/lib/types";
import { allApps } from "@/lib/data";
import AppCard from "./AppCard";
import CatalogPagination, { CATALOG_PAGE_SIZE } from "./CatalogPagination";
import UnavailableMetrics from "./UnavailableMetrics";
import AdLibraryLinks from "./AdLibraryLinks";

type Sort = "name" | "rating" | "ratings" | "newest";
export default function AppExplorer({ title = "Explore App Store listings", subtitle = "Browse genuine store information and search Apple's US iOS catalog.", defaultSort = "name", content = "catalog", notice }: {
  title?: string; subtitle?: string; defaultSort?: Sort; content?: "catalog" | "ads" | "screenshots"; notice?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState(1);
  const [searchResult, setSearchResult] = useState<{ query: string; apps: AppItem[]; live: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const dataset = searchResult?.apps ?? allApps;
  const categories = useMemo(() => ["All", ...Array.from(new Set(dataset.map(app => app.category))).sort()], [dataset]);
  const filtered = useMemo(() => dataset.filter(app => {
    const term = query.trim().toLowerCase();
    return (searchResult || !term || [app.name, app.developer, app.category].some(value => value.toLowerCase().includes(term))) &&
      (category === "All" || app.category === category);
  }).sort((a, b) => {
    if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
    if (sort === "ratings") return (b.ratingCount ?? -1) - (a.ratingCount ?? -1);
    if (sort === "newest") return (b.releaseDate ?? "").localeCompare(a.releaseDate ?? "");
    return a.name.localeCompare(b.name);
  }), [dataset, query, searchResult, category, sort]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / CATALOG_PAGE_SIZE)));
  const visible = filtered.slice((currentPage - 1) * CATALOG_PAGE_SIZE, currentPage * CATALOG_PAGE_SIZE);

  function editQuery(value: string) {
    requestRef.current?.abort();
    setLoading(false); setQuery(value); setSearchResult(null); setCategory("All"); setPage(1); setError("");
  }
  async function searchStore(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}&live=true`, { signal: controller.signal });
      if (response.status === 401) { window.location.assign("/login"); return; }
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) setError(data.error || "Store search is unavailable. Please try again.");
      if (Array.isArray(data.results)) {
        setSearchResult({ query: term, apps: data.results, live: data.fromLiveStore === true });
        setCategory("All"); setPage(1);
      }
    } catch {
      if (!controller.signal.aborted) setError("Store search is unavailable. Please try again.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }
  return <div className="space-y-6">
    <header className="space-y-2"><p className="text-xs uppercase tracking-widest text-zinc-400">Free store research · US iOS</p>
      <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1><p className="text-sm text-zinc-400">{subtitle}</p></header>
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-400">
      {notice && <p className="mb-2 text-zinc-200">{notice}</p>}
      Store fields come from Apple, with source and retrieval time on each listing. The starter catalog is a saved sample, not the whole market. Search Store retrieves current listings on demand. Android data is unavailable.
    </div>
    <UnavailableMetrics />
    {content === "ads" && <AdLibraryLinks name={query.trim()} detailed />}
    <form onSubmit={searchStore} className="flex flex-col gap-3 sm:flex-row">
      <label className="flex-1"><span className="sr-only">Search apps or developers</span><input value={query} maxLength={120}
        onChange={event => editQuery(event.target.value)} placeholder="Filter this catalog, or search the US App Store…"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm" /></label>
      <button disabled={loading || query.trim().length < 2} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-40">{loading ? "Searching…" : "Search Store"}</button>
      {searchResult && <button type="button" onClick={() => editQuery("")} className="rounded-xl border border-zinc-700 px-4 text-sm">Reset catalog</button>}
    </form>
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    {searchResult && <p role="status" className="text-sm text-zinc-300">{searchResult.live ? "Apple search results" : "Saved catalog matches"} for “{searchResult.query}”. Search position is not a chart rank.</p>}
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label>Category <select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }} className="ml-2 rounded-lg border border-zinc-700 bg-zinc-950 p-2">{categories.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Sort <select value={sort} onChange={event => { setSort(event.target.value as Sort); setPage(1); }} className="ml-2 rounded-lg border border-zinc-700 bg-zinc-950 p-2">
        <option value="name">Name</option><option value="rating">Store rating</option><option value="ratings">Rating count</option><option value="newest">Release date</option>
      </select></label>
      {content === "catalog" && <button type="button" onClick={() => setView(view === "grid" ? "table" : "grid")} className="rounded-lg border border-zinc-700 p-2">{view === "grid" ? "Table view" : "Grid view"}</button>}
      <span className="text-zinc-400">{filtered.length} listings{!searchResult ? ` in a ${allApps.length}-app snapshot` : ""}</span>
    </div>
    {visible.length === 0 ? <p className="rounded-xl border border-zinc-800 p-8 text-center text-zinc-400">No matching listings. Try another term or category.</p> : view === "table" && content === "catalog" ?
      <div className="overflow-x-auto rounded-xl border border-zinc-800"><table className="w-full text-left"><thead className="bg-zinc-900 text-xs text-zinc-400"><tr>{["App", "Category", "Store price", "Store rating", "Monthly revenue", "Monthly downloads", "Source"].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
        <tbody>{visible.map(app => <AppCard key={app.id} app={app} viewMode="table" />)}</tbody></table></div> :
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(app => <AppCard key={app.id} app={app} content={content} />)}</div>}
    <CatalogPagination page={currentPage} total={filtered.length} onPageChange={setPage} />
  </div>;
}
