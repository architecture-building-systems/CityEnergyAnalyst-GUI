import React from 'react';
import Map, { useGeoJson } from '../Map/Map';

const MAP_STYLE = { height: '500px', width: '100%', position: 'relative' };

const InputEditor = () => {
  const data = useGeoJson(['zone', 'district', 'streets']);
  return <Map style={MAP_STYLE} data={data} />;
};

export default InputEditor;
