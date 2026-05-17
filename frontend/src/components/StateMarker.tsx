import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { StateCount } from '../types/index';
import { TIER1_MAX_ZOOM } from '../config';
import { formatCount } from '../utils';

interface Props {
  stateCounts: StateCount[];
}

export function StateMarker({ stateCounts }: Props) {
  const map = useMap();
  return (
    <>
      {stateCounts.map((s) => (
        <AdvancedMarker
          key={s.state}
          position={{ lat: s.lat, lng: s.lng }}
          onClick={() => {
            if (map) {
              map.panTo({ lat: s.lat, lng: s.lng });
              map.setZoom(TIER1_MAX_ZOOM + 1);
            }
          }}
        >
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex flex-col items-center justify-center text-[11px] font-bold shadow-md cursor-pointer select-none">
            <span>{s.state.slice(0, 2).toUpperCase()}</span>
            <span>{formatCount(s.count)}</span>
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}
