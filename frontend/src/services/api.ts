import { config } from '../config';
import type { StateCount, ClusterFeature, StoreRecord, ViewportBounds, Filters } from '../types/index';

const BASE = config.apiBaseUrl;

function boundsToParams(bounds: ViewportBounds): URLSearchParams {
  return new URLSearchParams({
    swLat: String(bounds.swLat),
    swLng: String(bounds.swLng),
    neLat: String(bounds.neLat),
    neLng: String(bounds.neLng),
  });
}

function filterParams(filters: Filters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.state) p.state = filters.state;
  if (filters.brand) p.brand = filters.brand;
  if (filters.status) p.status = filters.status;
  return p;
}

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
