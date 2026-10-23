import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getAccessDenial } from "@/lib/access.mjs";
import { MAX_QUERY_LENGTH } from "@/lib/request-limits.mjs";
import { getAppBySlug, allApps } from "@/lib/data";
import { fetchLiveAppFromStore } from "@/lib/store-live";
import { formatNumber } from "@/lib/utils";
import DataSource from "@/components/DataSource";
import AdLibraryLinks from "@/components/AdLibraryLinks";
import UnavailableMetrics from "@/components/UnavailableMetrics";

export default async function AppDetailPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ refresh?: string }>;
}) {
  if (await getAccessDenial(await headers())) notFound();
  const { slug } = await params;
  if (slug.length > MAX_QUERY_LENGTH) notFound();
  const saved = getAppBySlug(slug);
  let app = saved;
  let storeError = "";
  const refresh = (await searchParams).refresh === "1";
  if (!saved || refresh) {
    try {
      const live = await fetchLiveAppFromStore(saved?.id ?? slug);
      if (live) app = live;
      else if (saved) storeError = "This listing was not returned by Apple. Showing the saved snapshot below; availability may have changed.";
    } catch {
      storeError = "Apple lookup is temporarily unavailable. Try again shortly.";
    }
  }
  if (!app) {
    if (storeError) return <div className="space-y-4"><p role="status">{storeError}</p><Link href="/" className="underline">Back to store explorer</Link></div>;
    notFound();
  }
  const related = allApps.filter(item => item.category === app.category && item.id !== app.id).slice(0, 3);
  const facts = [
    ["Developer", app.developer], ["Category", app.category], ["Store price", app.priceFormatted],
    ["Store rating", app.rating === null ? "Unavailable" : `${app.rating.toFixed(2)} / 5`],
    ["Rating count", formatNumber(app.ratingCount)], ["Original release date", app.releaseDate?.slice(0, 10) ?? "Unavailable"],
    ["Version", app.version ?? "Unavailable"], ["Version release date", app.versionReleaseDate?.slice(0, 10) ?? "Unavailable"],
    ["Age rating", app.contentRating ?? "Unavailable"],
  ];
  return <div className="space-y-7">
    <Link href="/" className="text-sm text-zinc-400 hover:text-white">← Back to store explorer</Link>
    <header className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex items-start gap-4">{app.iconUrl && /* eslint-disable-next-line @next/next/no-img-element */
        <img src={app.iconUrl} alt="" width={80} height={80} className="h-20 w-20 rounded-2xl" />}
        <div><h1 className="text-2xl font-bold sm:text-3xl">{app.name}</h1><p className="mt-2 text-sm text-zinc-400">{app.developer} · US · iOS</p></div></div>
      <div className="my-4 flex flex-wrap gap-3"><a href={app.storeUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black">View on App Store ↗</a>
        <Link href={`/app/${app.id}?refresh=1`} prefetch={false} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">Refresh from Apple</Link></div>
      <DataSource app={app} />
    </header>
    {storeError && <p role="status" className="text-sm text-amber-300">{storeError} {saved && "The data below is a saved snapshot."}</p>}
    <section className="space-y-3"><h2 className="text-lg font-bold">Store information</h2>
      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-800 p-5 sm:grid-cols-3">{facts.map(([label, value]) => <div key={label}><dt className="text-xs text-zinc-400">{label}</dt><dd className="mt-1 text-sm">{value}</dd></div>)}</dl>
      <p className="text-xs text-zinc-400">Store price is the upfront download price. Subscription and in-app purchase pricing: Unavailable.</p>
    </section>
    <section className="space-y-3"><h2 className="text-lg font-bold">Market metrics</h2><p className="text-sm text-zinc-400">Apple&apos;s public listing API does not supply these metrics. No values are estimated or generated.</p>
      <UnavailableMetrics labels={["Monthly revenue", "Monthly downloads", "Active ads", "Ad spend", "Chart rank", "Rank movement"]} />
      <p className="text-xs text-zinc-400">Daily and lifetime revenue/downloads, momentum and advertising performance are also unavailable.</p>
    </section>
    <section className="space-y-3"><h2 className="text-lg font-bold">Free ad library links</h2><AdLibraryLinks name={app.name} developer={app.developer} detailed /></section>
    <section className="space-y-3"><h2 className="text-lg font-bold">Store description</h2><p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{app.description ?? "Unavailable"}</p></section>
    <section className="space-y-3"><h2 className="text-lg font-bold">App Store screenshots</h2><p className="text-sm text-zinc-400">Developer-supplied store images. These are not verified ads or paywall captures.</p>
      {app.screenshots.length ? <div className="flex gap-4 overflow-x-auto pb-3">{app.screenshots.map((url, index) => /* eslint-disable-next-line @next/next/no-img-element */
        <img key={url} src={url} alt={`${app.name} store screenshot ${index + 1}`} loading="lazy" className="h-80 w-auto rounded-xl border border-zinc-800 object-contain" />)}</div> : <p className="text-zinc-400">Screenshots: Unavailable</p>}
    </section>
    {related.length > 0 && <section><h2 className="mb-3 text-lg font-bold">Other catalog apps in this category</h2><div className="flex flex-wrap gap-3">{related.map(item => <Link key={item.id} href={`/app/${item.id}`} className="rounded-lg border border-zinc-800 px-4 py-2 text-sm hover:border-zinc-500">{item.name}</Link>)}</div></section>}
  </div>;
}
