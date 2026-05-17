import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import type { ClusterFeature } from '../types/index';
import { TIER2_MAX_ZOOM } from '../config';
import { clusterSize } from '../utils';

interface Props {
  clusters: ClusterFeature[];
}

export function ClusterMarker({ clusters }: Props) {
  const map = useMap();

  return (
    <>
      {clusters.map((feature, i) => {
        const [lng, lat] = feature.geometry.coordinates;
        const isCluster = feature.properties.cluster;
        const count = feature.properties.point_count ?? 1;
        const size = isCluster ? clusterSize(count) : 28;

        const handleClick = () => {
          if (isCluster && map) {
            map.setZoom(TIER2_MAX_ZOOM + 1);
            map.panTo({ lat, lng });
          }
        };

        return (
          <AdvancedMarker
            key={isCluster ? feature.properties.cluster_id : feature.properties.id ?? i}
            position={{ lat, lng }}
            onClick={handleClick}
          >
            <div
              className={[
                'rounded-full flex items-center justify-center font-bold shadow-md select-none text-white',
                isCluster ? 'bg-red-600 cursor-pointer text-sm' : 'bg-green-600 cursor-default text-[10px]',
              ].join(' ')}
              style={{ width: size, height: size }}
            >
              {isCluster ? count : feature.properties.brand_name}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}
