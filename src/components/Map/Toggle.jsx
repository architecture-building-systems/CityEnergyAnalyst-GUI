import { useEffect, useRef, useState } from 'react';
import { useMapStore } from './store/store';
import { useInputs } from '../../hooks/queries/useInputs';

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

export const LayerToggle = () => {
  const { data: inputData } = useInputs();
  const { geojsons: data } = inputData;

  const dataLoaded = useRef(false);
  const setVisibility = useMapStore((state) => state.setVisibility);
  const setMapLabels = useMapStore((state) => state.setMapLabels);

  const handleChange = (e) => {
    const { value, checked } = e.target;
    setVisibility(value, checked);
  };

  const handleMapLabelsChange = (e) => {
    const { checked } = e.target;
    setMapLabels(checked);
  };

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

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
      }}
    >
      {data?.zone && (
        <LayerToggleRadio label="Zone" value="zone" onChange={handleChange} />
      )}
      {data?.surroundings && (
        <LayerToggleRadio
          label="Surroundings"
          value="surroundings"
          onChange={handleChange}
        />
      )}
      {data?.trees && (
        <LayerToggleRadio label="Trees" value="trees" onChange={handleChange} />
      )}
      {data?.streets && (
        <LayerToggleRadio
          label="Streets"
          value="streets"
          onChange={handleChange}
        />
      )}
      {(data?.dh || data?.dc) && (
        <LayerToggleRadio
          label="Network"
          value="network"
          onChange={handleChange}
        />
      )}
      <LayerToggleRadio
        label="Map labels"
        value="map_labels"
        onChange={handleMapLabelsChange}
      />
    </div>
  );
};
