export const MAX_QUERY_LENGTH = 120;
export const MAX_SEARCH_RESULTS = 48;
export const MAX_STORE_RESULTS = 30;
export const STORE_TIMEOUT_MS = 5000;
export const MAX_STORE_RESPONSE_BYTES = 1_000_000;

export function parseSearchQuery(raw) {
  if (raw.length > MAX_QUERY_LENGTH || /[\u0000-\u001f\u007f]/u.test(raw)) {
    throw new RangeError(`Use at most ${MAX_QUERY_LENGTH} characters without control characters.`);
  }
  return raw.trim().toLowerCase();
}

// List views need only one image and no long description. Keep API payloads small;
// the authenticated detail route retains the full store record.
export function toSearchResult(app) {
  return { ...app, description: null, screenshots: (app.screenshots ?? []).slice(0, 1) };
}

export function findLocalMatches(apps, query) {
  const matches = [];
  for (const app of apps) {
    if (!query || [app.name, app.developer, app.category].some((value) => value.toLowerCase().includes(query))) {
      matches.push(toSearchResult(app));
      if (matches.length === MAX_SEARCH_RESULTS) break;
    }
  }
  return matches;
}

export function mergeSearchResults(local, live) {
  const results = [];
  const seen = new Set();
  for (const app of [...live, ...local]) {
    if (seen.has(app.id)) continue;
    seen.add(app.id);
    results.push(app);
    if (results.length === MAX_SEARCH_RESULTS) break;
  }
  return results;
}

// Bounded per-process throttles; password protection is the primary access boundary.
export function createRequestBudget(limit, windowMs = 60_000) {
  let resetAt = 0;
  let count = 0;
  return (now = Date.now()) => {
    if (now >= resetAt) { resetAt = now + windowMs; count = 0; }
    if (count >= limit) return false;
    count++;
    return true;
  };
}

export const consumeSearchBudget = createRequestBudget(60);
const consumeStoreBudget = createRequestBudget(20);
let activeStoreRequests = 0;
export class StoreUnavailableError extends Error {}

export async function fetchBoundedStoreJson(url, fetcher = fetch, timeoutMs = STORE_TIMEOUT_MS) {
  const target = new URL(url);
  if (target.origin !== "https://itunes.apple.com" || target.username || target.password ||
      !["/search", "/lookup"].includes(target.pathname)) throw new Error("Unsupported store URL");
  if (activeStoreRequests >= 2 || !consumeStoreBudget()) {
    throw new StoreUnavailableError("Store lookup limit reached. Please try again shortly.");
  }
  activeStoreRequests++;
  try {
    const response = await fetcher(target.href, {
      signal: AbortSignal.timeout(timeoutMs), redirect: "error", cache: "no-store",
      headers: { "User-Agent": "OpenKitty/0.1" },
    });
    if (!response.ok || !response.body) throw new StoreUnavailableError("Store lookup is temporarily unavailable.");
    if (Number(response.headers.get("content-length")) > MAX_STORE_RESPONSE_BYTES) {
      await response.body.cancel();
      throw new StoreUnavailableError("Store response is too large.");
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_STORE_RESPONSE_BYTES) throw new StoreUnavailableError("Store response is too large.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } finally { activeStoreRequests--; }
}
