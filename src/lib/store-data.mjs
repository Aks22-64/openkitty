// Only fields returned by Apple's public software API enter the catalog.
// Unknown metrics are null, never zero or a value inferred from search position.
export const unavailableMetrics = Object.freeze({
  currentRank: null, rankYesterday: null, rankVelocity: null, momentumScore: null,
  estMonthlyDownloads: null, estDailyDownloads: null, estLifetimeDownloads: null,
  estMonthlyRevenue: null, estDailyRevenue: null, estLifetimeRevenue: null,
  activeAdsCount: null, adPlatforms: null, iapTiers: null,
});

const text = value => typeof value === "string" && value.trim() ? value.trim() : null;
const number = value => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const date = value => text(value) && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const strings = value => Array.isArray(value) ? value.filter(v => typeof v === "string") : [];

export function appleImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.endsWith(".mzstatic.com") ? url.href : "";
  } catch { return ""; }
}

/**
 * @param {any} item
 * @param {{ retrievedAt?: string, mode?: 'snapshot' | 'live' }} options
 * @returns {import('./types').AppItem}
 */
export function normalizeStoreApp(item, { retrievedAt, mode = "live" } = {}) {
  const id = String(item.trackId ?? "");
  if (!/^\d{6,20}$/.test(id) || !text(item.trackName)) throw new Error("Invalid Apple software record");
  const timestamp = date(retrievedAt);
  if (!timestamp) throw new Error("A source retrieval timestamp is required");
  if (mode !== "live" && mode !== "snapshot") throw new Error("Invalid source mode");
  const name = text(item.trackName);
  const price = number(item.price);
  const currency = typeof item.currency === "string" && /^[A-Z]{3}$/.test(item.currency) ? item.currency : null;
  const priceFormatted = price === null ? "Unavailable" : price === 0 ? "Free" :
    currency ? `${currency} ${price.toFixed(2)}` : "Unavailable";
  const rating = number(item.averageUserRating);
  const ratingCount = number(item.userRatingCount);
  return {
    id, name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "app"}-${id}`,
    developer: text(item.sellerName) || text(item.artistName) || "Unavailable",
    category: text(item.primaryGenreName) || "Unavailable",
    genres: strings(item.genres), platform: "ios", country: "US",
    iconUrl: appleImageUrl(item.artworkUrl512) || appleImageUrl(item.artworkUrl100),
    price, currency, priceFormatted,
    rating: rating !== null && rating <= 5 ? rating : null,
    ratingCount: ratingCount !== null && Number.isInteger(ratingCount) ? ratingCount : null,
    releaseDate: date(item.releaseDate), version: text(item.version),
    versionReleaseDate: date(item.currentVersionReleaseDate),
    contentRating: text(item.contentAdvisoryRating),
    screenshots: strings(item.screenshotUrls).map(appleImageUrl).filter(Boolean).slice(0, 8),
    description: text(item.description)?.slice(0, 2500) || null,
    storeUrl: `https://apps.apple.com/us/app/id${id}`,
    sourceName: "Apple iTunes Search API",
    sourceUrl: `https://itunes.apple.com/lookup?id=${id}&country=us`,
    sourceRetrievedAt: timestamp, sourceMode: mode,
    ...unavailableMetrics,
  };
}

export function adLibraryLinks(name = "") {
  return [
    { name: "Meta Ad Library", url: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(name)}`, description: "Search Facebook and Instagram ads by app name. Confirm the advertiser matches the developer." },
    { name: "Google Ads Transparency Center", url: "https://adstransparency.google.com/", description: "Search by advertiser name or website in Google's library." },
    { name: "TikTok Creative Center", url: "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en", description: "Search selected top ads by brand or product. This is not a complete ad archive." },
  ];
}
