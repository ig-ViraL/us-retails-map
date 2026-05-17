import { useState } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { StoreInfoWindow } from './StoreInfoWindow';
import { getBrandColor } from '../constants/brandColors';
import type { StoreRecord } from '../types/index';

interface Props {
  points: StoreRecord[];
}

export function StoreMarkers({ points }: Props) {
  const [selected, setSelected] = useState<StoreRecord | null>(null);

  return (
    <>
      {points.map((store) => (
        <AdvancedMarker
          key={store.id}
          position={{ lat: store.latitude, lng: store.longitude }}
          onClick={() => setSelected(store)}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg cursor-pointer select-none hover:scale-110 transition-transform"
            style={{ backgroundColor: getBrandColor(store.brand_name) }}
          >
            {store.brand_name.slice(0, 2).toUpperCase()}
          </div>
        </AdvancedMarker>
      ))}

      {selected && (
        <StoreInfoWindow store={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
