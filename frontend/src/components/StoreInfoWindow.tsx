import { InfoWindow } from '@vis.gl/react-google-maps';
import { getBrandColor } from '../constants/brandColors';
import type { StoreRecord } from '../types/index';

interface Props {
  store: StoreRecord;
  onClose: () => void;
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

const STATUS_STYLES: Record<string, string> = {
  active:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  closed:  'bg-red-100 text-red-700 border border-red-200',
  planned: 'bg-amber-100 text-amber-700 border border-amber-200',
};

function getStatusStyle(status: string): string {
  return STATUS_STYLES[status.toLowerCase()] ?? 'bg-gray-100 text-gray-500 border border-gray-200';
}

export function StoreInfoWindow({ store, onClose }: Props) {
  const color = getBrandColor(store.brand_name);
  const city = toTitleCase(store.city);
  const state = toTitleCase(store.state);
  const status = normalizeStatus(store.status);

  return (
    <InfoWindow
      position={{ lat: store.latitude, lng: store.longitude }}
      pixelOffset={[0, -20]}
      onCloseClick={onClose}
      headerDisabled
    >
      <div className="w-52 rounded-xl overflow-hidden shadow-lg font-sans">
        {/* Coloured header band */}
        <div
          className="px-3 py-3 flex items-center gap-3"
          style={{ backgroundColor: color }}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-white/40">
            {store.brand_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm leading-tight">
              {store.brand_name}
            </div>
            <div className="text-white/75 text-xs mt-0.5 truncate">
              {city}, {state}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-lg leading-none ml-1 flex-shrink-0 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="bg-white px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Status</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusStyle(store.status)}`}>
              {status}
            </span>
          </div>
          <div className="border-t border-gray-100 pt-2 text-[11px] text-gray-400 font-mono truncate">
            {store.id}
          </div>
        </div>
      </div>
    </InfoWindow>
  );
}
