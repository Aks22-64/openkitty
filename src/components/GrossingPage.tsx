import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getAccessDenial } from "@/lib/access.mjs";
import { buildGrossingPayload } from "@/lib/grossing.mjs";
import { loadGrossingHistory } from "@/lib/grossing-server";
import GrossingExplorer from "./GrossingExplorer";

export default async function GrossingPage({ mode = "charts", chart }: { mode?: "charts" | "movers" | "shortlist"; chart?: string }) {
  if (await getAccessDenial(await headers())) notFound();
  const { history, sourceFallback } = await loadGrossingHistory();
  return <GrossingExplorer key={mode} initial={buildGrossingPayload(history, { mode, chart: chart ?? (mode === "shortlist" ? "all" : "overall"), sourceFallback })} />;
}
