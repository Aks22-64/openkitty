import { allApps } from "@/lib/data";
import UnavailableMetrics from "@/components/UnavailableMetrics";

export default function ChartsPage() {
  const counts = new Map<string, number>();
  for (const app of allApps) counts.set(app.category, (counts.get(app.category) ?? 0) + 1);
  const categories = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const snapshotDates = [...new Set(allApps.map(app => app.sourceRetrievedAt.slice(0, 10)))].sort();
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">Catalog overview</h1>
    <p className="mt-2 text-sm text-zinc-400">Category counts within our {allApps.length}-app US iOS snapshot. This sample does not measure the whole market.</p></header>
    <UnavailableMetrics labels={["Market revenue", "Market downloads", "Revenue market share"]} />
    <p className="text-xs text-zinc-400">Source: Apple iTunes Search API · Snapshot retrieved {snapshotDates.join(" to ")} UTC. Counts below describe only the saved catalog.</p>
    <div className="overflow-x-auto rounded-xl border border-zinc-800"><table className="w-full text-left text-sm"><caption className="p-4 text-left font-bold">Listings by store category</caption>
      <thead className="bg-zinc-900 text-zinc-400"><tr><th scope="col" className="p-4">Category</th><th scope="col" className="p-4">Listings in this catalog</th></tr></thead>
      <tbody>{categories.map(([category, count]) => <tr key={category} className="border-t border-zinc-800"><th scope="row" className="p-4 font-normal">{category}</th><td className="p-4">{count}</td></tr>)}</tbody>
    </table></div>
  </div>;
}
