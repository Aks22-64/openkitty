"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { GrossingPayload, GrossingRow, RankChange } from "@/lib/grossing-types";
import AdLibraryLinks from "./AdLibraryLinks";

const WORKFLOW = "https://github.com/Aks22-64/openkitty/actions/workflows/daily-grossing.yml";
const titles = { charts: "Top Grossing", movers: "Grossing Movers", shortlist: "Opportunity Shortlist" };
const subtitles = {
  charts: "Find apps appearing in Apple’s revenue-related charts, then explore the niches behind them.",
  movers: "See which apps climbed or entered the observed top 100. Changes compare the same US chart on exact dates.",
  shortlist: "Grossing apps with a recent release or a lower US rating count. A starting point for competitor research.",
};
const utc = (value: string) => value.replace("T", " ").slice(0, 16) + " UTC";

function Change({ value }: { value: RankChange }) {
  if (value.status === "entered") return <span className="text-sky-300" title={`Absent from this chart’s observed top 100 on ${value.comparedDate}. Not necessarily a new app.`}>Entered top 100</span>;
  if (value.status === "compared") return <span className={value.delta! > 0 ? "text-emerald-300" : value.delta! < 0 ? "text-rose-300" : "text-zinc-400"} title={`Compared with rank #${value.previousRank} on ${value.comparedDate}`}>
    {value.delta! > 0 ? `↑ ${value.delta}` : value.delta! < 0 ? `↓ ${Math.abs(value.delta!)}` : "No change"}
  </span>;
  return <span className="text-zinc-500" title={value.status === "source-unchanged" ? "Apple has not published a newer chart for this comparison." : `No comparable snapshot for ${value.comparedDate}.`}>
    {value.status === "source-unchanged" ? "Source unchanged" : "Awaiting data"}
  </span>;
}

function ResearchRow({ row, days, shortlist }: { row: GrossingRow; days: number; shortlist: boolean }) {
  const app = row.app;
  return <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5">
    <div className="flex gap-3 sm:gap-4">
      <div className="w-12 shrink-0 pt-1 text-center"><span className="font-mono text-xl font-bold text-white">#{row.rank}</span><div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">Grossing</div></div>
      {app.iconUrl && /* eslint-disable-next-line @next/next/no-img-element */
        <img src={app.iconUrl} alt="" width={52} height={52} loading="lazy" className="hidden h-12 w-12 shrink-0 rounded-xl object-contain sm:block" />}
      <div className="min-w-0 flex-1">
        <Link href={`/app/${app.id}`} prefetch={false} className="text-base font-semibold hover:underline sm:text-lg">{app.name}</Link>
        <p className="mt-1 text-xs text-zinc-400">{app.developer} · {row.chartName} · US iOS</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <span><span className="text-zinc-500">{days}d: </span><Change value={row.change} /></span>
          {days !== 7 && <span><span className="text-zinc-500">7d: </span><Change value={row.change7} /></span>}
          {days !== 30 && <span><span className="text-zinc-500">30d: </span><Change value={row.change30} /></span>}
          <span className="text-zinc-400">{app.ratingCount === null ? "Rating count unavailable" : `${app.ratingCount.toLocaleString("en-US")} US ratings`}</span>
          <span className="text-zinc-400">Released {app.releaseDate?.slice(0, 10) ?? "Unavailable"}</span>
        </div>
        {shortlist && <div className="mt-3 flex flex-wrap gap-2">{row.reasons.map(reason => <span key={reason} className="rounded-md border border-emerald-900/70 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-200">{reason}</span>)}</div>}
      </div>
      <a href={app.storeUrl} target="_blank" rel="noopener noreferrer" className="self-start rounded-lg border border-zinc-700 px-3 py-2 text-xs hover:border-white">Store ↗</a>
    </div>
    <details className="mt-4 border-t border-zinc-800 pt-3">
      <summary className="cursor-pointer text-xs text-zinc-400 hover:text-white">Rank history & research</summary>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">Observed {row.chartName} ranks</h3>
          <p className="mb-3 text-xs text-zinc-500">Last {row.history.length} collected days. Missing days are not filled in. An absent app has no observed rank.</p>
          <div className="max-h-52 overflow-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs"><thead className="text-zinc-500"><tr><th className="p-2">Date (UTC)</th><th className="p-2">Rank</th><th className="p-2">Apple published</th></tr></thead>
              <tbody>{[...row.history].reverse().map(point => <tr key={point.date} className="border-t border-zinc-800"><td className="p-2">{point.date}</td><td className="p-2">{point.rank === null ? "Not observed in top 100" : `#${point.rank}`}</td><td className="p-2 text-zinc-400">{utc(point.sourceUpdatedAt)}</td></tr>)}</tbody></table>
          </div>
          {row.appearances.length > 1 && <p className="mt-2 text-xs text-zinc-400">Also observed: {row.appearances.slice(1).map(a => `${a.chartName} #${a.rank}`).join(" · ")}. Category ranks are separate charts.</p>}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Investigate the business</h3>
          <p className="text-xs leading-relaxed text-zinc-400">Check subscription pricing, recent reviews, unmet needs and advertiser identity. An ad-library link does not confirm active ads or profitable acquisition.</p>
          <AdLibraryLinks name={app.name} developer={app.developer} />
          <p className="text-xs text-zinc-500">Store price: {app.priceFormatted}. Revenue, downloads, ad spend and profit: Unavailable.</p>
          {app.metadataSourceUrl && <p className="text-xs text-zinc-500"><a className="underline" href={app.metadataSourceUrl} target="_blank" rel="noopener noreferrer">Apple store metadata ↗</a> · fetched {utc(app.metadataRetrievedAt!)}</p>}
          <Link href={`/app/${app.id}`} prefetch={false} className="inline-block text-xs text-white underline">Open description & screenshots →</Link>
        </div>
      </div>
    </details>
  </article>;
}

