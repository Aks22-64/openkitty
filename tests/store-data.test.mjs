import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeStoreApp, unavailableMetrics, adLibraryLinks } from "../src/lib/store-data.mjs";
import { mergeSearchResults } from "../src/lib/request-limits.mjs";

const options = { retrievedAt: "2026-10-23T20:00:00Z" };
const fixture = { trackId: 123456789, trackName: "Example & Co", sellerName: "Example Ltd", price: 0,
  currency: "USD", averageUserRating: 0, userRatingCount: 0, releaseDate: "2025-01-02T00:00:00Z" };

test("real zero store values survive while absent measurements remain unavailable", () => {
  const app = normalizeStoreApp(fixture, options);
  assert.equal(app.price, 0); assert.equal(app.priceFormatted, "Free");
  assert.equal(app.rating, 0); assert.equal(app.ratingCount, 0);
  for (const key of Object.keys(unavailableMetrics)) assert.equal(app[key], null, key);
  const missing = normalizeStoreApp({ trackId: fixture.trackId, trackName: fixture.trackName }, options);
  for (const key of ["price", "rating", "ratingCount", "releaseDate", "version", "description"]) assert.equal(missing[key], null, key);
  assert.equal(missing.priceFormatted, "Unavailable");
  assert.equal(missing.developer, "Unavailable");
  assert.equal(missing.category, "Unavailable");
  assert.deepEqual(missing.screenshots, []);
});

test("normalization cannot propagate legacy fabricated metrics or unsafe image/store URLs", () => {
  const raw = { ...fixture, ...Object.fromEntries(Object.keys(unavailableMetrics).map(key => [key, 12345])),
    artworkUrl512: "https://evil.example/icon.png", trackViewUrl: "javascript:alert(1)",
    screenshotUrls: ["https://evil.example/screen.jpg", "https://is1-ssl.mzstatic.com/image/screen.jpg"] };
  const app = normalizeStoreApp(raw, options);
  for (const key of Object.keys(unavailableMetrics)) assert.equal(app[key], null, key);
  assert.equal(app.iconUrl, "");
  assert.equal(app.storeUrl, "https://apps.apple.com/us/app/id123456789");
  assert.deepEqual(app.screenshots, ["https://is1-ssl.mzstatic.com/image/screen.jpg"]);
  assert.deepEqual(normalizeStoreApp(raw, options), app, "Identical source records must give identical values");
});

test("prices require currency, invalid store values and provenance never become invented defaults", () => {
  const bad = normalizeStoreApp({ ...fixture, price: 4.99, currency: undefined, averageUserRating: 8,
    userRatingCount: -1, releaseDate: "invalid" }, options);
  assert.equal(bad.priceFormatted, "Unavailable");
  for (const key of ["currency", "rating", "ratingCount", "releaseDate"]) assert.equal(bad[key], null);
  assert.equal(normalizeStoreApp({ ...fixture, price: 4.99, currency: "GBP" }, options).priceFormatted, "GBP 4.99");
  assert.throws(() => normalizeStoreApp(fixture), /timestamp/);
  assert.throws(() => normalizeStoreApp({ ...fixture, trackId: "bad/id" }, options), /Invalid/);
  assert.throws(() => normalizeStoreApp(fixture, { ...options, mode: "estimated" }), /mode/);
});

test("catalog contains only traceable snapshots with no generated market metrics", async () => {
  const apps = JSON.parse(await readFile(new URL("../src/data/apps.json", import.meta.url)));
  assert.ok(apps.length >= 48);
  assert.equal(new Set(apps.map(a => a.id)).size, apps.length);
  assert.equal(new Set(apps.map(a => a.slug)).size, apps.length);
  for (const app of apps) {
    assert.equal(app.sourceMode, "snapshot");
    assert.equal(app.sourceName, "Apple iTunes Search API");
    assert.equal(app.sourceUrl, `https://itunes.apple.com/lookup?id=${app.id}&country=us`);
    assert.ok(Number.isFinite(Date.parse(app.sourceRetrievedAt)));
    assert.equal(app.country, "US"); assert.equal(app.platform, "ios");
    for (const key of Object.keys(unavailableMetrics)) assert.equal(app[key], null, `${app.id}:${key}`);
  }
});

test("fresh lookup values replace older snapshots when merging results", () => {
  const old = { id: "123456", rating: 1, sourceMode: "snapshot" };
  const fresh = { id: "123456", rating: 4.7, sourceMode: "live" };
  assert.deepEqual(mergeSearchResults([old], [fresh]), [fresh]);
});

test("ad research URLs use fixed official hosts and safely encode search text", () => {
  const name = "App & name?country=IN#\"";
  const links = adLibraryLinks(name);
  assert.equal(new URL(links[0].url).searchParams.get("q"), name);
  assert.deepEqual(links.map(link => new URL(link.url).hostname), ["www.facebook.com", "adstransparency.google.com", "ads.tiktok.com"]);
  assert.ok(links.every(link => new URL(link.url).protocol === "https:"));
});
