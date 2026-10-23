export interface GrossingApp {
  id: string; name: string; developer: string; category: string; iconUrl: string;
  storeUrl: string; releaseDate: string | null; ratingCount: number | null;
  rating: number | null; priceFormatted: string; metadataRetrievedAt: string | null;
  metadataSourceUrl: string | null;
}
export interface ChartObservation {
  sourceUrl: string; sourceUpdatedAt: string; retrievedAt: string; ids: string[];
}
export interface GrossingSnapshot {
  date: string; collectedAt: string; charts: Record<string, ChartObservation>;
}
export interface GrossingHistory {
  schemaVersion: 1; country: 'US'; platform: 'ios'; updatedAt: string;
  snapshots: GrossingSnapshot[]; apps: Record<string, GrossingApp>; metadataMissing: number;
}
export interface RankChange {
  status: 'compared' | 'entered' | 'baseline' | 'missing' | 'source-unchanged';
  delta: number | null; previousRank: number | null; comparedDate: string;
}
export interface GrossingRow {
  app: GrossingApp; chartId: string; chartName: string; rank: number;
  change: RankChange; change7: RankChange; change30: RankChange;
  reasons: string[]; majorPublisher: boolean;
  history: { date: string; rank: number | null; sourceUpdatedAt: string }[];
  appearances: { chartId: string; chartName: string; rank: number }[];
}
export interface GrossingPayload {
  mode: 'charts' | 'movers' | 'shortlist'; selectedChart: string; days: number;
  charts: { id: string; name: string; url: string }[];
  snapshotDate: string; collectedAt: string; dataUpdatedAt: string; firstDate: string; snapshotCount: number;
  stale: boolean; sourceFallback: boolean; chartSourceUpdatedAt: string | null;
  rows: GrossingRow[]; total: number; page: number; pages: number; majorPublishersHidden: number;
  metadataMissing: number; comparisonAvailable: boolean; schedule: string;
}
