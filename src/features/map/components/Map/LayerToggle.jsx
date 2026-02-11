import { useEffect, useMemo, useRef, useState } from 'react';
import { useMapStore, COLOR_MODES } from 'features/map/stores/mapStore';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { Dropdown, Tooltip } from 'antd';
import { LayersIcon } from 'assets/icons';
import { generateConstructionColorMap } from 'features/map/utils/constructionColors';

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

  const RadioInput = ({ value, label }) => {
    return (
      <label className="map-plot-label network-label">
        <input
          type="radio"
          name="network-type"
          value={value}
          onChange={() => {
            handleChange(value);
          }}
          checked={selected === value}
        />
        {label}
      </label>
    );
  };

  return (
    <div className="network-toggle">
      <b>
        <u>Networks</u>
      </b>
      {cooling && <RadioInput value="dc" label="District Cooling" />}
      {heating && <RadioInput value="dh" label="District Heating" />}
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
    <div className="layer-toggle">
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <label className="layer-toggle-label" onClick={handleClick}>
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

  const labelsGroup = [];
  if (data?.zone) {
    labelsGroup.push({ type: 'group', label: 'Labels' });
    labelsGroup.push({
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

  const mapStyleGroup = [];
  mapStyleGroup.push({
    type: 'group',
    label: 'Map Style',
  });

  mapStyleGroup.push({
    key: 'map_labels',
    label: (
      <LayerToggleRadio
        label="Map labels"
        value="map_labels"
        onChange={handleMapLabelsChange}
      />
    ),
  });

  // Add construction standard coloring toggle if zone data exists
  if (data?.zone) {
    mapStyleGroup.push({
      key: 'construction_colors',
      label: (
        <LayerToggleRadioControlled
          label="Color by standard"
          value="construction_colors"
          checked={isConstructionColorEnabled}
          onChange={handleConstructionColorChange}
        />
      ),
    });
  }

  return [...geometryGroup, ...labelsGroup, ...mapStyleGroup];
};

// Controlled checkbox for construction colors (needs to reflect state)
const LayerToggleRadioControlled = ({ label, value, checked, onChange }) => {
  const handleClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="layer-toggle">
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <label className="layer-toggle-label" onClick={handleClick}>
        <input
          type="checkbox"
          name="layer-toggle"
          value={value}
          onChange={onChange}
          checked={checked}
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
  const setVisibility = useMapStore((state) => state.setVisibility);
  const setMapLabels = useMapStore((state) => state.setMapLabels);

  // Construction standard coloring state
  const colorMode = useMapStore((state) => state.colorMode);
  const setColorMode = useMapStore((state) => state.setColorMode);
  const setConstructionColorMap = useMapStore(
    (state) => state.setConstructionColorMap,
  );
  const isConstructionColorEnabled =
    colorMode === COLOR_MODES.CONSTRUCTION_STANDARD;

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
  // Only default to CONSTRUCTION_STANDARD on first load; respect user's toggle after that
  useEffect(() => {
    if (data?.zone?.features) {
      const colorMap = generateConstructionColorMap(data.zone.features);
      setConstructionColorMap(colorMap);
      // Only enable on first load — don't override user's toggle choice on refetch
      if (colorMode === COLOR_MODES.DEFAULT) {
        setColorMode(COLOR_MODES.CONSTRUCTION_STANDARD);
      }
    } else {
      // Reset construction coloring state when zone data becomes unavailable
      setColorMode(COLOR_MODES.DEFAULT);
      setConstructionColorMap({});
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

    const handleConstructionColorChange = (e) => {
      const { checked } = e.target;
      setColorMode(
        checked ? COLOR_MODES.CONSTRUCTION_STANDARD : COLOR_MODES.DEFAULT,
      );
    };

    return generateLayerToggle(
      data,
      handleChange,
      handleMapLabelsChange,
      handleConstructionColorChange,
      isConstructionColorEnabled,
    );
  }, [data, isConstructionColorEnabled]);

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
