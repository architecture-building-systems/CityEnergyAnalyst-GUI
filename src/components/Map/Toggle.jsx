export const NetworkToggle = ({ data, setVisibility }) => {
  const handleChange = (e) => {
    const { value } = e.target;
    setVisibility((oldValue) => ({
      ...oldValue,
      dc: value === 'dc',
      dh: value === 'dh',
    }));
  };
  return (
    <div className="network-toggle">
      <span>Network Type:</span>
      {data.dc && (
        <label className="map-plot-label network-label">
          <input
            type="radio"
            name="network-type"
            value="dc"
            onChange={handleChange}
            defaultChecked
          />
          District Cooling
        </label>
      )}
      {data.dh && (
        <label className="map-plot-label network-label">
          <input
            type="radio"
            name="network-type"
            value="dh"
            onChange={handleChange}
            defaultChecked={!data.dc}
          />
          District Heating
        </label>
      )}
      {!data.dc && !data.dh && <div>No networks found</div>}
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
