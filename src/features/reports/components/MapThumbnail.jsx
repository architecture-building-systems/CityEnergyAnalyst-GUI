import { useRef, useEffect, useState, useCallback } from 'react';
import { Skeleton, Tooltip } from 'antd';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import positron from 'constants/mapStyles/positron.json';
import { useFetchZoneGeoJSON } from '../hooks/useReportsData';

/**
 * Interactive map showing zone building footprints.
 * Supports zoom, pan, and 3D/2D toggle.
 * Bottom edge is draggable to resize height.
 */
const MapThumbnail = ({ project, scenario, height: initialHeight = 180 }) => {
  const [height, setHeight] = useState(initialHeight);
  const [is3D, setIs3D] = useState(false);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const dragRef = useRef(null);
  const boundsRef = useRef(null);

  const { data: geojson, isLoading, error } = useFetchZoneGeoJSON(
    project,
    scenario,
  );

  // Height resize drag
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
      if (mapRef.current) mapRef.current.resize();
      dragRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [height]);

  // 3D/2D toggle
  const toggle3D = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const next = !is3D;
    setIs3D(next);

    if (next) {
      // Switch to 3D: add pitch and swap fill → fill-extrusion
      map.easeTo({ pitch: 45, duration: 400 });
      if (map.getLayer('zone-fill')) map.removeLayer('zone-fill');
      if (!map.getLayer('zone-3d')) {
        map.addLayer({
          id: 'zone-3d',
          type: 'fill-extrusion',
          source: 'zone',
          paint: {
            'fill-extrusion-color': '#D4A76A',
            'fill-extrusion-opacity': 0.85,
            'fill-extrusion-height': [
              'case',
              ['has', 'height_ag'], ['get', 'height_ag'],
              ['has', 'floors_ag'], ['*', ['get', 'floors_ag'], 3],
              10,
            ],
            'fill-extrusion-base': 0,
          },
        });
      }
    } else {
      // Switch to 2D: remove pitch and swap fill-extrusion → fill
      map.easeTo({ pitch: 0, duration: 400 });
      if (map.getLayer('zone-3d')) map.removeLayer('zone-3d');
      if (!map.getLayer('zone-fill')) {
        map.addLayer({
          id: 'zone-fill',
          type: 'fill',
          source: 'zone',
          paint: {
            'fill-color': '#D4A76A',
            'fill-opacity': 0.7,
          },
        }, 'zone-outline');
      }
    }
  }, [is3D]);

  // Reset camera to fit bounds
  const resetCamera = useCallback(() => {
    const map = mapRef.current;
    if (!map || !boundsRef.current) return;
    map.fitBounds(boundsRef.current, { padding: 20, duration: 300 });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || !geojson) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: positron,
      attributionControl: false,
      pitchWithRotate: true,
      dragRotate: true,
    });

    // Add zoom controls
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, showZoom: true }),
      'top-right',
    );

    map.on('load', () => {
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
          boundsRef.current = bounds;
          map.fitBounds(bounds, { padding: 20, duration: 0 });
        }
      } catch {
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

      {/* 3D/2D toggle + reset camera buttons */}
      <div style={controlsStyle}>
        <Tooltip title={is3D ? '2D view' : '3D view'}>
          <button
            type="button"
            onClick={toggle3D}
            style={{
              ...controlButtonStyle,
              ...(is3D ? controlButtonActiveStyle : {}),
            }}
          >
            {is3D ? '2D' : '3D'}
          </button>
        </Tooltip>
        <Tooltip title="Reset view">
          <button type="button" onClick={resetCamera} style={controlButtonStyle}>
            <ResetIcon />
          </button>
        </Tooltip>
      </div>

      {/* Height resize drag handle */}
      <div
        onMouseDown={handleDragStart}
        style={dragHandleStyle}
        title="Drag to resize"
      />
    </div>
  );
};

const ResetIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 1 1 .908-.418A6 6 0 1 1 8 2v1z" />
    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
  </svg>
);

const controlsStyle = {
  position: 'absolute',
  top: 8,
  left: 8,
  display: 'flex',
  gap: 4,
  zIndex: 2,
};

const controlButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 4,
  border: '1px solid rgba(0,0,0,0.15)',
  background: 'rgba(255,255,255,0.9)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
  color: '#333',
  padding: 0,
};

const controlButtonActiveStyle = {
  background: '#1470AF',
  color: '#fff',
  borderColor: '#1470AF',
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
