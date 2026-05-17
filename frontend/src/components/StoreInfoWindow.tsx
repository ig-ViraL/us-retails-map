import { InfoWindow } from '@vis.gl/react-google-maps';
import { getBrandColor } from '../constants/brandColors';
import type { StoreRecord } from '../types/index';

interface Props {
  store: StoreRecord;
  onClose: () => void;
}

export function StoreInfoWindow({ store, onClose }: Props) {
  return (
    <InfoWindow
      position={{ lat: store.latitude, lng: store.longitude }}
      onCloseClick={onClose}
    >
      <div className="text-sm leading-relaxed min-w-40">
        <div className="font-bold mb-1 flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: getBrandColor(store.brand_name) }}
          >
            {store.brand_name.slice(0, 2).toUpperCase()}
          </span>
          {store.brand_name}
        </div>
        <div>{store.city}, {store.state}</div>
        <div>Status: <strong>{store.status}</strong></div>
        <div className="text-xs text-gray-400 mt-1">{store.id}</div>
      </div>
    </InfoWindow>
  );
}