export default function GrossingExplorer({ initial }: { initial: GrossingPayload }) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function select(chart: string, days = data.days, page = 1) {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ mode: data.mode, chart, days: String(days), page: String(page) });
      const response = await fetch(`/api/grossing?${params}`, { signal: request.signal });
      if (response.status === 401) { window.location.assign("/login"); return; }
      if (!response.ok) throw new Error("Could not load this selection. The previous results are still shown. Try again shortly.");
      const next: GrossingPayload = await response.json();
      if (!request.signal.aborted) setData(next);
    } catch (cause) { if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load data."); }
    finally { if (!request.signal.aborted) setLoading(false); }
  }
  const shortlist = data.mode === "shortlist";
  const source = data.charts.find(c => c.id === data.selectedChart);
  return <div className="space-y-6">
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-3"><span className="rounded-full border border-emerald-900 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-300">Apple Top Grossing · US iOS</span><span className="text-xs text-zinc-500">Free sources · Daily snapshots</span></div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{titles[data.mode]}</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-zinc-400">{subtitles[data.mode]}</p>
      <p className="text-xs text-zinc-500">A grossing rank is a revenue-related signal. Dollar revenue, downloads and profit are unavailable; rank alone does not establish a viable business.</p>
      {data.mode === "charts" && <Link href="/rising" className="inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">Find smaller / newer candidates →</Link>}
    </header>
    <section aria-label="Collection status" className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs leading-relaxed text-zinc-400">
      <div className="flex flex-wrap justify-between gap-2"><p><strong className="text-zinc-200">Snapshot {data.snapshotDate} UTC</strong> · {data.snapshotCount} day{data.snapshotCount === 1 ? "" : "s"} collected · Tracking since {data.firstDate}</p><a href={WORKFLOW} target="_blank" rel="noopener noreferrer" className="underline">Collection status ↗</a></div>
      <p className="mt-1">{data.schedule}. Changes can take up to one hour to appear after collection. Rolling 90-day history.</p>
      <p className="mt-1">Collected {utc(data.collectedAt)}{data.chartSourceUpdatedAt ? ` · Apple published ${utc(data.chartSourceUpdatedAt)}` : " · Each category has its own Apple publication timestamp"}.</p>
      {data.snapshotCount === 1 && <p className="mt-2 text-sky-300">Baseline collected. Daily movement needs another successful snapshot; 7-day and 30-day changes need those comparison dates.</p>}
      {data.stale && <p role="status" className="mt-2 text-amber-300">Collection is over 36 hours old. These are saved ranks, not current charts. Check collection status above.</p>}
      {data.sourceFallback && <p role="status" className="mt-2 text-amber-300">The latest history could not be loaded. Showing the verified snapshot packaged with this deployment.</p>}
      {data.metadataMissing > 0 && <p className="mt-2">Store metadata unavailable for {data.metadataMissing} chart apps. Missing fields do not qualify an app for the shortlist.</p>}
    </section>
    {shortlist && <details className="rounded-xl border border-zinc-800 p-4 text-xs text-zinc-400" open>
      <summary className="cursor-pointer font-semibold text-zinc-200">How this shortlist is selected</summary>
      <p className="mt-2 leading-relaxed">In a tracked grossing top 100, and either originally released within 3 years or has 25,000 or fewer US ratings. A maintained list of major publishers is excluded ({data.majorPublishersHidden} hidden in this selection). Ordered by original release date, then rating count. No invented opportunity score.</p>
      <p className="mt-2 leading-relaxed">Lower rating count is a smaller audience-footprint proxy; it does not prove team size, low competition or easy entry. A recent release may come from an established company. Compare the problem, pricing and reviews before choosing what to build.</p>
    </details>}
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex flex-col gap-2 text-xs text-zinc-400">Grossing chart
        <select value={data.selectedChart} disabled={loading} onChange={event => void select(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white disabled:opacity-60">
          {shortlist && <option value="all">All tracked niches</option>}
          {data.charts.map(chart => <option key={chart.id} value={chart.id}>{chart.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-xs text-zinc-400">Compare with
        <select value={data.days} disabled={loading} onChange={event => void select(data.selectedChart, Number(event.target.value))} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white disabled:opacity-60">
          {[1, 7, 30].map(days => <option key={days} value={days}>{days} day{days === 1 ? "" : "s"} earlier</option>)}
        </select>
      </label>
      {source && <a href={source.url} target="_blank" rel="noopener noreferrer" className="pb-2 text-xs text-zinc-400 underline">Apple chart source ↗</a>}
      <p aria-live="polite" className="pb-2 text-xs text-zinc-500">{loading ? "Loading selection…" : `${data.total} ${shortlist ? "candidates" : data.mode === "movers" ? "movers / entrants" : "ranked apps"}`}</p>
    </div>
    {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
    <div aria-busy={loading} className={`space-y-3 ${loading ? "opacity-60" : ""}`}>
      {data.rows.map(row => <ResearchRow key={`${row.chartId}-${row.app.id}`} row={row} days={data.days} shortlist={shortlist} />)}
      {!data.rows.length && <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center"><h2 className="font-semibold">{data.mode === "movers" && !data.comparisonAvailable ? "Waiting for a comparable snapshot" : shortlist ? "No candidates match these rules" : "No upward moves or entrants in this comparison"}</h2><p className="mt-2 text-sm text-zinc-400">{data.mode === "movers" && !data.comparisonAvailable ? "Rank movement appears only when both dates have a successful collection and Apple has published a newer chart." : "Try another category or comparison period."}</p><Link href="/" className="mt-4 inline-block text-sm underline">Browse the grossing charts</Link></div>}
    </div>
    {data.pages > 1 && <nav aria-label="Chart pages" className="flex items-center justify-center gap-4 text-sm">
      <button disabled={loading || data.page <= 1} onClick={() => void select(data.selectedChart, data.days, data.page - 1)} className="rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-30">Previous</button>
      <span className="text-zinc-400">Page {data.page} of {data.pages}</span>
      <button disabled={loading || data.page >= data.pages} onClick={() => void select(data.selectedChart, data.days, data.page + 1)} className="rounded-lg border border-zinc-700 px-4 py-2 disabled:opacity-30">Next page</button>
    </nav>}
    <details className="text-xs text-zinc-500"><summary className="cursor-pointer">Sources & coverage</summary><div className="mt-3 space-y-2"><p>Apple’s public legacy Top Grossing RSS feeds, observed once daily for the US iOS storefront. This is not a worldwide market ranking. Feed coverage and availability can change.</p><p>Ratings and original release dates come from Apple’s lookup API and refresh at least weekly on successful collection. Ads are manual research links; no ad performance is claimed. Missing collection dates remain gaps.</p><div className="flex flex-wrap gap-3">{data.charts.map(chart => <a key={chart.id} className="underline" href={chart.url} target="_blank" rel="noopener noreferrer">{chart.name} source ↗</a>)}</div></div></details>
  </div>;
}
