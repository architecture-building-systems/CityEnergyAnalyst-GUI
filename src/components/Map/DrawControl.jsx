import { useControl } from 'react-map-gl/maplibre';

import MapboxDraw from '@mapbox/mapbox-gl-draw';
import StaticMode from '@mapbox/mapbox-gl-draw-static-mode';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { forwardRef, useEffect, useImperativeHandle } from 'react';

MapboxDraw.constants.classes.CANVAS = 'maplibregl-canvas';
MapboxDraw.constants.classes.CONTROL_BASE = 'maplibregl-ctrl';
MapboxDraw.constants.classes.CONTROL_PREFIX = 'maplibregl-ctrl-';
MapboxDraw.constants.classes.CONTROL_GROUP = 'maplibregl-ctrl-group';
MapboxDraw.constants.classes.ATTRIBUTION = 'maplibregl-ctrl-attrib';

export const DRAW_MODES = {
  draw: 'draw_polygon',
  edit: 'direct_select',
  view: 'simple_select',
};

const DrawControl = forwardRef((props, ref) => {
  const drawRef = useControl(
    () => {
      var modes = MapboxDraw.modes;
      modes.simple_select = StaticMode;

      const draw = new MapboxDraw({ ...props, modes });
      return draw;
    },
    ({ map }) => {
      const initialPolygon = props.initialPolygon;

      map.on('draw.create', props.onCreate);
      map.on('draw.update', props.onUpdate);
      map.on('draw.delete', props.onDelete);
      map.on('draw.modechange', props.onModeChange);
    },
    ({ map }) => {
      map.off('draw.create', props.onCreate);
      map.off('draw.update', props.onUpdate);
      map.off('draw.delete', props.onDelete);
      map.off('draw.modechange', props.onModeChange);
    },
    {
      position: props.position,
    },
  );

  // Use an effect to add the initial polygon data when component mounts
  useEffect(() => {
    const initialPolygon = props.initialPolygon;

    if (drawRef && initialPolygon?.features?.length > 0)
      drawRef.set(initialPolygon);
  }, []);

  // Forward the ref to access the MapboxDraw instance
  useImperativeHandle(ref, () => drawRef);

  return null;
});

DrawControl.displayName = 'DrawControl';

export default DrawControl;
