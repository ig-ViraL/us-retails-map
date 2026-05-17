export interface ViewportBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface Filters {
  state: string;
  brand: string;
  status: string;
}

export interface StoreRecord {
  id: string;
  brand_name: string;
  latitude: number;
  longitude: number;
  status: string;
  state: string;
  city: string;
}

export interface StateCount {
  state: string;
  lat: number;
  lng: number;
  count: number;
}

export interface ClusterFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    cluster: boolean;
    cluster_id?: number;
    point_count?: number;
    id?: string;
    brand_name?: string;
    status?: string;
    state?: string;
    city?: string;
  };
}

export type ZoomTier = 1 | 2 | 3;
