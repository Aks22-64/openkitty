import { writeFile, rename } from "node:fs/promises";
import { normalizeStoreApp } from "../src/lib/store-data.mjs";
import { fetchBoundedStoreJson } from "../src/lib/request-limits.mjs";

// Manual refresh only. Public Apple endpoints; no credentials or paid services.
// Save only after all requests succeed, so an outage cannot erase the catalog.
const ids = new Set();
for (const chart of ["top-free", "top-paid"]) {
  const response = await fetch(`https://rss.marketingtools.apple.com/api/v2/us/apps/${chart}/100/apps.json`, {
    signal: AbortSignal.timeout(15_000), redirect: "error",
  });
  if (!response.ok) throw new Error(`Apple discovery feed failed (${response.status})`);
  const body = await response.text();
  if (Buffer.byteLength(body) > 1_000_000) throw new Error("Apple discovery feed too large");
  const results = JSON.parse(body)?.feed?.results;
  if (!Array.isArray(results) || !results.length) throw new Error("Apple discovery feed is empty");
  for (const result of results) if (/^\d{6,20}$/.test(result.id)) ids.add(result.id);
}
const apps = [];
const list = [...ids];
for (let start = 0; start < list.length; start += 10) {
  if (start) await new Promise(resolve => setTimeout(resolve, 3200));
  const batch = list.slice(start, start + 10);
  const data = await fetchBoundedStoreJson(`https://itunes.apple.com/lookup?id=${batch.join(",")}&country=us`);
  if (!Array.isArray(data?.results) || !data.results.length) throw new Error("Apple lookup returned no records");
  const retrievedAt = new Date().toISOString();
  for (const item of data.results) {
    if (batch.includes(String(item.trackId))) apps.push(normalizeStoreApp(item, { retrievedAt, mode: "snapshot" }));
  }
  console.log(`Retrieved ${apps.length} store listings`);
}
if (apps.length < list.length * 0.8) throw new Error("Too many listings missing; existing catalog preserved");
apps.sort((a, b) => a.name.localeCompare(b.name));
const destination = new URL("../src/data/apps.json", import.meta.url);
const temporary = new URL("../src/data/apps.json.tmp", import.meta.url);
await writeFile(temporary, JSON.stringify(apps, null, 2) + "\n");
await rename(temporary, destination);
console.log(`Saved ${apps.length} genuine US iOS listings. Unsupported metrics are null.`);
