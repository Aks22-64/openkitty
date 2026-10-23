import { CHARTS, rankChange } from "@/lib/grossing.mjs";
import { loadGrossingHistory } from "@/lib/grossing-server";

export default async function GrossingAppEvidence({ id }: { id: string }) {
  const { history, sourceFallback } = await loadGrossingHistory();
  const latest = history.snapshots.at(-1)!;
  const matches = CHARTS.flatMap(chart => {
    const index = latest.charts[chart.id].ids.indexOf(id);
    return index < 0 ? [] : [{ ...chart, rank: index + 1, change: rankChange(history, chart.id, id) }];
  });
  return <section className="space-y-3"><h2 className="text-lg font-bold">Observed grossing ranks</h2>
    <p className="text-xs text-zinc-400">US iOS · snapshot {latest.date} UTC. {sourceFallback ? "Packaged fallback snapshot." : "Collected from Apple’s Top Grossing feeds."} These ranks do not disclose dollar revenue or profit.</p>
    {matches.length ? <div className="flex flex-wrap gap-3">{matches.map(chart => <a key={chart.id} href={chart.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <span className="text-xs text-zinc-400">{chart.name} ↗</span><p className="mt-1 font-mono text-xl font-bold">#{chart.rank}</p>
      <p className="mt-1 text-xs text-zinc-400">1d: {chart.change.status === "compared" ? chart.change.delta === 0 ? "No change" : `${chart.change.delta! > 0 ? "↑" : "↓"} ${Math.abs(chart.change.delta!)}` : chart.change.status === "entered" ? "Entered top 100" : "Awaiting comparable data"}</p>
    </a>)}</div> : <p className="text-sm text-zinc-400">Not observed in the tracked top 100 charts on this date. Its rank is unavailable; this does not mean zero revenue.</p>}
  </section>;
}
