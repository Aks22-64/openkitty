import { appleImageUrl } from './store-data.mjs';

export const CHART_LIMIT = 100;
export const HISTORY_DAYS = 90;
export const DAY = 86_400_000;
/** @type {{id: string, name: string, url: string}[]} */
export const CHARTS = [
  ['overall', 'All apps', null], ['productivity', 'Productivity', '6007'],
  ['health', 'Health & Fitness', '6013'], ['utilities', 'Utilities', '6002'],
  ['photo', 'Photo & Video', '6008'], ['education', 'Education', '6017'],
  ['lifestyle', 'Lifestyle', '6012'], ['business', 'Business', '6000'],
  ['finance', 'Finance', '6015'],
].map(([id, name, genre]) => ({ id, name,
  url: `https://itunes.apple.com/us/rss/topgrossingapplications/limit=${CHART_LIMIT}${genre ? `/genre=${genre}` : ''}/json` }));
export const SCHEDULE = 'Daily around 03:17 UTC / 08:47 IST (GitHub scheduling can be delayed)';
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const validId = value => typeof value === 'string' && /^\d{6,20}$/.test(value);
const boundedText = (value, max = 250) => typeof value === 'string' ? value.slice(0, max) : '';

export function parseGrossingFeed(data, chart, retrievedAt) {
  const feed = data?.feed;
  const updated = feed?.updated?.label;
  if (!CHARTS.some(c => c.id === chart.id && c.url === chart.url) || !validTime(retrievedAt) ||
      !validTime(updated) || !/Top Grossing/i.test(feed?.title?.label ?? '')) throw new Error(`Invalid grossing feed: ${chart.id}`);
  const age = Date.parse(retrievedAt) - Date.parse(updated);
  if (age > 36 * 60 * 60 * 1000 || age < -5 * 60 * 1000) throw new Error(`Stale or future-dated feed: ${chart.id}`);
  const entries = feed.entry;
  if (!Array.isArray(entries) || entries.length !== CHART_LIMIT) throw new Error(`Incomplete chart: ${chart.id}`);
  const ids = entries.map(entry => entry?.id?.attributes?.['im:id']);
  if (ids.some(id => !validId(id)) || new Set(ids).size !== ids.length) throw new Error(`Invalid chart identities: ${chart.id}`);
  const identities = Object.fromEntries(entries.map((entry, index) => {
    const id = ids[index];
    const name = boundedText(entry?.['im:name']?.label);
    if (!name) throw new Error(`Missing app identity: ${chart.id}`);
    return [id, { id, name, developer: boundedText(entry?.['im:artist']?.label) || 'Unavailable',
      category: boundedText(entry?.category?.attributes?.label) || 'Unavailable',
      iconUrl: appleImageUrl(entry?.['im:image']?.at(-1)?.label),
      storeUrl: `https://apps.apple.com/us/app/id${id}`,
      // Feed identities do not stand in for missing lookup metadata.
      releaseDate: null, ratingCount: null, rating: null, priceFormatted: 'Unavailable',
      metadataRetrievedAt: null, metadataSourceUrl: null }];
  }));
  return { observation: { sourceUrl: chart.url, sourceUpdatedAt: new Date(updated).toISOString(), retrievedAt, ids }, identities };
}

export function compactStoreApp(app) {
  return { id: app.id, name: app.name, developer: app.developer, category: app.category,
    iconUrl: app.iconUrl, storeUrl: app.storeUrl, releaseDate: app.releaseDate,
    ratingCount: app.ratingCount, rating: app.rating, priceFormatted: app.priceFormatted,
    metadataRetrievedAt: app.sourceRetrievedAt, metadataSourceUrl: app.sourceUrl };
}

