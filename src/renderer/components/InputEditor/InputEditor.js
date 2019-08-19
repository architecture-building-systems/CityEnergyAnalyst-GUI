import React from 'react';
import Map from '../Map/Map';

const MAP_STYLE = { height: '500px', width: '100%', position: 'relative' };

const InputEditor = () => {
  return <Map style={MAP_STYLE} layerList={['zone', 'district', 'streets']} />;
};

export default InputEditor;
