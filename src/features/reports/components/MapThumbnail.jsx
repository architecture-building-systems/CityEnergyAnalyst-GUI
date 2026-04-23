import { useRef, useEffect, useState, useCallback } from 'react';
import { Button, Skeleton, Tooltip } from 'antd';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import positron from 'constants/mapStyles/positron.json';
import { CameraView, Compass, ExtrudeIcon } from 'assets/icons';
import { useFetchZoneGeoJSON } from '../hooks/useReportsData';

/**
 * Interactive map showing zone building footprints.
 * Fills its parent container in both axes; the parent card's CSS
 * `resize: both` owns all sizing. A ResizeObserver triggers
 * `map.resize()` so maplibre redraws on container size changes.
 */
const MapThumbnail = ({ project, scenario }) => {
  const [is3D, setIs3D] = useState(false);
  const [bearing, setBearing] = useState(0);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const boundsRef = useRef(null);

  // Reset bearing to north. Matches the main viewport's Reset Compass.
  const resetCompass = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.easeTo({ bearing: 0, duration: 300 });
    }
  }, []);

  const { data: geojson, isLoading, error } = useFetchZoneGeoJSON(
    project,
    scenario,
  );

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

    // Track bearing so the Compass icon can rotate with the current
    // orientation, same as the main map viewport.
    const handleRotate = () => setBearing(map.getBearing());
    map.on('rotate', handleRotate);
    map.on('rotateend', handleRotate);

    // Keep the map in sync with container size changes. The parent card
    // uses CSS `resize: both`, so the container can shrink/grow without
    // a window resize event — maplibre needs an explicit `map.resize()`
    // to redraw correctly.
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.off('rotate', handleRotate);
        mapRef.current.off('rotateend', handleRotate);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [geojson]);

  if (isLoading) {
    return (
      <Skeleton.Node
        active
        style={{ width: '100%', height: '100%', borderRadius: 8 }}
      />
    );
  }

  if (error || !geojson) {
    return (
      <div style={{ ...placeholderStyle, height: '100%' }}>
        <span style={{ color: '#999', fontSize: 12 }}>Map unavailable</span>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div ref={containerRef} style={mapFillStyle} />

      {/* Toggle 3D · Reset Camera · Reset Compass — the shared outline
          frame comes from `.cea-card-icon-button-container` (same class
          the OverviewCard uses for its side-by-side icon groups). */}
      <div
        className="cea-card-icon-button-container"
        style={controlsContainerStyle}
      >
        <Tooltip title="Toggle 3D">
          <Button
            type="text"
            onClick={toggle3D}
            icon={<ExtrudeIcon />}
            aria-label="Toggle 3D"
            className={is3D ? 'active' : ''}
            style={is3D ? activeButtonStyle : undefined}
          />
        </Tooltip>
        <Tooltip title="Reset Camera">
          <Button
            type="text"
            onClick={resetCamera}
            icon={<CameraView />}
            aria-label="Reset Camera"
          />
        </Tooltip>
        <Tooltip title="Reset Compass">
          <Button
            type="text"
            onClick={resetCompass}
            icon={
              <Compass style={{ transform: `rotate(${-bearing}deg)` }} />
            }
            aria-label="Reset Compass"
          />
        </Tooltip>
      </div>
    </div>
  );
};

const wrapperStyle = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

const mapFillStyle = {
  width: '100%',
  height: '100%',
  borderRadius: 8,
  overflow: 'hidden',
};

// Position-only overrides for the shared container. Outline, radius,
// button sizing, svg size, and hover background all come from the
// global `.cea-card-icon-button-container` CSS (HomePage.css).
const controlsContainerStyle = {
  position: 'absolute',
  top: 8,
  left: 8,
  zIndex: 2,
  background: '#fff',
  gap: 2,
};

const activeButtonStyle = {
  background: '#1470AF',
  color: '#fff',
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
