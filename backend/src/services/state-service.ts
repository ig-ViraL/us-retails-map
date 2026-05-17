import { db } from './db';
import { STATE_CENTROIDS } from '../constants/state-centroids';
import type { StateCount, Filters } from '../types/index';

let stateCountsCache: StateCount[] | null = null;

/**
 * Provides caching and computation of state-level store counts with centroid lookup.
 * Builds and refreshes stateCountsCache for quick API responses.
 * Exports functions to access either cached or freshly computed (with filters) state aggregations.
 */
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

/**
 * Returns the cached array of state-level store counts with centroid coordinates.
 * Throws an error if the state counts cache has not yet been populated.
 * Use buildStateCountsCache() to initialize or refresh the cache before calling this function.
 * @returns {StateCount[]} Array of state counts, each containing state, lat, lng, and count.
 * @throws Error if state counts cache has not been built.
 */
export function getStateCounts(): StateCount[] {
  if (!stateCountsCache) throw new Error('State counts cache not built');
  return stateCountsCache;
}

/**
 * Computes state-level store counts with optional filters.
 * For each state, counts the number of stores matching any provided filters (state, brand, status).
 * Looks up and attaches centroid coordinates for each state from STATE_CENTROIDS.
 * Used to return filtered state aggregations for map heatmap/choropleth.
 * @param filters - Optional filters for state, brand, and/or status.
 * @returns Array of StateCount objects: { state, lat, lng, count }
 */
export function getFilteredStateCounts(filters: Filters): StateCount[] {
  const conditions: string[] = [];
  if (filters.state) conditions.push('state = @state');
  if (filters.brand) conditions.push('brand_name = @brand');
  if (filters.status) conditions.push('status = @status');

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db
    .prepare(`SELECT state, COUNT(*) as count FROM stores ${where} GROUP BY state`)
    .all({
      state: filters.state ?? null,
      brand: filters.brand ?? null,
      status: filters.status ?? null,
    }) as { state: string; count: number }[];

  return rows
    .map((row) => {
      const centroid = STATE_CENTROIDS[row.state.toLowerCase()];
      if (!centroid) return null;
      return { state: row.state, lat: centroid.lat, lng: centroid.lng, count: row.count };
    })
    .filter((s): s is StateCount => s !== null);
}
