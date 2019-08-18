import React, { useRef, useEffect, useState } from 'react';
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
  longitude: 0,
  latitude: 0,
  zoom: 0,
  pitch: 0,
  bearing: 0
};

const Map = props => {
  const { layers, bbox, style } = props;
  const mapRef = useRef();
  const [viewState, setViewState] = useState(initialViewState);

  useEffect(() => {
    if (bbox) {
      let cameraOptions = mapRef.current.cameraForBounds(
        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
        {
          maxZoom: 18,
          padding: 30
        }
      );
      setViewState({
        ...viewState,
        zoom: cameraOptions.zoom,
        latitude: cameraOptions.center.lat,
        longitude: cameraOptions.center.lng,
        transitionDuration: 3000
      });
    }
  }, [bbox]);

  const _onViewStateChange = ({ viewState }) => {
    setViewState(viewState);
  };

  return (
    <div style={style}>
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={layers}
        ContextProvider={MapContext.Provider}
        onViewStateChange={_onViewStateChange}
      >
        <ReactMapGL
          ref={ref => (mapRef.current = ref && ref.getMap())}
          mapStyle={LIGHT_MAP}
        />
      </DeckGL>
    </div>
  );
};

export default Map;
