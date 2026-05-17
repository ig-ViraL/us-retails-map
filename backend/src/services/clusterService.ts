/// <reference types="geojson" />

import Supercluster from 'supercluster';
import type { StoreRecord, ViewportBounds, Filters, ClusterFeature } from '../types/index';

let index: Supercluster | null = null;

export function buildClusterIndex(stores: StoreRecord[]): void {
  index = new Supercluster({
    radius: 60,
    maxZoom: 16,
    minPoints: 2,
  });

  const features: GeoJSON.Feature<GeoJSON.Point>[] = stores.map((s) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
    properties: {
      id: s.id,
      brand_name: s.brand_name,
      status: s.status,
      state: s.state,
      city: s.city,
    },
  }));

  index.load(features as any);
  console.log(`Supercluster index built: ${features.length} points`);
}

export function getClusters(
  bounds: ViewportBounds,
  zoom: number,
  filters: Filters
): ClusterFeature[] {
  if (!index) throw new Error('Cluster index not built');

  const bbox: [number, number, number, number] = [
    bounds.swLng,
    bounds.swLat,
    bounds.neLng,
    bounds.neLat,
  ];

  const clusters = index.getClusters(bbox, Math.floor(zoom)) as ClusterFeature[];

  // Post-filter individual points (non-clusters) by active filters
  return clusters.filter((feature) => {
    if (feature.properties.cluster) return true; // keep all clusters
    const { state, brand, status } = filters;
    if (state && feature.properties.state !== state) return false;
    if (brand && feature.properties.brand_name !== brand) return false;
    if (status && feature.properties.status !== status) return false;
    return true;
  });
}
