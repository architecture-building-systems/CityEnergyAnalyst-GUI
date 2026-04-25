import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import MapLayerPropertiesCard from 'features/project/components/Cards/MapLayersCard/MapLayerPropertiesCard';

/**
 * Bottom card — hosts the map-layer properties form for Reports.
 *
 * `MapLayerPropertiesCard` reads the active category + selected layer
 * from the singleton map stores and renders `null` when nothing is
 * active. `PlotEditModal` sets the singleton for plot-edit flows;
 * `FeatureCardMap` sets it for map-card flows.
 *
 * `hideLayerSelector`: skip the intra-category dropdown — Reports
 * dictates the layer via the active card.
 * `hideLegend`: Reports doesn't render the Legend column.
 *
 * `showClose` toggles a close button (used in map-card mode; plot
 * drawer has its own close).
 *
 * Path-C caveat: `useMapStore` is a singleton, so selections made
 * here also affect the main viewport on next visit.
 */
const BottomCard = ({ showClose = false, onClose }) => (
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
    <MapLayerPropertiesCard hideLegend hideLayerSelector />
  </div>
);

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
