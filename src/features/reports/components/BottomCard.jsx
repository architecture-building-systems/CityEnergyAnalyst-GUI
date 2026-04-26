import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import MapLayerPropertiesCard from 'features/project/components/Cards/MapLayersCard/MapLayerPropertiesCard';

import { MapInstanceContext, useMapCardStore } from './mapInstance';

/**
 * Bottom card — hosts the map-layer properties form for Reports.
 *
 * Two entry points into the same form:
 *   - **Plot edit**: `PlotEditModal` sets the singleton's category
 *     and layer; `BottomCard` renders without an `activeMapCardId`,
 *     so the scoped hooks fall back to the singleton (legacy path).
 *   - **Map card edit**: `FeatureCardMap` publishes its per-card
 *     store; clicking Edit sets `activeMapCardId` and `BottomCard`
 *     wraps the form in `MapInstanceContext.Provider` so reads/writes
 *     route to that card's own state.
 *
 * `hideLayerSelector` / `hideLegend` strip Reports-irrelevant chrome.
 * `showClose` is only set for the map-card path (the plot drawer has
 * its own close).
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
