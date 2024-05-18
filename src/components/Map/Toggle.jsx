import { useState } from 'react';

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
      {!cooling && !heating && <div>No networks found</div>}
    </div>
  );
};

export const LayerToggle = ({ data, setVisibility }) => {
  const handleChange = (e) => {
    const { value, checked } = e.target;
    setVisibility((oldValue) => ({ ...oldValue, [value]: checked }));
  };
  return (
    <div id="layers-group">
      {data.zone && (
        <span className="layer-toggle">
          <label className="map-plot-label">
            <input
              type="checkbox"
              name="layer-toggle"
              value="zone"
              onChange={handleChange}
              defaultChecked
            />
            Zone
          </label>
        </span>
      )}
      {data.surroundings && (
        <span className="layer-toggle">
          <label className="map-plot-label">
            <input
              type="checkbox"
              name="layer-toggle"
              value="surroundings"
              onChange={handleChange}
              defaultChecked
            />
            Surroundings
          </label>
        </span>
      )}
      {data.trees && (
        <span className="layer-toggle">
          <label className="map-plot-label">
            <input
              type="checkbox"
              name="layer-toggle"
              value="trees"
              onChange={handleChange}
              defaultChecked
            />
            Trees
          </label>
        </span>
      )}
      {data.streets && (
        <span className="layer-toggle">
          <label className="map-plot-label">
            <input
              type="checkbox"
              name="layer-toggle"
              value="streets"
              onChange={handleChange}
              defaultChecked
            />
            Streets
          </label>
        </span>
      )}
      {(data.dh || data.dc) && (
        <span className="layer-toggle">
          <label className="map-plot-label">
            <input
              type="checkbox"
              name="layer-toggle"
              value="network"
              onChange={handleChange}
              defaultChecked
            />
            Network
          </label>
        </span>
      )}
    </div>
  );
};
