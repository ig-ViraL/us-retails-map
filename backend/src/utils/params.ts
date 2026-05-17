import type { ViewportBounds, Filters } from '../types/index';

export function parseBounds(q: Record<string, string>): ViewportBounds | null {
  const { swLat, swLng, neLat, neLng } = q;
  if (!swLat || !swLng || !neLat || !neLng) return null;
  const parsed = {
    swLat: parseFloat(swLat),
    swLng: parseFloat(swLng),
    neLat: parseFloat(neLat),
    neLng: parseFloat(neLng),
  };
  if (Object.values(parsed).some(isNaN)) return null;
  return parsed;
}

export function parseFilters(q: Record<string, string>): Filters {
  return {
    state: q.state || undefined,
    brand: q.brand || undefined,
    status: q.status || undefined,
  };
}
