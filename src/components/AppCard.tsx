import Link from "next/link";
import { AppItem } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import DataSource from "./DataSource";
import AdLibraryLinks from "./AdLibraryLinks";

export default function AppCard({ app, viewMode = "grid", content = "catalog" }: {
  app: AppItem; viewMode?: "grid" | "table"; content?: "catalog" | "ads" | "screenshots";
}) {
  const detailUrl = `/app/${app.id}${app.sourceMode === "live" ? "?refresh=1" : ""}`;
  const rating = app.rating === null ? "Unavailable" : `${app.rating.toFixed(1)} / 5`;
  if (viewMode === "table") return <tr className="border-b border-zinc-800 text-sm">
    <td className="p-3"><Link href={detailUrl} prefetch={false} className="font-semibold hover:underline">{app.name}</Link><p className="text-xs text-zinc-400">{app.developer}</p></td>
    <td className="p-3">{app.category}</td><td className="p-3">{app.priceFormatted}</td>
    <td className="p-3">{rating}<p className="text-xs text-zinc-400">{formatNumber(app.ratingCount)} ratings</p></td>
    <td className="p-3 text-zinc-400">Unavailable</td><td className="p-3 text-zinc-400">Unavailable</td>
    <td className="p-3 min-w-[210px]"><DataSource app={app} /></td>
  </tr>;
  return <article className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
    <div className="flex items-start gap-3">
      {app.iconUrl && /* eslint-disable-next-line @next/next/no-img-element */
        <img src={app.iconUrl} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 shrink-0 rounded-xl" />}
      <div className="min-w-0"><Link href={detailUrl} prefetch={false} className="font-bold hover:underline break-words">{app.name}</Link>
        <p className="mt-1 text-xs text-zinc-400">{app.developer}</p><p className="mt-1 text-xs text-zinc-500">{app.category} · iOS · US</p></div>
    </div>
    {content === "screenshots" && (app.screenshots[0] ? <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={app.screenshots[0]} alt={`${app.name} App Store screenshot`} loading="lazy" className="h-72 w-full object-contain" />
      <figcaption className="mt-2 text-xs text-zinc-400">Store screenshot. Paywall type and subscription prices: Unavailable.</figcaption>
    </figure> : <p className="text-sm text-zinc-400">Screenshots: Unavailable</p>)}
    <dl className="grid grid-cols-2 gap-3 text-xs">
      <div><dt className="text-zinc-400">Store price</dt><dd className="mt-1 font-semibold">{app.priceFormatted}</dd></div>
      <div><dt className="text-zinc-400">Store rating</dt><dd className="mt-1">{rating} <span className="text-zinc-500">({formatNumber(app.ratingCount)})</span></dd></div>
      <div><dt className="text-zinc-400">Monthly revenue</dt><dd className="mt-1 text-zinc-400">Unavailable</dd></div>
      <div><dt className="text-zinc-400">Monthly downloads</dt><dd className="mt-1 text-zinc-400">Unavailable</dd></div>
    </dl>
    {content === "ads" && <p className="text-xs text-zinc-400">Active ads and ad spend: Unavailable</p>}
    <div className="mt-auto space-y-3 border-t border-zinc-800 pt-3">
      <a href={app.storeUrl} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black">View on App Store ↗</a>
      {content === "ads" && <AdLibraryLinks name={app.name} developer={app.developer} />}
      <DataSource app={app} />
    </div>
  </article>;
}
