import { useCallback } from 'react';
import { Map } from '@vis.gl/react-google-maps';
import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { StateMarkers } from './StateMarkers';
import { ClusterMarkers } from './ClusterMarkers';
import { StoreMarkers } from './StoreMarkers';
import { useMapData } from '../hooks/useMapData';
import type { Filters } from '../types/index';

interface Props {
  filters: Filters;
}

export function MapContainer({ filters }: Props) {
  const { tier, stateCounts, clusters, points, loading, error, onViewportChange } = useMapData(filters);

  const handleCameraChange = useCallback((e: MapCameraChangedEvent) => {
    const { bounds, zoom } = e.detail;
    if (!bounds || zoom === undefined) return;
    onViewportChange(
      { swLat: bounds.south, swLng: bounds.west, neLat: bounds.north, neLng: bounds.east },
      zoom
    );
  }, [onViewportChange]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs z-20">
          Loading...
        </div>
      )}

      {error && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-800 text-white px-3 py-1 rounded-full text-xs z-20">
          {error}
        </div>
      )}

      <Map
        defaultCenter={{ lat: 39.5, lng: -98.35 }}
        defaultZoom={4}
        mapId="retail-map"
        onCameraChanged={handleCameraChange}
        style={{ width: '100%', height: '100%' }}
      >
        {tier === 1 && <StateMarkers stateCounts={stateCounts} />}
        {tier === 2 && <ClusterMarkers clusters={clusters} />}
        {tier === 3 && <StoreMarkers points={points} />}
      </Map>
    </div>
  );
}
