import { db } from './db';
import { STATE_CENTROIDS } from '../constants/stateCentroids';
import type { StateCount } from '../types/index';

let stateCountsCache: StateCount[] | null = null;

export function buildStateCountsCache(): void {
  const rows = db
    .prepare('SELECT state, COUNT(*) as count FROM stores GROUP BY state')
    .all() as { state: string; count: number }[];

  stateCountsCache = rows
    .map((row) => {
      const centroid = STATE_CENTROIDS[row.state.toLowerCase()];
      if (!centroid) return null;
      return {
        state: row.state,
        lat: centroid.lat,
        lng: centroid.lng,
        count: row.count,
      };
    })
    .filter((s): s is StateCount => s !== null);

  console.log(`State counts cached: ${stateCountsCache.length} states`);
}

export function getStateCounts(): StateCount[] {
  if (!stateCountsCache) throw new Error('State counts cache not built');
  return stateCountsCache;
}
