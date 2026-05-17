import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { StateCount } from '../types/index';

interface Props {
  stateCounts: StateCount[];
}

function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function StateMarkers({ stateCounts }: Props) {
  return (
    <>
      {stateCounts.map((s) => (
        <AdvancedMarker key={s.state} position={{ lat: s.lat, lng: s.lng }}>
          <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex flex-col items-center justify-center text-[11px] font-bold shadow-md cursor-default select-none">
            <span>{s.state.slice(0, 2).toUpperCase()}</span>
            <span>{formatCount(s.count)}</span>
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}
