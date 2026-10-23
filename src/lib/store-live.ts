import { AppItem } from "./types";
import { normalizeStoreApp } from "./store-data.mjs";
import { fetchBoundedStoreJson, MAX_STORE_RESULTS, parseSearchQuery } from "./request-limits.mjs";

export async function searchWholeStoreLive(query: string): Promise<AppItem[]> {
  const term = parseSearchQuery(query);
  if (term.length < 2) return [];
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=${MAX_STORE_RESULTS}&country=us`;
  const data = await fetchBoundedStoreJson(url);
  if (!Array.isArray(data?.results)) throw new Error("Invalid Apple search response");
  const retrievedAt = new Date().toISOString();
  return data.results.slice(0, MAX_STORE_RESULTS).flatMap((item: unknown) => {
    try { return [normalizeStoreApp(item, { retrievedAt })]; } catch { return []; }
  });
}

export async function fetchLiveAppFromStore(id: string): Promise<AppItem | null> {
  // Never substitute the first fuzzy search result for a requested app's identity.
  if (!/^\d{6,20}$/.test(id)) return null;
  const data = await fetchBoundedStoreJson(`https://itunes.apple.com/lookup?id=${id}&country=us`);
  if (!Array.isArray(data?.results)) throw new Error("Invalid Apple lookup response");
  const item = data.results.find((result: { trackId?: number }) => String(result?.trackId) === id);
  return item ? normalizeStoreApp(item, { retrievedAt: new Date().toISOString() }) : null;
}
