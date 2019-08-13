import React from 'react';
import DeckGL from '@deck.gl/react';
import ReactMapGL, { _MapContext as MapContext } from 'react-map-gl';

const LIGHT_MAP = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'http://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'http://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'http://b.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: 'Map data © OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

// const DARK_MAP = {
//   version: 8,
//   sources: {
//     'carto-tiles': {
//       type: 'raster',
//       tiles: [
//         'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
//         'https://cartodb-basemaps-b.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
//         'https://cartodb-basemaps-c.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
//       ],
//       tileSize: 256,
//       attribution:
//         'Map tiles by Carto, under CC BY 3.0. Data by OpenStreetMap, under ODbL.'
//     }
//   },
//   layers: [
//     {
//       id: 'carto-tiles',
//       type: 'raster',
//       source: 'carto-tiles',
//       minzoom: 0,
//       maxzoom: 22
//     }
//   ]
// };

// Initial viewport settings
const initialViewState = {
  longitude: -122.41669,
  latitude: 37.7853,
  zoom: 13,
  pitch: 0,
  bearing: 0
};

const Map = props => {
  const { layers, style } = props;
  return (
    <div style={style}>
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={layers}
        ContextProvider={MapContext.Provider}
      >
        <ReactMapGL mapStyle={LIGHT_MAP} />
      </DeckGL>
    </div>
  );
};

export default Map;
