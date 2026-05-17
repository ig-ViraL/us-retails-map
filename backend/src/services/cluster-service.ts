import Supercluster from 'supercluster';
import type { StoreRecord, ViewportBounds, Filters, ClusterFeature } from '../types/index';

let index: Supercluster | null = null;

/**
 * Builds the Supercluster index using provided store records.
 * Transforms store records into GeoJSON features and loads them into the index
 * for fast clustering and map rendering.
 * To be called at startup or when the underlying store data changes.
 * @param stores Array of StoreRecord objects to index in Supercluster
 */
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

/**
 * Retrieves clustered store data or individual points for rendering on the map,
 * using the prebuilt Supercluster index.
 * 
 * - Clusters points within the provided viewport bounds at the given zoom level.
 * - Applies additional post-filtering to individual (non-cluster) points based on the given filters.
 * - Returns GeoJSON features that include either cluster properties or single store properties.
 *
 * @param bounds  Viewport bounding box (southwest and northeast corners as lat/lng) to cluster within.
 * @param zoom    Map zoom level to use when generating clusters (integer).
 * @param filters Optional filters (state, brand, status) to restrict points (affect only non-clusters).
 * @returns       Array of ClusterFeature objects representing clusters or individual stores for the current view.
 */
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

/**
 * Clusters a set of store records within the provided viewport bounds at a specific zoom level.
 *
 * - Creates a new in-memory Supercluster index from the supplied `stores`.
 * - Converts each store into a GeoJSON point feature with relevant store properties.
 * - Loads features into Supercluster and performs the clustering based on the current map viewport
 *   and zoom.
 *
 * @param stores Array of StoreRecord objects to cluster.
 * @param bounds ViewportBounds specifying the southwest and northeast corners of the bounding box.
 * @param zoom   Map zoom level (number, integer, as used by Supercluster).
 * @returns      Array of ClusterFeature GeoJSON features representing clusters and individual stores within the bounds.
 */
export function clusterStores(
  stores: StoreRecord[],
  bounds: ViewportBounds,
  zoom: number
): ClusterFeature[] {
  const tempIndex = new Supercluster({ radius: 60, maxZoom: 16, minPoints: 2 });

  const features = stores.map((s) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [s.longitude, s.latitude] as [number, number] },
    properties: {
      id: s.id,
      brand_name: s.brand_name,
      status: s.status,
      state: s.state,
      city: s.city,
    },
  }));

  tempIndex.load(features as any);

  const bbox: [number, number, number, number] = [
    bounds.swLng,
    bounds.swLat,
    bounds.neLng,
    bounds.neLat,
  ];

  return tempIndex.getClusters(bbox, Math.floor(zoom)) as ClusterFeature[];
}
