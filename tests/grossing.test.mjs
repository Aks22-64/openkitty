import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARTS, DAY, parseGrossingFeed, validateGrossingHistory, appendGrossingSnapshot, rankChange, shortlistSignals, buildGrossingPayload } from '../src/lib/grossing.mjs';
import { publishSnapshot, DATA_PATH, REPOSITORY } from '../scripts/publish-grossing.mjs';

const ids = Array.from({ length: 100 }, (_, i) => String(100000 + i));
const app = id => ({ id, name: `App ${id}`, developer: 'Independent Example LLC', category: 'Productivity', iconUrl: '', storeUrl: `https://apps.apple.com/us/app/id${id}`, releaseDate: '2025-01-01T00:00:00Z', ratingCount: 500, rating: 4.4, priceFormatted: 'Free', metadataRetrievedAt: '2026-10-20T12:00:00Z', metadataSourceUrl: `https://itunes.apple.com/lookup?id=${id}&country=us` });
const snapshot = date => ({ date, collectedAt: `${date}T12:00:00Z`, charts: Object.fromEntries(CHARTS.map(c => [c.id, { sourceUrl: c.url, sourceUpdatedAt: `${date}T11:00:00Z`, retrievedAt: `${date}T12:00:00Z`, ids: [...ids] }])) });
const history = (dates = ['2026-10-23']) => validateGrossingHistory({ schemaVersion: 1, country: 'US', platform: 'ios', updatedAt: `${dates.at(-1)}T13:00:00Z`, snapshots: dates.map(snapshot), apps: Object.fromEntries(ids.map(id => [id, app(id)])), metadataMissing: 0 });
const feed = () => ({ feed: { title: { label: 'iTunes Store: Top Grossing Apps' }, updated: { label: '2026-10-23T11:00:00Z' }, entry: ids.map(id => ({ id: { attributes: { 'im:id': id } }, 'im:name': { label: `App ${id}` }, 'im:artist': { label: 'Publisher' } })) } });

