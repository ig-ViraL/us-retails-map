import { useState } from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { StoreInfoWindow } from './StoreInfoWindow';
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
          <div className="bg-white border-2 border-blue-600 rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-600 shadow cursor-pointer select-none hover:bg-blue-50 transition-colors">
            {store.brand_name}
          </div>
        </AdvancedMarker>
      ))}

      {selected && (
        <StoreInfoWindow store={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
