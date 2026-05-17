import type { ViewportBounds, Filters } from '../types/index';
import { TIER1_MAX_ZOOM, TIER2_MAX_ZOOM } from '../config';
import { PALETTE, STATUS_STYLES } from '../constants';

export function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function clusterSize(count: number): number {
  if (count < 10) return 36;
  if (count < 100) return 46;
  if (count < 1000) return 56;
  return 66;
}

export function hasActiveFilters(filters: Filters): boolean {
  return !!(filters.state || filters.brand || filters.status);
}

export function roundBounds(bounds: ViewportBounds, step: number): string {
  const r = (n: number) => Math.round(n / step) * step;
  return `${r(bounds.swLat)},${r(bounds.swLng)},${r(bounds.neLat)},${r(bounds.neLng)}`;
}

export function boundsToParams(bounds: ViewportBounds): URLSearchParams {
  return new URLSearchParams({
    swLat: String(bounds.swLat),
    swLng: String(bounds.swLng),
    neLat: String(bounds.neLat),
    neLng: String(bounds.neLng),
  });
}

export function filterParams(filters: Filters): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.state) p.state = filters.state;
  if (filters.brand) p.brand = filters.brand;
  if (filters.status) p.status = filters.status;
  return p;
}

export function getZoomTier(zoom: number): 1 | 2 | 3 {
  if (zoom <= TIER1_MAX_ZOOM) return 1;
  if (zoom <= TIER2_MAX_ZOOM) return 2;
  return 3;
}

export function getBrandColor(initial: string): string {
  let hash = 0;
  for (let i = 0; i < initial.length; i++) {
    hash = (hash * 31 + initial.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function normalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function getStatusStyle(status: string): string {
  return STATUS_STYLES[status.toLowerCase()] ?? 'bg-gray-100 text-gray-500 border border-gray-200';
}

export function readFiltersFromURL(): Filters {
  const p = new URLSearchParams(window.location.search);
  return {
    state: p.get('state') ?? '',
    brand: p.get('brand') ?? '',
    status: p.get('status') ?? '',
  };
}

export function writeFiltersToURL(filters: Filters): void {
  const p = new URLSearchParams();
  if (filters.state) p.set('state', filters.state);
  if (filters.brand) p.set('brand', filters.brand);
  if (filters.status) p.set('status', filters.status);
  const search = p.toString();
  history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
}
