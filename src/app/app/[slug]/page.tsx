import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAccessDenial } from "@/lib/access.mjs";
import { MAX_QUERY_LENGTH } from "@/lib/request-limits.mjs";
import Link from "next/link";
import { getAppBySlug, allApps } from "@/lib/data";
import { fetchLiveAppFromStore } from "@/lib/store-live";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { 
  DollarSign, 
  Download, 
  Star, 
  ArrowUpRight, 
  ArrowDownRight, 
  ExternalLink, 
  CreditCard, 
  Eye, 
  Layers, 
  ArrowLeft,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AppDetailPage({ params }: PageProps) {
  if (await getAccessDenial(await headers())) notFound();
  const { slug } = await params;
  if (slug.length > MAX_QUERY_LENGTH) notFound();
  let app = getAppBySlug(slug);

  if (!app) {
    try { app = (await fetchLiveAppFromStore(slug)) || undefined; }
    catch { return <p role="status">Live store lookups are temporarily unavailable. Please try again shortly.</p>; }
  }

  if (!app) {
    notFound();
  }

  // Find competitors in same category
  const competitors = allApps
    .filter((a) => a.category === app.category && a.id !== app.id)
    .slice(0, 3);

  const isClimbing = app.rankVelocity > 0;
  const isFalling = app.rankVelocity < 0;

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to App Explorer</span>
        </Link>
      </div>

      {/* App Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-3xl border border-zinc-800 bg-[#09090b] p-6 lg:p-8">
        <div className="flex items-start sm:items-center gap-5">
          {/* App Icon */}
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-700 bg-zinc-900 shadow-xl">
            {app.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.iconUrl}
                alt={app.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-zinc-800" />
            )}
          </div>

          <div className="flex flex-col min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {app.name}
              </h1>
              <span className="rounded-full bg-zinc-900 border border-zinc-700/80 px-2.5 py-0.5 text-xs font-bold text-zinc-300">
                Rank #{app.currentRank}
              </span>
            </div>

            <p className="text-sm font-medium text-zinc-400">{app.developer}</p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="rounded-md bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {app.category}
              </span>
              <span className="text-zinc-700">•</span>
              <div className="flex items-center gap-1 text-zinc-300">
                <Star className="h-3.5 w-3.5 fill-white text-white" />
                <span className="font-semibold text-white">{app.rating.toFixed(1)}</span>
                <span className="text-zinc-400">({formatNumber(app.ratingCount)} ratings)</span>
              </div>
              <span className="text-zinc-700">•</span>
              <span className="font-mono text-white font-semibold">
                {app.priceFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Store CTA Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {app.metaAdLibraryUrl && (
            <a
              href={app.metaAdLibraryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-4 py-2.5 text-xs font-bold text-white transition duration-200"
            >
              <Eye className="h-4 w-4 text-zinc-300" />
              <span>Inspect {app.activeAdsCount} Active Ads</span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </a>
          )}
          <a
            href={`https://apps.apple.com/us/app/id${app.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-zinc-200 px-5 py-2.5 text-xs font-bold text-black transition duration-200"
          >
            <span>View on App Store</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Revenue */}
        <div className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-white" />
              <span>Est. Monthly Revenue</span>
            </span>
            <span className="text-[10px] bg-zinc-900 border border-zinc-700/80 px-1.5 py-0.5 rounded text-zinc-300">
              30 Days
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-white">
            {formatCurrency(app.estMonthlyRevenue)}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            ~{formatCurrency(app.estDailyRevenue)}/day across in-app purchases
          </p>
        </div>

        {/* Monthly Downloads */}
        <div className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Download className="h-4 w-4 text-zinc-300" />
              <span>Est. Monthly Downloads</span>
            </span>
            <span className="text-[10px] bg-zinc-900 border border-zinc-700/80 px-1.5 py-0.5 rounded text-zinc-300">
              30 Days
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-white">
            {formatNumber(app.estMonthlyDownloads)}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            ~{formatNumber(app.estDailyDownloads)} new installs/day
          </p>
        </div>

        {/* Lifetime Revenue */}
        <div className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-zinc-300" />
              <span>Est. Lifetime Revenue</span>
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-white/90">
            {formatCurrency(app.estLifetimeRevenue)}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Estimated cumulative store revenue
          </p>
        </div>

        {/* Rank Momentum */}
        <div className="rounded-2xl border border-zinc-800 bg-[#09090b] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="h-4 w-4 text-white" />
              <span>Rank Velocity & Momentum</span>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-2xl font-black text-white">
              {app.momentumScore}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-xs font-semibold ${
                isClimbing
                  ? "bg-zinc-800 text-white border border-zinc-600"
                  : isFalling
                  ? "bg-zinc-900 text-zinc-400 border border-zinc-800"
                  : "bg-zinc-900 text-zinc-500"
              }`}
            >
              {isClimbing && <ArrowUpRight className="h-3 w-3" />}
              {isFalling && <ArrowDownRight className="h-3 w-3" />}
              {isClimbing ? `+${app.rankVelocity}` : app.rankVelocity} spots
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Rank #{app.rankYesterday} → #{app.currentRank} today
          </p>
        </div>
      </div>

      {/* Main Grid: Screenshots & Monetization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Screenshots Carousel & Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Screenshots Gallery */}
          <div className="rounded-3xl border border-zinc-800 bg-[#09090b] p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-zinc-300" />
              <span>Store Screenshots & Visual Teardown</span>
            </h2>

            {app.screenshots && app.screenshots.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                {app.screenshots.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative shrink-0 w-44 sm:w-56 aspect-[9/19] rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-md group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${app.name} screen ${idx + 1}`}
                      className="h-full w-full object-cover transition group-hover:scale-105 duration-200"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-400">
                No screenshots indexed yet.
              </div>
            )}
          </div>

          {/* About / Description */}
          <div className="rounded-3xl border border-zinc-800 bg-[#09090b] p-6 space-y-3">
            <h2 className="text-lg font-bold text-white">About {app.name}</h2>
            <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-line">
              {app.description}
            </p>
          </div>
        </div>

        {/* Right Col: Monetization (IAP) & Competitors */}
        <div className="space-y-6">
          {/* In-App Purchases Architecture */}
          <div className="rounded-3xl border border-zinc-800 bg-[#09090b] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-white" />
                <span>Monetization & IAPs</span>
              </h2>
              <span className="text-xs text-zinc-300 font-semibold">
                Subscription
              </span>
            </div>

            <div className="space-y-2.5">
              {app.iapTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black p-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                    <span className="font-semibold text-white">{tier.name}</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {tier.price}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-400">
              <span className="font-semibold text-white block mb-0.5">Paywall Pattern</span>
              Uses a high-converting annual default with a 3-day free trial toggle to maximize subscription retention.
            </div>
          </div>

          {/* Competitor Benchmarks */}
          <div className="rounded-3xl border border-zinc-800 bg-[#09090b] p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Category Competitors ({app.category})
            </h2>

            <div className="space-y-3">
              {competitors.map((comp) => (
                <Link
                  key={comp.id}
                  href={`/app/${comp.slug}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black p-3 hover:border-zinc-500 transition group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={comp.iconUrl}
                      alt={comp.name}
                      className="h-10 w-10 rounded-xl border border-zinc-700 object-cover"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-xs text-white group-hover:text-zinc-200 transition truncate max-w-[130px]">
                        {comp.name}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        #{comp.currentRank} in {comp.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-white block">
                      {formatCurrency(comp.estMonthlyRevenue)}
                    </span>
                    <span className="text-[10px] text-zinc-400">/mo</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
