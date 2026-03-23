import { useRef, useEffect, useState, useCallback } from 'react';
import { Skeleton } from 'antd';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import positron from 'constants/mapStyles/positron.json';
import { useFetchZoneGeoJSON } from '../hooks/useReportsData';

/**
 * Static map thumbnail showing zone building footprints.
 * Non-interactive, auto-fits to bounds.
 * Bottom edge is draggable to resize height.
 */
const MapThumbnail = ({ project, scenario, height: initialHeight = 180 }) => {
  const [height, setHeight] = useState(initialHeight);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const dragRef = useRef(null);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startHeight: height };

    const handleMove = (moveEvent) => {
      const delta = moveEvent.clientY - dragRef.current.startY;
      const newHeight = Math.max(80, dragRef.current.startHeight + delta);
      setHeight(newHeight);
      if (mapRef.current) mapRef.current.resize();
    };

    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      // Trigger map resize after drag ends
      if (mapRef.current) mapRef.current.resize();
      dragRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [height]);
  const { data: geojson, isLoading, error } = useFetchZoneGeoJSON(
    project,
    scenario,
  );

  useEffect(() => {
    if (!containerRef.current || !geojson) return;

    // Don't re-create if map already exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: positron,
      interactive: false,
      attributionControl: false,
    });

    map.on('load', () => {
      // Add zone geometry
      map.addSource('zone', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'zone-fill',
        type: 'fill',
        source: 'zone',
        paint: {
          'fill-color': '#D4A76A',
          'fill-opacity': 0.7,
        },
      });
      map.addLayer({
        id: 'zone-outline',
        type: 'line',
        source: 'zone',
        paint: {
          'line-color': '#8B6914',
          'line-width': 1,
        },
      });

      // Fit to bounds
      try {
        const bounds = new maplibregl.LngLatBounds();
        const features = geojson.features || [];
        for (const feature of features) {
          const geom = feature.geometry;
          if (!geom || !geom.coordinates) continue;
          const coords =
            geom.type === 'Polygon'
              ? geom.coordinates[0]
              : geom.type === 'MultiPolygon'
                ? geom.coordinates.flat(1)
                : [];
          for (const coord of coords) {
            bounds.extend(coord);
          }
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 20, duration: 0 });
        }
      } catch (e) {
        // Ignore bounds errors
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [geojson]);

  if (isLoading) {
    return (
      <Skeleton.Node
        active
        style={{ width: '100%', height, borderRadius: 8 }}
      />
    );
  }

  if (error || !geojson) {
    return (
      <div style={{ ...placeholderStyle, height }}>
        <span style={{ color: '#999', fontSize: 12 }}>Map unavailable</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }}
      />
      <div
        onMouseDown={handleDragStart}
        style={dragHandleStyle}
        title="Drag to resize"
      />
    </div>
  );
};

const dragHandleStyle = {
  position: 'absolute',
  bottom: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 40,
  height: 6,
  borderRadius: 3,
  background: 'rgba(0,0,0,0.15)',
  cursor: 'ns-resize',
  zIndex: 2,
  marginBottom: 2,
};

const placeholderStyle = {
  width: '100%',
  borderRadius: 8,
  background: '#e8e8e8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default MapThumbnail;
