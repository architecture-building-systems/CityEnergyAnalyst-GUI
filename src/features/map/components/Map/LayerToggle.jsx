import { useEffect, useMemo, useRef, useState } from 'react';
import { useMapStore, COLOR_MODES } from 'features/map/stores/mapStore';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { Dropdown, Tooltip } from 'antd';
import { LayersIcon } from 'assets/icons';
import {
  generateConstructionColorMap,
  generateUseTypeColorMap,
} from 'features/map/utils/constructionColors';

const NetworkRadioInput = ({ value, label, selected, onSelect }) => {
  return (
    <label className="map-plot-label network-label">
      <input
        type="radio"
        name="network-type"
        value={value}
        onChange={() => onSelect(value)}
        checked={selected === value}
      />
      {label}
    </label>
  );
};

export const NetworkToggle = ({
  cooling,
  heating,
  initialValue = null,
  onChange = () => {},
}) => {
  const [selected, setSelected] = useState(initialValue);

  const handleChange = (value) => {
    setSelected(value);
    onChange(value);
  };

  return (
    <div className="network-toggle">
      <b>
        <u>Networks</u>
      </b>
      {cooling && (
        <NetworkRadioInput
          value="dc"
          label="District Cooling"
          selected={selected}
          onSelect={handleChange}
        />
      )}
      {heating && (
        <NetworkRadioInput
          value="dh"
          label="District Heating"
          selected={selected}
          onSelect={handleChange}
        />
      )}
      {!cooling && !heating && <div>No thermal networks found</div>}
    </div>
  );
};

const LayerToggleRadio = ({ label, value, onChange }) => {
  const handleClick = (e) => {
    // Prevent the click from closing the dropdown
    e.stopPropagation();
  };

  return (
    <div
      className="layer-toggle"
      onClick={handleClick}
      onKeyDown={handleClick}
      role="presentation"
    >
      <label className="layer-toggle-label">
        <input
          type="checkbox"
          name="layer-toggle"
          value={value}
          onChange={onChange}
          defaultChecked
        />
        {label}
      </label>
    </div>
  );
};

const generateLayerToggle = (
  data,
  handleChange,
  handleMapLabelsChange,
  handleConstructionColorChange,
  isConstructionColorEnabled,
  handleUseTypeColorChange,
  isUseTypeColorEnabled,
) => {
  const geometryGroup = [];
  if (data?.zone) {
    geometryGroup.push({
      label: (
        <LayerToggleRadio
          label="Zone"
          value="zone"
          onChange={handleChange}
          checked
        />
      ),
    });
  }

  if (data?.surroundings) {
    geometryGroup.push({
      label: (
        <LayerToggleRadio
          label="Surroundings"
          value="surroundings"
          onChange={handleChange}
        />
      ),
    });
  }

  if (data?.trees) {
    geometryGroup.push({
      label: (
        <LayerToggleRadio label="Trees" value="trees" onChange={handleChange} />
      ),
    });
  }

  if (data?.streets) {
    geometryGroup.push({
      label: (
        <LayerToggleRadio
          label="Streets"
          value="streets"
          onChange={handleChange}
        />
      ),
    });
  }

  if (data?.dh || data?.dc) {
    geometryGroup.push({
      label: (
        <LayerToggleRadio
          label="Network"
          value="network"
          onChange={handleChange}
        />
      ),
    });
  }
  if (geometryGroup.length > 0)
    geometryGroup.unshift({ type: 'group', label: 'Geometry' });

  const mapStyleGroup = [];
  mapStyleGroup.push({
    type: 'group',
    label: 'Map Style',
  });

  mapStyleGroup.push({
    key: 'map_labels',
    label: (
      <LayerToggleRadio
        label="Map Labels"
        value="map_labels"
        onChange={handleMapLabelsChange}
      />
    ),
  });

  if (data?.zone) {
    mapStyleGroup.push({
      key: 'zone_labels',
      label: (
        <LayerToggleRadio
          label="Building Names"
          value="zone_labels"
          onChange={handleChange}
          checked
        />
      ),
    });
  }

  // Add construction standard coloring toggle if zone data exists
  if (data?.zone) {
    mapStyleGroup.push({ type: 'group', label: 'Building Colours' });
    mapStyleGroup.push({
      key: 'construction_colors',
      label: (
        <LayerToggleRadioControlled
          label="By Construction Archetypes"
          value="construction_colors"
          checked={isConstructionColorEnabled}
          onChange={handleConstructionColorChange}
        />
      ),
    });
    mapStyleGroup.push({
      key: 'use_type_colors',
      label: (
        <LayerToggleRadioControlled
          label="By Main Use Types"
          value="use_type_colors"
          checked={isUseTypeColorEnabled}
          onChange={handleUseTypeColorChange}
        />
      ),
    });
  }

  return [...geometryGroup, ...mapStyleGroup];
};

