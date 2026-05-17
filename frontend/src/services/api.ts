import { config } from '../config';
import type { StateCount, ClusterFeature, StoreRecord, ViewportBounds, Filters } from '../types/index';
import { boundsToParams, filterParams } from '../utils';

const BASE = config.apiBaseUrl;

/**
 * Fetches the count of stores for each state, filtered by the provided criteria.
 * 
 * @param filters Optional filters to refine the results. Can include state, brand, or status.
 * @returns Promise resolving to an array of state count objects.
 */
export async function fetchStateCounts(filters?: Filters): Promise<StateCount[]> {
  const params = new URLSearchParams();
  if (filters?.state) params.set('state', filters.state);
  if (filters?.brand) params.set('brand', filters.brand);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString();
  const res = await fetch(`${BASE}/api/stores/states${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch state counts');
  return res.json();
}

/**
 * Fetches store clusters based on the current map viewport and active filters.
 *
 * @param bounds The bounding box of the current map viewport.
 * @param zoom The current map zoom level.
 * @param filters An object containing filter settings such as state, brand, or status.
 * @returns Promise resolving to an array of store cluster features matching the criteria.
 */
export async function fetchClusters(
  bounds: ViewportBounds,
  zoom: number,
  filters: Filters
): Promise<ClusterFeature[]> {
  const params = boundsToParams(bounds);
  params.set('zoom', String(zoom));
  Object.entries(filterParams(filters)).forEach(([k, v]) => params.set(k, v));
  const res = await fetch(`${BASE}/api/stores/clusters?${params}`);
  if (!res.ok) throw new Error('Failed to fetch clusters');
  return res.json();
}

/**
 * Fetches individual store records (not clustered) within the given map viewport bounds,
 * potentially filtered by state, brand, or status.
 *
 * @param bounds  The bounding box (viewport) of the map to restrict the result set.
 * @param filters An object containing filter criteria for state, brand, and/or status.
 * @returns       Promise resolving to an array of StoreRecord objects matching the filters.
 */
export async function fetchPoints(
  bounds: ViewportBounds,
  filters: Filters
): Promise<StoreRecord[]> {
  const params = boundsToParams(bounds);
  Object.entries(filterParams(filters)).forEach(([k, v]) => params.set(k, v));
  const res = await fetch(`${BASE}/api/stores/points?${params}`);
  if (!res.ok) throw new Error('Failed to fetch points');
  return res.json();
}

export async function fetchFilterOptions(): Promise<{
  states: string[];
  brands: string[];
  statuses: string[];
}> {
  const res = await fetch(`${BASE}/api/stores/filter-options`);
  if (!res.ok) throw new Error('Failed to fetch filter options');
  return res.json();
}
