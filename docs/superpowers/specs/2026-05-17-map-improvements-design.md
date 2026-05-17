# Map Improvements — Design Spec

**Date:** 2026-05-17  
**Scope:** Frontend-only changes across 3 features  
**Branch:** stage

---

## Overview

Three targeted improvements to the Interactive US Retail Locations Map:

1. **Brand letter-avatar markers** — Replace plain text pills at Tier 3 with styled, color-coded circle markers using the brand initial.
2. **Smooth viewport transitions** — Keep existing markers visible while new viewport data loads (no full repaint on pan/zoom).
3. **Tier 1 state click → auto-zoom** — Clicking a state marker zooms to zoom 6 (Tier 2) and pans to that state's centroid.

---

## Feature 1: Brand Letter-Avatar Markers

### Problem
Tier 3 (`StoreMarkers.tsx`) currently renders a plain white text pill showing `store.brand_name` (e.g. "W", "DT"). The assignment requires brand logo markers at the deepest zoom level.

### Solution
Replace the text pill with a 36×36px colored circle displaying the brand initial(s) in white. Color is assigned deterministically by hashing the brand initial string against a curated 12-color palette — same initial always gets the same color.

### Files Changed
- **New:** `frontend/src/constants/brandColors.ts` — `getBrandColor(initial: string): string` function using a hash over a fixed palette
- **Modified:** `frontend/src/components/StoreMarkers.tsx` — render circle avatar instead of text pill
- **Modified:** `frontend/src/components/StoreInfoWindow.tsx` — show brand color badge next to brand name in popup header

### Contract
- `getBrandColor(initial)` is pure and deterministic — same input always returns the same hex color
- Colors must be visually distinct enough to tell adjacent markers apart
- Palette: 12 hand-picked colors (not random) covering a perceptual spread

---

## Feature 2: Smooth Viewport Transitions

### Problem
When panning or zooming to an uncached viewport area, TanStack Query clears `data` to `[]` while fetching. This causes all markers to disappear, leaving an empty map with just a loading spinner — poor UX.

### Solution
Use TanStack Query's `placeholderData: keepPreviousData` on Tier 2 and Tier 3 queries. Old markers remain rendered while new data fetches in the background. The loading spinner is shown simultaneously via `isFetching` (not `isLoading`).

### Files Changed
- **Modified:** `frontend/src/hooks/useMapData.ts`
  - Import `keepPreviousData` from `@tanstack/react-query`
  - Add `placeholderData: keepPreviousData` to the `clusters` and `points` queries
  - Change `loadingTier2` and `loadingTier3` references in the combined `loading` boolean to use `isFetching` (`fetchingTier2`, `fetchingTier3`) so the spinner appears during background refreshes, not just initial loads

### Behavior After Fix
- Pan to new area → old markers stay visible, spinner appears
- New data arrives → markers update (swap, not full repaint)
- Tier 1 unchanged (state counts have `staleTime: Infinity`, never refetch)

---

## Feature 3: Tier 1 State Click → Auto-Zoom

### Problem
State markers at Tier 1 are `cursor-default` and non-interactive. Users have no way to zoom into a specific state from Tier 1 without manually scrolling.

### Solution
Add a click handler to each state marker that zooms the map to zoom level 6 (the Tier 1→2 boundary) and pans to the state's centroid. Zoom 6 lands in Tier 2 (cluster view), showing clusters for that state.

### Files Changed
- **Modified:** `frontend/src/components/StateMarkers.tsx`
  - Import `useMap` from `@vis.gl/react-google-maps`
  - Add `const map = useMap()` at component top
  - Add `onClick` to each `AdvancedMarker`: `map.setZoom(6); map.panTo({ lat: s.lat, lng: s.lng })`
  - Change `cursor-default` → `cursor-pointer` on the marker div

### Behavior
- Click state marker → map pans to state centroid and zooms to 6
- Tier 2 cluster data loads for the new viewport automatically (existing useMapData logic)

---

## Constraints
- All changes are frontend-only — no backend, no API, no DB changes
- No new dependencies needed (`keepPreviousData` is already exported by `@tanstack/react-query`)
- Each feature is independent — can be implemented and reviewed separately
