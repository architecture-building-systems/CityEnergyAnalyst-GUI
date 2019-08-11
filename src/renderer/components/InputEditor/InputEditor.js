/// app.js
import React from 'react';
import DeckGL from '@deck.gl/react';
import { LineLayer } from '@deck.gl/layers';
import { StaticMap } from 'react-map-gl';

// Set your mapbox access token here
const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoicmV5ZXJ5IiwiYSI6ImNqdzFpcHFlYzA5cDg0OW54eWVmMXVlZHQifQ.gg7RvCVARsrSxq8NjKYsSA';

// Initial viewport settings
const initialViewState = {
  longitude: -122.41669,
  latitude: 37.7853,
  zoom: 13,
  pitch: 0,
  bearing: 0
};

// Data to be used by the LineLayer
const data = [
  {
    sourcePosition: [-122.41669, 37.7853],
    targetPosition: [-122.41669, 37.781]
  }
];

class InputEditor extends React.Component {
  render() {
    const layers = [new LineLayer({ id: 'line-layer', data })];

    return (
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={layers}
      >
        <StaticMap mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN} />
      </DeckGL>
    );
  }
}

export default InputEditor;
