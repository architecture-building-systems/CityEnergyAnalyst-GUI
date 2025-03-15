import { useEffect, useMemo, useRef, useState } from 'react';
import { useMapStore } from './store/store';
import { useInputs } from '../../hooks/queries/useInputs';
import { Dropdown } from 'antd';
import { EyeOutlined } from '@ant-design/icons';

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
  return (
    <div className="layer-toggle">
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

const generateLayerToggle = (data, handleChange, handleMapLabelsChange) => {
  const out = [];

  if (data?.zone) {
    out.push({
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
    out.push({
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
    out.push({
      label: (
        <LayerToggleRadio label="Trees" value="trees" onChange={handleChange} />
      ),
    });
  }

  if (data?.streets) {
    out.push({
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
    out.push({
      label: (
        <LayerToggleRadio
          label="Network"
          value="network"
          onChange={handleChange}
        />
      ),
    });
  }

  out.push({
    label: (
      <LayerToggleRadio
        label="Map labels"
        value="map_labels"
        onChange={handleMapLabelsChange}
      />
    ),
  });

  return out;
};

export const LayerToggle = () => {
  const { data: inputData } = useInputs();
  const { geojsons: data } = inputData;

  const dataLoaded = useRef(false);
  const setVisibility = useMapStore((state) => state.setVisibility);
  const setMapLabels = useMapStore((state) => state.setMapLabels);

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

  const items = useMemo(() => {
    const handleChange = (e) => {
      const { value, checked } = e.target;
      setVisibility(value, checked);
    };

    const handleMapLabelsChange = (e) => {
      const { checked } = e.target;
      setMapLabels(checked);
    };

    return generateLayerToggle(data, handleChange, handleMapLabelsChange);
  }, [data]);

  return (
    <Dropdown menu={{ items, onClick: (e) => e.preventDefault() }}>
      <EyeOutlined style={{ fontSize: 24, padding: 8 }} />
    </Dropdown>
  );
};