/** @returns {import('./grossing-types').GrossingHistory} */
export function validateGrossingHistory(data) {
  if (data?.schemaVersion !== 1 || data.country !== 'US' || data.platform !== 'ios' || !validTime(data.updatedAt) ||
      !Array.isArray(data.snapshots) || !data.snapshots.length || data.snapshots.length > HISTORY_DAYS ||
      !data.apps || typeof data.apps !== 'object' || Object.keys(data.apps).length > CHARTS.length * CHART_LIMIT) throw new Error('Invalid grossing history');
  let priorDate = '';
  for (const snapshot of data.snapshots) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date) || snapshot.date <= priorDate || !validTime(snapshot.collectedAt) ||
        snapshot.date !== snapshot.collectedAt.slice(0, 10) || Object.keys(snapshot.charts ?? {}).length !== CHARTS.length) throw new Error('Invalid snapshot date or coverage');
    priorDate = snapshot.date;
    for (const chart of CHARTS) {
      const observation = snapshot.charts[chart.id];
      if (observation?.sourceUrl !== chart.url || !validTime(observation.sourceUpdatedAt) || !validTime(observation.retrievedAt) ||
          !Array.isArray(observation.ids) || observation.ids.length !== CHART_LIMIT || observation.ids.some(id => !validId(id)) ||
          new Set(observation.ids).size !== CHART_LIMIT) throw new Error(`Invalid saved chart: ${chart.id}`);
      const sourceAge = Date.parse(observation.retrievedAt) - Date.parse(observation.sourceUpdatedAt);
      if (sourceAge < -300_000 || sourceAge > 36 * 3_600_000 || observation.retrievedAt.slice(0, 10) !== snapshot.date) throw new Error('Invalid chart provenance');
    }
  }
  const latest = data.snapshots.at(-1);
  if (Date.parse(data.updatedAt) < Date.parse(latest.collectedAt)) throw new Error('Invalid collection timestamp');
  for (const chart of CHARTS) for (const id of latest.charts[chart.id].ids) {
    const app = data.apps[id];
    if (!app || app.id !== id || !app.name || typeof app.name !== 'string' || app.name.length > 250 ||
        typeof app.developer !== 'string' || typeof app.category !== 'string' || typeof app.priceFormatted !== 'string' ||
        app.storeUrl !== `https://apps.apple.com/us/app/id${id}` || (app.iconUrl && !appleImageUrl(app.iconUrl)) ||
        (app.releaseDate !== null && !validTime(app.releaseDate)) ||
        (app.ratingCount !== null && (!Number.isInteger(app.ratingCount) || app.ratingCount < 0)) ||
        (app.rating !== null && (!Number.isFinite(app.rating) || app.rating < 0 || app.rating > 5)) ||
        (app.metadataRetrievedAt !== null && !validTime(app.metadataRetrievedAt)) ||
        (app.metadataSourceUrl !== null && app.metadataSourceUrl !== `https://itunes.apple.com/lookup?id=${id}&country=us`)) throw new Error(`Invalid app metadata: ${id}`);
  }
  return data;
}

/** @returns {import('./grossing-types').GrossingHistory} */
export function appendGrossingSnapshot(previous, snapshot, apps, checkedAt) {
  if (previous) validateGrossingHistory(previous);
  if (previous && snapshot.date < previous.snapshots.at(-1).date) throw new Error('Cannot backdate a snapshot');
  // The first successful UTC observation for a day is immutable. Reruns refresh
  // metadata/health only; they cannot manufacture another day of rank history.
  const snapshots = previous?.snapshots.some(s => s.date === snapshot.date) ? previous.snapshots : [...(previous?.snapshots ?? []), snapshot];
  const cutoff = new Date(Date.parse(`${snapshot.date}T00:00:00Z`) - (HISTORY_DAYS - 1) * DAY).toISOString().slice(0, 10);
  const retained = snapshots.filter(s => s.date >= cutoff).slice(-HISTORY_DAYS);
  const ids = new Set(Object.values(retained.at(-1).charts).flatMap(c => c.ids));
  const currentApps = Object.fromEntries([...ids].map(id => [id, apps[id] ?? previous?.apps[id]]));
  return validateGrossingHistory({ schemaVersion: 1, country: 'US', platform: 'ios', updatedAt: checkedAt,
    snapshots: retained, apps: currentApps, metadataMissing: Object.values(currentApps).filter(app => !app?.metadataRetrievedAt).length });
}

/** @returns {import('./grossing-types').RankChange} */
export function rankChange(history, chartId, id, days = 1) {
  const latest = history.snapshots.at(-1);
  const date = new Date(Date.parse(`${latest.date}T00:00:00Z`) - days * DAY).toISOString().slice(0, 10);
  const previous = history.snapshots.find(snapshot => snapshot.date === date);
  const unknown = status => ({ status, delta: null, previousRank: null, comparedDate: date });
  if (!previous) return unknown(history.snapshots[0].date > date ? 'baseline' : 'missing');
  const currentChart = latest.charts[chartId];
  const previousChart = previous.charts[chartId];
  if (Date.parse(currentChart.sourceUpdatedAt) <= Date.parse(previousChart.sourceUpdatedAt)) return unknown('source-unchanged');
  const currentIndex = currentChart.ids.indexOf(id);
  if (currentIndex < 0) return unknown('missing');
  const previousIndex = previousChart.ids.indexOf(id);
  if (previousIndex < 0) return unknown('entered');
  return { status: 'compared', delta: previousIndex - currentIndex, previousRank: previousIndex + 1, comparedDate: date };
}

// Explicit exclusion list, not a claim that every remaining publisher is small.
export const MAJOR_PUBLISHER_PREFIXES = ['OpenAI', 'Google', 'Microsoft', 'Apple Inc', 'Meta Platforms',
  'Instagram', 'Facebook', 'TikTok', 'TIKTOK', 'Bytedance', 'ByteDance', 'Anthropic', 'X.AI', 'xAI',
  'Amazon', 'Netflix', 'Disney', 'Spotify', 'Adobe', 'Tencent', 'Supercell', 'King.com', 'Roblox', 'Electronic Arts',
  'X Corp.', 'Duolingo', 'Canva', 'Pinterest', 'Snap Inc.', 'LinkedIn', 'Intuit', 'PayPal', 'Uber', 'Bumble', 'Tinder', 'Hinge,', 'Match.com'];

