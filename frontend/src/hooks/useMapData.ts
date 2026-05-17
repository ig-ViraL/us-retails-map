import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';
import { fetchStateCounts, fetchClusters, fetchPoints } from '../services/api';
import { getZoomTier } from '../constants/zoomTiers';
import type { ViewportBounds, Filters } from '../types/index';

function roundBounds(bounds: ViewportBounds, precision = 2): string {
  const r = (n: number) => Math.round(n * 10 ** precision) / 10 ** precision;
  return `${r(bounds.swLat)},${r(bounds.swLng)},${r(bounds.neLat)},${r(bounds.neLng)}`;
}

interface Viewport {
  bounds: ViewportBounds;
  zoom: number;
}

export function useMapData(filters: Filters) {
  const [viewport, setViewport] = useState<Viewport | null>(null);

  const tier = viewport ? getZoomTier(viewport.zoom) : 1;

  const { data: stateCounts = [], isLoading: loadingTier1, isError: errorTier1 } = useQuery({
    queryKey: ['states'],
    queryFn: fetchStateCounts,
    staleTime: Infinity, // pre-aggregated — never changes
    enabled: tier === 1,
  });

  const { data: clusters = [], isFetching: fetchingTier2, isError: errorTier2 } = useQuery({
    queryKey: ['clusters', viewport ? roundBounds(viewport.bounds) : '', viewport?.zoom, filters],
    queryFn: () => fetchClusters(viewport!.bounds, viewport!.zoom, filters),
    staleTime: 30_000,
    enabled: tier === 2 && viewport !== null,
    placeholderData: keepPreviousData,
  });

  const { data: points = [], isFetching: fetchingTier3, isError: errorTier3 } = useQuery({
    queryKey: ['points', viewport ? roundBounds(viewport.bounds) : '', filters],
    queryFn: () => fetchPoints(viewport!.bounds, filters),
    staleTime: 30_000,
    enabled: tier === 3 && viewport !== null,
    placeholderData: keepPreviousData,
  });

  const updateViewport = useCallback((bounds: ViewportBounds, zoom: number) => {
    setViewport({ bounds, zoom });
  }, []);

  const debouncedUpdate = useDebounce(updateViewport, 250);

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
