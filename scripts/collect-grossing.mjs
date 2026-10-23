import { readFile, writeFile, rename } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { CHARTS, DAY, parseGrossingFeed, compactStoreApp, appendGrossingSnapshot, validateGrossingHistory } from '../src/lib/grossing.mjs';
import { normalizeStoreApp } from '../src/lib/store-data.mjs';

const file = new URL('../src/data/grossing-history.json', import.meta.url);
let previous = null;
try { previous = validateGrossingHistory(JSON.parse(await readFile(file, 'utf8'))); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
let lastRequest = 0;
async function appleJson(url) {
  const parsed = new URL(url);
  if (parsed.origin !== 'https://itunes.apple.com' || !(CHARTS.some(c => c.url === url) ||
      (parsed.pathname === '/lookup' && /^\d+(,\d+)*$/.test(parsed.searchParams.get('id') ?? '') && parsed.searchParams.get('country') === 'us'))) throw new Error('Invalid source');
  for (let attempt = 0; attempt < 2; attempt++) {
    await sleep(Math.max(0, 3200 - (Date.now() - lastRequest)));
    lastRequest = Date.now();
    try {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20_000), headers: { Accept: 'application/json' } });
      if (!response.ok || !response.body) throw new Error(`Apple HTTP ${response.status}`);
      const chunks = []; let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 3_000_000) throw new Error('Source response too large');
        chunks.push(chunk);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) { if (attempt === 1) throw error; await sleep(4000); }
  }
}
const charts = {}; const identities = {};
for (const chart of CHARTS) {
  const response = await appleJson(chart.url);
  const parsed = parseGrossingFeed(response, chart, new Date().toISOString());
  charts[chart.id] = parsed.observation;
  Object.assign(identities, parsed.identities);
  console.log(`${chart.name}: ${parsed.observation.ids.length} sourced ranks`);
}
const collectedAt = new Date().toISOString();
const date = collectedAt.slice(0, 10);
if (Object.values(charts).some(c => c.retrievedAt.slice(0, 10) !== date)) throw new Error('Collection crossed UTC midnight; retry to keep a single observation date');
const ids = [...new Set([...Object.keys(identities), ...(previous?.snapshots.at(-1)?.date === date ? Object.keys(previous.apps) : [])])];
const apps = Object.fromEntries(ids.map(id => [id, previous?.apps[id] ?? identities[id]]));
const needsLookup = ids.filter(id => !apps[id]?.metadataRetrievedAt || Date.now() - Date.parse(apps[id].metadataRetrievedAt) >= 7 * DAY);
let failures = 0;
for (let index = 0; index < needsLookup.length; index += 10) {
  const batch = needsLookup.slice(index, index + 10);
  try {
    const response = await appleJson(`https://itunes.apple.com/lookup?id=${batch.join(',')}&country=us`);
    if (!Array.isArray(response.results)) throw new Error('Invalid lookup response');
    const retrievedAt = new Date().toISOString();
    for (const raw of response.results) {
      if (!batch.includes(String(raw.trackId))) continue;
      try { const app = compactStoreApp(normalizeStoreApp(raw, { retrievedAt, mode: 'snapshot' })); apps[app.id] = app; }
      catch { failures++; }
    }
  } catch { failures += batch.length; }
  if (index % 100 === 0) console.log(`Store metadata: ${Math.min(index + 10, needsLookup.length)}/${needsLookup.length}`);
}
const result = appendGrossingSnapshot(previous, { date, collectedAt, charts }, apps, new Date().toISOString());
const temp = new URL('../src/data/grossing-history.json.tmp', import.meta.url);
await writeFile(temp, JSON.stringify(result) + '\n');
await rename(temp, file);
console.log(JSON.stringify({ date, snapshots: result.snapshots.length, apps: Object.keys(result.apps).length, metadataMissing: result.metadataMissing, lookupFailures: failures }));
