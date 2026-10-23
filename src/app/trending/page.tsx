import Link from "next/link";
import UnavailableMetrics from "@/components/UnavailableMetrics";
export default function TrendingPage() {
  return <div className="space-y-6"><h1 className="text-3xl font-bold">App trends</h1>
    <p className="text-zinc-400">Unavailable. This free version does not collect comparable historical chart snapshots, so it cannot measure rank changes or identify breakout apps.</p>
    <UnavailableMetrics labels={["Rank movement", "Momentum", "Breakout apps"]} />
    <Link href="/" className="inline-block rounded-xl bg-white px-4 py-3 text-sm font-bold text-black">Explore store listings</Link>
  </div>;
}
