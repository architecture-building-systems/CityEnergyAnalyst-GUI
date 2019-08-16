import React, { useEffect, useState } from 'react';
import Map from '../Map/Map';
import axios from 'axios';

import { GeoJsonLayer } from '@deck.gl/layers';

const MAP_STYLE = { height: '500px', width: '100%', position: 'relative' };

const InputEditor = () => {
  const [layers, setLayers] = useState([]);
  const [bbox, setBbox] = useState();
  useEffect(() => {
    axios
      .all([
        axios.get('http://localhost:5050/api/inputs/building-properties'),
        axios.get('http://localhost:5050/api/inputs/others/streets/geojson')
      ])
      .then(
        axios.spread(function(building, streets) {
          _render(building.data, streets.data);
        })
      )
      .catch(error => console.log(error));
  }, []);

  const _render = (buildings, streets) => {
    let _layers = [];
    if (typeof buildings.geojsons.zone !== 'undefined') {
      setBbox(buildings.geojsons.zone.bbox);
      _layers.push(
        new GeoJsonLayer({
          id: 'zone',
          data: buildings.geojsons.zone,
          filled: true
        })
      );
    }
    if (typeof buildings.geojsons.district !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'district',
          data: buildings.geojsons.district,
          filled: true
        })
      );
    }
    if (typeof streets !== 'undefined') {
      _layers.push(
        new GeoJsonLayer({
          id: 'streets',
          data: streets
        })
      );
    }
    console.log(_layers);
    setLayers(_layers);
  };

  return <Map style={MAP_STYLE} layers={layers} bbox={bbox}></Map>;
};

export default InputEditor;
