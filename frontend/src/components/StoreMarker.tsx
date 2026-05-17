import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { StoreInfoWindow } from './StoreInfoWindow';
import { getBrandColor } from '../utils';
import type { StoreRecord } from '../types/index';

interface Props {
  points: StoreRecord[];
  selectedStore: StoreRecord | null;
  onSelect: (store: StoreRecord | null) => void;
}

export function StoreMarker({ points, selectedStore, onSelect }: Props) {
  return (
    <>
      {points.map((store) => (
        <AdvancedMarker
          key={store.id}
          position={{ lat: store.latitude, lng: store.longitude }}
          onClick={() => onSelect(store)}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg cursor-pointer select-none hover:scale-110 transition-transform"
            style={{ backgroundColor: getBrandColor(store.brand_name) }}
          >
            {store.brand_name.slice(0, 2).toUpperCase()}
          </div>
        </AdvancedMarker>
      ))}

      {selectedStore && (
        <StoreInfoWindow store={selectedStore} onClose={() => onSelect(null)} />
      )}
    </>
  );
}