// Controlled radio for color mode selection (mutually exclusive, click again to turn off)
const LayerToggleRadioControlled = ({ label, checked, onChange }) => {
  const handleClick = (e) => {
    e.stopPropagation();
    onChange?.(!checked);
  };

  return (
    <div
      className="layer-toggle"
      onClick={handleClick}
      onKeyDown={handleClick}
      role="presentation"
    >
      <label className="layer-toggle-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => {}}
          style={{ appearance: 'radio', WebkitAppearance: 'radio' }}
        />
        {label}
      </label>
    </div>
  );
};

const LayerToggle = () => {
  const { data: inputData } = useInputs();
  const { geojsons: data } = inputData;

  const dataLoaded = useRef(false);
  const constructionColorInitialized = useRef(false);
  const setVisibility = useMapStore((state) => state.setVisibility);
  const setMapLabels = useMapStore((state) => state.setMapLabels);

  // Construction standard coloring state
  const colorMode = useMapStore((state) => state.colorMode);
  const setColorMode = useMapStore((state) => state.setColorMode);
  const setConstructionColorMap = useMapStore(
    (state) => state.setConstructionColorMap,
  );
  const setUseTypeColorMap = useMapStore((state) => state.setUseTypeColorMap);
  const isConstructionColorEnabled =
    colorMode === COLOR_MODES.CONSTRUCTION_STANDARD;
  const isUseTypeColorEnabled = colorMode === COLOR_MODES.USE_TYPE;

  useEffect(() => {
    // Set all layers to visible by default
    if (data?.zone && !dataLoaded.current) {
      const dataNames = Object.keys(data);
      if (dataNames?.length > 0) {
        dataNames.map((name) => {
          setVisibility(name, true);
        });
      }
      dataLoaded.current = true;
    }

    if (!data?.zone) {
      dataLoaded.current = false;
    }
  }, [data]);

  // Initialize construction color map when zone data changes
  // Only auto-enable on true first load; respect user's toggle choice on refetch
  useEffect(() => {
    if (data?.zone?.features) {
      const colorMap = generateConstructionColorMap(data.zone.features);
      setConstructionColorMap(colorMap);
      const useTypeMap = generateUseTypeColorMap(data.zone.features);
      setUseTypeColorMap(useTypeMap);
      // Only enable on first load — not on refetch after user toggled off
      if (!constructionColorInitialized.current) {
        setColorMode(COLOR_MODES.CONSTRUCTION_STANDARD);
        constructionColorInitialized.current = true;
      }
    } else {
      // Reset construction coloring state when zone data becomes unavailable
      setColorMode(COLOR_MODES.DEFAULT);
      setConstructionColorMap({});
      constructionColorInitialized.current = false;
    }
  }, [data?.zone?.features, setConstructionColorMap, setColorMode]);

  const items = useMemo(() => {
    const handleChange = (e) => {
      const { value, checked } = e.target;
      setVisibility(value, checked);
    };

    const handleMapLabelsChange = (e) => {
      const { checked } = e.target;
      setMapLabels(checked);
    };

    const handleConstructionColorChange = (on) => {
      setColorMode(on ? COLOR_MODES.CONSTRUCTION_STANDARD : COLOR_MODES.DEFAULT);
    };

    const handleUseTypeColorChange = (on) => {
      setColorMode(on ? COLOR_MODES.USE_TYPE : COLOR_MODES.DEFAULT);
    };

    return generateLayerToggle(
      data,
      handleChange,
      handleMapLabelsChange,
      handleConstructionColorChange,
      isConstructionColorEnabled,
      handleUseTypeColorChange,
      isUseTypeColorEnabled,
    );
  }, [
    data,
    isConstructionColorEnabled,
    isUseTypeColorEnabled,
    setVisibility,
    setMapLabels,
    setColorMode,
  ]);

  return (
    <Tooltip title="Toggle Layers" styles={{ body: { fontSize: 12 } }}>
      <div className="cea-card-toolbar-icon no-hover-color">
        <Dropdown
          menu={{ items }}
          trigger={['click']}
          popupRender={(menu) => (
            <div style={{ marginBottom: '10px' }}>{menu}</div>
          )}
          placement="top"
        >
          <LayersIcon />
        </Dropdown>
      </div>
    </Tooltip>
  );
};

export default LayerToggle;
