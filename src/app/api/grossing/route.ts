import { NextResponse } from "next/server";
import { getAccessDenial } from "@/lib/access.mjs";
import { consumeSearchBudget } from "@/lib/request-limits.mjs";
import { buildGrossingPayload } from "@/lib/grossing.mjs";
import { loadGrossingHistory } from "@/lib/grossing-server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;
export async function GET(request: Request) {
  const denied = await getAccessDenial(request.headers);
  if (denied) return denied;
  const headers = { "Cache-Control": "private, no-store" };
  if (!consumeSearchBudget()) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  const params = new URL(request.url).searchParams;
  const mode = params.get("mode") ?? "charts";
  const chart = params.get("chart") ?? (mode === "shortlist" ? "all" : "overall");
  const days = Number(params.get("days") ?? "1");
  const { history, sourceFallback } = await loadGrossingHistory();
  try {
    return NextResponse.json(buildGrossingPayload(history, { mode, chart, days, page: Number(params.get("page") ?? "1"), sourceFallback }), { headers });
  } catch {
    return NextResponse.json({ error: "Choose a supported US chart and a 1, 7 or 30 day comparison." }, { status: 400, headers });
  }
}
