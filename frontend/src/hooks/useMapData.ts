import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { fetchStateCounts, fetchClusters, fetchPoints } from '../services/api';
import { getZoomTier } from '../constants/zoomTiers';
import type { ViewportBounds, Filters } from '../types/index';

// step is in degrees: 0.1° ≈ 11km, 0.02° ≈ 2.2km, 0.01° ≈ 1.1km
function roundBounds(bounds: ViewportBounds, step: number): string {
  const r = (n: number) => Math.round(n / step) * step;
  return `${r(bounds.swLat)},${r(bounds.swLng)},${r(bounds.neLat)},${r(bounds.neLng)}`;
}

interface Viewport {
  bounds: ViewportBounds;
  zoom: number;
}

export function useMapData(filters: Filters) {
  const [viewport, setViewport] = useState<Viewport | null>(null);

  const tier = viewport ? getZoomTier(viewport.zoom) : 1;

  const hasActiveFilters = !!(filters.state || filters.brand || filters.status);

  const { data: stateCounts = [], isLoading: loadingTier1, isError: errorTier1 } = useQuery({
    queryKey: ['states', filters],
    queryFn: () => fetchStateCounts(filters),
    staleTime: hasActiveFilters ? 30_000 : Infinity,
    enabled: tier === 1,
  });

  const { data: clusters = [], isFetching: fetchingTier2, isError: errorTier2 } = useQuery({
    queryKey: ['clusters', viewport ? roundBounds(viewport.bounds, 0.1) : '', viewport?.zoom, filters],
    queryFn: () => fetchClusters(viewport!.bounds, viewport!.zoom, filters),
    staleTime: 120_000,
    enabled: tier === 2 && viewport !== null,
    placeholderData: keepPreviousData,
  });

  const { data: points = [], isFetching: fetchingTier3, isError: errorTier3 } = useQuery({
    queryKey: ['points', viewport ? roundBounds(viewport.bounds, 0.005) : '', filters],
    queryFn: () => fetchPoints(viewport!.bounds, filters),
    staleTime: 120_000,
    enabled: tier === 3 && viewport !== null,
    placeholderData: keepPreviousData,
  });

  const updateViewport = useCallback((bounds: ViewportBounds, zoom: number) => {
    setViewport({ bounds, zoom });
  }, []);

  const debouncedUpdate = useDebounce(updateViewport, 700);

  const loading = loadingTier1 || fetchingTier2 || fetchingTier3;
  const error = (errorTier1 || errorTier2 || errorTier3) ? 'Failed to load map data' : null;

  return {
    tier,
    stateCounts,
    clusters,
    points,
    loading,
    error,
    onViewportChange: debouncedUpdate,
  };
}
