import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import MapLayerPropertiesCard from 'features/project/components/Cards/MapLayersCard/MapLayerPropertiesCard';

import { MapInstanceContext, useMapCardStore } from './mapInstance';

/**
 * Bottom card — hosts the map-layer properties form for Reports.
 *
 * Two paths into the form:
 *
 * - **Plot edit**: `PlotEditModal` sets the singleton's category +
 *   layer. `BottomCard` renders without an `activeMapCardId`, so
 *   `MapLayerPropertiesCard`'s scoped hooks fall back to the
 *   singleton — same behaviour as before per-card stores existed.
 *
 * - **Map card edit**: `FeatureCardMap` registers its per-card store
 *   in `mapInstance`'s registry; clicking Edit sets `ReportsPage`'s
 *   `activeMapCardId`. `BottomCard` looks up that card's store and
 *   wraps the form in `<MapInstanceContext.Provider>` so reads/
 *   writes route to the card's own state instead of the singleton.
 *
 * `hideLayerSelector`: skip the intra-category dropdown — Reports
 * dictates the layer via the active card.
 * `hideLegend`: Reports doesn't render the Legend column.
 * `showClose`: only shown for map-card mode; plot drawer has its
 * own close.
 */
const BottomCard = ({ activeMapCardId, showClose = false, onClose }) => {
  const mapCardStore = useMapCardStore(activeMapCardId);
  const form = <MapLayerPropertiesCard hideLegend hideLayerSelector />;
  return (
    <div style={wrapperStyle}>
      {showClose && (
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
          aria-label="Close layer parameters"
          style={closeButtonStyle}
        />
      )}
      {mapCardStore ? (
        <MapInstanceContext.Provider value={mapCardStore}>
          {form}
        </MapInstanceContext.Provider>
      ) : (
        form
      )}
    </div>
  );
};

const wrapperStyle = {
  position: 'relative',
};

const closeButtonStyle = {
  position: 'absolute',
  top: 4,
  right: 4,
  zIndex: 1,
};

export default BottomCard;
