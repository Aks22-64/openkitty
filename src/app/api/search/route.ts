import { NextResponse } from "next/server";
import { allApps } from "@/lib/data";
import { searchWholeStoreLive } from "@/lib/store-live";
import { getAccessDenial } from "@/lib/access.mjs";
import { consumeSearchBudget, findLocalMatches, mergeSearchResults, parseSearchQuery } from "@/lib/request-limits.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: {
    "Cache-Control": "private, no-store",
    ...(status === 429 ? { "Retry-After": "60" } : {}),
  } });
}

export async function GET(request: Request) {
  // Enforce access here too, independently of middleware.
  const denied = await getAccessDenial(request.headers);
  if (denied) return denied;
  if (!consumeSearchBudget()) return json({ error: "Too many searches. Please try again shortly." }, 429);
  const { searchParams } = new URL(request.url);
  let q: string;
  try { q = parseSearchQuery(searchParams.get("q") || ""); }
  catch { return json({ error: "Use a search of up to 120 characters without control characters." }, 400); }
  const localMatches = findLocalMatches(allApps, q);
  if (q.length >= 2 && (searchParams.get("live") === "true" || localMatches.length < 4)) {
    try {
      const liveMatches = await searchWholeStoreLive(q);
      return json({ results: mergeSearchResults(localMatches, liveMatches), fromLiveStore: true });
    } catch {
      return json({ results: localMatches, error: "Live search is temporarily unavailable. Please try again shortly.", fromLiveStore: false }, 503);
    }
  }
  return json({ results: localMatches, fromLiveStore: false });
}
