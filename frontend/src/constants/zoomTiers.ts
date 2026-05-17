export const TIER1_MAX_ZOOM = 7;   // zoom <= 7: show state counts
export const TIER2_MAX_ZOOM = 11;  // zoom 8-11: show clusters
export const TIER3_MIN_ZOOM = 12;  // zoom >= 12: show individual stores

export function getZoomTier(zoom: number): 1 | 2 | 3 {
  if (zoom <= TIER1_MAX_ZOOM) return 1;
  if (zoom <= TIER2_MAX_ZOOM) return 2;
  return 3;
}
