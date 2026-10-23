export default function UnavailableMetrics({ labels = ["Monthly revenue", "Monthly downloads", "Active ads"] }: { labels?: string[] }) {
  return <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    {labels.map(label => <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-zinc-300">Unavailable</dd>
    </div>)}
  </dl>;
}
