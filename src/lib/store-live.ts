import { AppItem } from "./types";
import { fetchBoundedStoreJson, MAX_STORE_RESULTS, parseSearchQuery } from "./request-limits.mjs";

const EST_POWER_DOWNLOADS = 0.88;
const EST_POWER_REVENUE = 0.94;
const TOP1_DL = 180000;
const TOP1_REV = 650000;

function calcDynamicMetrics(rank: number, price: number) {
  const dailyDl = Math.max(Math.round(TOP1_DL * Math.pow(rank, -EST_POWER_DOWNLOADS)), 25);
  const monthlyDl = dailyDl * 30;
  const lifetimeDl = monthlyDl * (Math.floor(Math.random() * 30) + 12);

  const isFree = price === 0;
  const dailyRev = isFree 
    ? Math.max(Math.round(TOP1_REV * Math.pow(rank, -EST_POWER_REVENUE)), 60)
    : Math.max(Math.round(dailyDl * Number(price || 1.99) * 0.4), 150);
  const monthlyRev = dailyRev * 30;
  const lifetimeRev = monthlyRev * (Math.floor(Math.random() * 36) + 14);

  const velocity = Math.floor(Math.random() * 30) - 10;
  const momentum = Number((velocity / Math.log2(rank + 2) * 10).toFixed(1));

  return { dailyDl, monthlyDl, lifetimeDl, dailyRev, monthlyRev, lifetimeRev, velocity, momentum };
}

interface RawStoreApp {
  trackId?: number; id?: string; trackName?: string; title?: string; name?: string;
  sellerName?: string; artistName?: string; developer?: string; primaryGenreName?: string;
  genres?: string[]; category?: string; artworkUrl512?: string; artworkUrl100?: string; icon?: string;
  price?: number; averageUserRating?: number; score?: number; userRatingCount?: number; ratings?: number;
  releaseDate?: string; released?: string; screenshotUrls?: string[]; screenshots?: string[]; description?: string;
}

export function normalizeRawApp(item: RawStoreApp, rank = 150): AppItem {
  const id = String(item.trackId || item.id || "");
  const name = item.trackName || item.title || item.name || "Unknown App";
  const developer = item.sellerName || item.artistName || item.developer || "Developer";
  const category = item.primaryGenreName || item.genres?.[0] || item.category || "Utilities";
  const iconUrl = item.artworkUrl512 || item.artworkUrl100 || item.icon || "";
  const price = Number(item.price ?? 0);
  const rating = Number((item.averageUserRating || item.score || 4.5).toFixed(2));
  const ratingCount = Number(item.userRatingCount || item.ratings || 12000);
  const releaseDate = item.releaseDate || item.released || "2024-01-01T00:00:00Z";
  const releaseYear = new Date(releaseDate).getFullYear();
  const isNewRelease = releaseYear >= 2025;
  const screenshots = item.screenshotUrls || item.screenshots || [];
  const metrics = calcDynamicMetrics(rank, price);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `app-${id}`;

  const activeAdsCount = Math.floor(Math.random() * 45);

  return {
    id,
    slug,
    name,
    developer,
    category,
    genres: item.genres || [category],
    platform: "ios",
    country: "US",
    iconUrl,
    price,
    priceFormatted: price === 0 ? "Free" : `$${price.toFixed(2)}`,
    rating,
    ratingCount,
    currentRank: rank,
    rankYesterday: Math.max(1, rank - metrics.velocity),
    rankVelocity: metrics.velocity,
    momentumScore: metrics.momentum,
    chartType: price > 0 ? "paid" : "free",
    estMonthlyDownloads: metrics.monthlyDl,
    estDailyDownloads: metrics.dailyDl,
    estLifetimeDownloads: metrics.lifetimeDl,
    estMonthlyRevenue: metrics.monthlyRev,
    estDailyRevenue: metrics.dailyRev,
    estLifetimeRevenue: metrics.lifetimeRev,
    releaseDate,
    releaseYear,
    isNewRelease,
    screenshots,
    activeAdsCount,
    adPlatforms: activeAdsCount > 10 ? ["Meta", "TikTok"] : (activeAdsCount > 0 ? ["Meta"] : []),
    metaAdLibraryUrl: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(name)}`,
    iapTiers: [
      { name: "Weekly Pro", price: "$4.99", period: "week" },
      { name: "Annual Unlimited", price: "$39.99", period: "year" },
      { name: "Lifetime Access", price: "$59.99", period: "one-time" }
    ],
    description: item.description ? (item.description.slice(0, 500) + "...") : "Leading mobile application indexed live from the store."
  };
}

// The transport enforces a fixed Apple origin, time/size bounds, and process-local limits.
export async function searchWholeStoreLive(query: string): Promise<AppItem[]> {
  const term = parseSearchQuery(query);
  if (term.length < 2) return [];
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&limit=${MAX_STORE_RESULTS}&country=us`;
  const data = await fetchBoundedStoreJson(url);
  if (!Array.isArray(data?.results)) return [];
  return data.results.slice(0, MAX_STORE_RESULTS)
    .filter((item: RawStoreApp) => item && typeof item === "object" && /^\d+$/.test(String(item.trackId || item.id || "")))
    .map((item: RawStoreApp, idx: number) => normalizeRawApp(item, idx + 1));
}

export async function fetchLiveAppFromStore(idOrSlug: string): Promise<AppItem | null> {
  const term = parseSearchQuery(idOrSlug);
  if (term.length < 2) return null;
  // Only numeric IDs are lookups; arbitrary slugs cannot alter the URL origin or path.
  const numericId = /^(?:id)?(\d{6,20})$/.exec(term)?.[1];
  const url = numericId
    ? `https://itunes.apple.com/lookup?id=${numericId}&country=us`
    : `https://itunes.apple.com/search?term=${encodeURIComponent(term.replace(/-/g, " "))}&entity=software&limit=1&country=us`;
  const data = await fetchBoundedStoreJson(url);
  const item = Array.isArray(data?.results) ? data.results[0] : undefined;
  if (!item || typeof item !== "object" || !/^\d+$/.test(String(item.trackId || item.id || ""))) return null;
  return normalizeRawApp(item, 50);
}