export function shortlistSignals(app, asOf) {
  const cutoff = new Date(`${asOf}T00:00:00Z`); cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 3);
  const released = app.releaseDate ? Date.parse(app.releaseDate) : NaN;
  const newer = Number.isFinite(released) && released >= cutoff.getTime() && released <= Date.parse(`${asOf}T23:59:59Z`);
  const lowerFootprint = Number.isInteger(app.ratingCount) && app.ratingCount >= 0 && app.ratingCount <= 25_000;
  const majorPublisher = MAJOR_PUBLISHER_PREFIXES.some(prefix => app.developer.toLowerCase().startsWith(prefix.toLowerCase()));
  const reasons = [];
  if (newer) reasons.push(`Released ${app.releaseDate.slice(0, 10)} (within 3 years)`);
  if (lowerFootprint) reasons.push(`${app.ratingCount.toLocaleString('en-US')} US ratings (25,000 or fewer)`);
  return { newer, lowerFootprint, majorPublisher, reasons, qualifies: (newer || lowerFootprint) && !majorPublisher };
}

/** @returns {import('./grossing-types').GrossingPayload} */
export function buildGrossingPayload(history, { mode = 'charts', chart = 'overall', days = 1, page = 1, sourceFallback = false, now = Date.now() } = {}) {
  validateGrossingHistory(history);
  if (!['charts', 'movers', 'shortlist'].includes(mode) || ![1, 7, 30].includes(days) || !Number.isInteger(page) || page < 1 || page > 36 ||
      !(CHARTS.some(c => c.id === chart) || (mode === 'shortlist' && chart === 'all'))) throw new Error('Invalid chart selection');
  const latest = history.snapshots.at(-1);
  const selected = chart === 'all' ? CHARTS.filter(c => c.id !== 'overall') : CHARTS.filter(c => c.id === chart);
  const appearances = new Map();
  for (const c of selected) latest.charts[c.id].ids.forEach((id, index) => {
    const entries = appearances.get(id) ?? []; entries.push({ chartId: c.id, chartName: c.name, rank: index + 1 }); appearances.set(id, entries);
  });
  let majorPublishersHidden = 0;
  let rows = [...appearances].map(([id, matches]) => {
    const app = history.apps[id];
    const primary = matches[0];
    const signals = shortlistSignals(app, latest.date);
    const row = { app, ...primary, change: rankChange(history, primary.chartId, id, days),
      change7: rankChange(history, primary.chartId, id, 7), change30: rankChange(history, primary.chartId, id, 30),
      reasons: signals.reasons, majorPublisher: signals.majorPublisher, appearances: matches,
      history: history.snapshots.slice(-30).map(snapshot => {
        const index = snapshot.charts[primary.chartId].ids.indexOf(id);
        return { date: snapshot.date, rank: index < 0 ? null : index + 1, sourceUpdatedAt: snapshot.charts[primary.chartId].sourceUpdatedAt };
      }) };
    if (mode === 'shortlist' && signals.majorPublisher) majorPublishersHidden++;
    return { row, qualifies: signals.qualifies };
  }).filter(({ row, qualifies }) => mode === 'shortlist' ? qualifies : mode === 'movers' ?
    row.change.status === 'entered' || (row.change.delta !== null && row.change.delta > 0) : true).map(({ row }) => row);
  if (mode === 'shortlist') rows.sort((a, b) => (b.app.releaseDate ?? '').localeCompare(a.app.releaseDate ?? '') || (a.app.ratingCount ?? Infinity) - (b.app.ratingCount ?? Infinity));
  else if (mode === 'movers') rows.sort((a, b) => (b.change.delta ?? -1) - (a.change.delta ?? -1) || a.rank - b.rank);
  else rows.sort((a, b) => a.rank - b.rank);
  const comparisonDate = new Date(Date.parse(`${latest.date}T00:00:00Z`) - days * DAY).toISOString().slice(0, 10);
  const comparison = history.snapshots.find(snapshot => snapshot.date === comparisonDate);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / 25));
  page = Math.min(page, pages);
  return { mode, selectedChart: chart, days, charts: CHARTS, snapshotDate: latest.date, collectedAt: latest.collectedAt, dataUpdatedAt: history.updatedAt,
    firstDate: history.snapshots[0].date, snapshotCount: history.snapshots.length,
    stale: now - Date.parse(latest.collectedAt) > 36 * 3_600_000, sourceFallback,
    chartSourceUpdatedAt: chart === 'all' ? null : latest.charts[chart].sourceUpdatedAt,
    rows: rows.slice((page - 1) * 25, page * 25), total, page, pages, majorPublishersHidden, metadataMissing: history.metadataMissing,
    comparisonAvailable: Boolean(comparison && selected.some(c => Date.parse(latest.charts[c.id].sourceUpdatedAt) > Date.parse(comparison.charts[c.id].sourceUpdatedAt))),
    schedule: SCHEDULE };
}