test('feed rank order is preserved and identity-only fallback does not invent store metadata', () => {
  const result = parseGrossingFeed(feed(), CHARTS[0], '2026-10-23T12:00:00Z');
  assert.deepEqual(result.observation.ids, ids);
  assert.equal(result.identities[ids[0]].ratingCount, null);
  assert.equal(result.identities[ids[0]].releaseDate, null);
});
test('invalid, partial, duplicate, stale and future feeds fail closed', () => {
  const mutations = [
    f => { f.feed.title.label = 'Top Free Apps'; },
    f => { f.feed.entry.pop(); },
    f => { f.feed.entry[99] = f.feed.entry[0]; },
    f => { f.feed.updated.label = '2026-10-20T12:00:00Z'; },
    f => { f.feed.updated.label = '2026-10-24T12:00:00Z'; },
  ];
  for (const mutate of mutations) { const value = feed(); mutate(value); assert.throws(() => parseGrossingFeed(value, CHARTS[0], '2026-10-23T12:00:00Z')); }
  assert.throws(() => parseGrossingFeed(feed(), { id: 'overall', url: 'https://evil.example' }, '2026-10-23T12:00:00Z'));
});
test('baseline and missing dates are unknown, never zero or fake entrants', () => {
  assert.equal(rankChange(history(), 'overall', ids[0]).status, 'baseline');
  const gap = history(['2026-10-20', '2026-10-23']);
  assert.equal(rankChange(gap, 'overall', ids[0]).status, 'missing');
  assert.equal(rankChange(gap, 'overall', ids[0]).delta, null);
  const payload = buildGrossingPayload(gap, { mode: 'movers' });
  assert.equal(payload.total, 0); assert.equal(payload.comparisonAvailable, false);
});
test('movement compares exact storefront/category/dates and preserves direction', () => {
  const value = history(['2026-10-22', '2026-10-23']);
  const list = value.snapshots[1].charts.overall.ids;
  [list[0], list[9]] = [list[9], list[0]];
  assert.equal(rankChange(value, 'overall', ids[9]).delta, 9);
  assert.equal(rankChange(value, 'overall', ids[0]).delta, -9);
  assert.equal(rankChange(value, 'productivity', ids[9]).delta, 0);
  assert.equal(buildGrossingPayload(value, { mode: 'movers' }).rows[0].app.id, ids[9]);
});
test('an entrant is absent from the observed top 100, never assigned rank 101', () => {
  const value = history(['2026-10-22', '2026-10-23']);
  value.snapshots[1].charts.overall.ids[0] = '999999'; value.apps['999999'] = app('999999');
  const change = rankChange(value, 'overall', '999999');
  assert.equal(change.status, 'entered'); assert.equal(change.delta, null); assert.equal(change.previousRank, null);
  const row = buildGrossingPayload(value).rows[0]; assert.equal(row.history[0].rank, null);
});
test('identical or regressing provider publication times cannot imply a measured movement', () => {
  const value = history(['2026-10-22', '2026-10-23']);
  value.snapshots[1].charts.overall.sourceUpdatedAt = value.snapshots[0].charts.overall.sourceUpdatedAt;
  assert.equal(rankChange(value, 'overall', ids[0]).status, 'source-unchanged');
  assert.equal(buildGrossingPayload(value, { mode: 'movers' }).comparisonAvailable, false);
});
test('same-day reruns preserve the original rank snapshot but can refresh metadata', () => {
  const value = history(); const rerun = snapshot('2026-10-23'); rerun.charts.overall.ids.reverse();
  const apps = structuredClone(value.apps); apps[ids[0]].ratingCount = 600;
  const result = appendGrossingSnapshot(value, rerun, apps, '2026-10-23T14:00:00Z');
  assert.equal(result.snapshots.length, 1); assert.equal(result.snapshots[0].charts.overall.ids[0], ids[0]);
  assert.equal(result.apps[ids[0]].ratingCount, 600);
  assert.throws(() => appendGrossingSnapshot(value, snapshot('2026-10-22'), apps, value.updatedAt));
});
test('retention keeps 90 calendar days without filling missing dates', () => {
  let value = history(['2026-07-01']);
  for (let day = 1; day <= 100; day++) {
    if (day === 60) continue;
    const date = new Date(Date.parse('2026-07-01T00:00:00Z') + day * DAY).toISOString().slice(0, 10);
    value = appendGrossingSnapshot(value, snapshot(date), value.apps, `${date}T13:00:00Z`);
  }
  assert.equal(value.snapshots.length, 89);
  assert.equal(value.snapshots[0].date, '2026-07-12');
});
test('shortlist uses sourced age or rating count, preserves zero, excludes known majors and unknowns', () => {
  assert.equal(shortlistSignals({ ...app(ids[0]), ratingCount: null, releaseDate: null }, '2026-10-23').qualifies, false);
  assert.equal(shortlistSignals({ ...app(ids[0]), ratingCount: 0, releaseDate: null }, '2026-10-23').qualifies, true);
  assert.equal(shortlistSignals({ ...app(ids[0]), ratingCount: 25001, releaseDate: '2020-01-01T00:00:00Z' }, '2026-10-23').qualifies, false);
  assert.equal(shortlistSignals({ ...app(ids[0]), developer: 'Google LLC' }, '2026-10-23').qualifies, false);
  const payload = buildGrossingPayload(history(), { mode: 'shortlist', chart: 'all' });
  assert.equal(payload.total, 100, 'same app in eight niches is deduplicated');
  assert.equal(payload.rows[0].appearances.length, 8);
  assert.equal(payload.rows[0].reasons.length, 2);
});
test('bounded pagination exposes all ranks and validates selections', () => {
  const value = history(); const first = buildGrossingPayload(value); const last = buildGrossingPayload(value, { page: 4 });
  assert.equal(first.rows.length, 25); assert.equal(first.total, 100); assert.equal(last.rows.at(-1).rank, 100);
  for (const options of [{ mode: 'revenue' }, { chart: 'all' }, { days: 2 }, { page: -1 }, { page: 1.5 }]) assert.throws(() => buildGrossingPayload(value, options));
  assert.equal(buildGrossingPayload(value, { now: Date.parse('2026-10-25T12:00:00Z'), sourceFallback: true }).stale, true);
});
test('history validation rejects wrong source, missing coverage and hostile metadata URLs', () => {
  for (const mutate of [h => { h.snapshots[0].charts.overall.sourceUrl = 'https://evil.example'; }, h => { delete h.snapshots[0].charts.finance; }, h => { h.apps[ids[0]].storeUrl = 'javascript:alert(1)'; }, h => { h.apps[ids[0]].iconUrl = 'https://evil.example/icon'; }, h => { h.apps[ids[0]].ratingCount = -1; }]) {
    const value = history(); mutate(value); assert.throws(() => validateGrossingHistory(value));
  }
});
const head = 'a'.repeat(40), treeSha = 'b'.repeat(40), blobSha = 'c'.repeat(40), commitSha = 'd'.repeat(40);
function mockApi({ moved = false, privateRepo = false, refConflict = false } = {}) {
  const calls = [];
  const api = async (method, path, body) => {
    calls.push({ method, path, body });
    if (path === '') return { full_name: REPOSITORY, private: privateRepo, default_branch: 'main' };
    if (path === '/git/ref/heads/main') return { object: { sha: moved ? commitSha : head } };
    if (path.startsWith('/git/commits/') && method === 'GET') return { tree: { sha: treeSha } };
    if (path === '/git/blobs') return { sha: blobSha };
    if (path === '/git/trees') return { sha: treeSha };
    if (path === '/git/commits') return { sha: commitSha };
    if (method === 'PATCH' && refConflict) throw new Error('HTTP 422 non-fast-forward');
    return {};
  };
  return { calls, api };
}
test('publisher modifies only the fixed public history path with a non-forced update', async () => {
  const { api, calls } = mockApi();
  assert.equal(await publishSnapshot({ content: JSON.stringify(history()), expectedHead: head, api }), commitSha);
  assert.deepEqual(calls.find(c => c.path === '/git/trees').body.tree, [{ path: DATA_PATH, mode: '100644', type: 'blob', sha: blobSha }]);
  assert.deepEqual(calls.at(-1), { method: 'PATCH', path: '/git/refs/heads/main', body: { sha: commitSha, force: false } });
});
test('publisher refuses private repositories, changed main and concurrent non-fast-forward writes', async () => {
  for (const options of [{ privateRepo: true }, { moved: true }, { refConflict: true }]) {
    const { api, calls } = mockApi(options);
    await assert.rejects(publishSnapshot({ content: JSON.stringify(history()), expectedHead: head, api }));
    if (!options.refConflict) assert.equal(calls.filter(c => c.method !== 'GET').length, 0);
    assert.ok(calls.every(c => c.body?.force !== true));
  }
});
