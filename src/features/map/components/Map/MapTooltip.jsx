import { useRef, useEffect, useState, useMemo } from 'react';
import * as turf from '@turf/turf';
import { INDEX_COLUMN } from 'features/input-editor/constants';
import { THERMAL_NETWORK } from 'features/map/constants';

import './MapTooltip.css';

const calculatePosition = (x, y, tooltipRect) => {
  const offset = 4;
  let left = x + offset;
  let top = y + offset;

  // Adjust horizontal position if tooltip goes off right edge
  if (left + tooltipRect.width > window.innerWidth) {
    left = x - tooltipRect.width - offset;
  }

  // Adjust vertical position if tooltip goes off bottom edge
  if (top + tooltipRect.height > window.innerHeight) {
    top = y - tooltipRect.height - offset;
  }

  // Ensure tooltip doesn't go off left edge
  if (left < 0) {
    left = offset;
  }

  // Ensure tooltip doesn't go off top edge
  if (top < 0) {
    top = offset;
  }

  return { x: left, y: top };
};

const MapTooltip = ({ info }) => {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const { x, y, object, layer } = info || {};

  useEffect(() => {
    if (x == null || y == null || !tooltipRef.current) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    setPosition(calculatePosition(x, y, tooltipRect));
  }, [x, y]);

  // Memoize expensive calculations
  const tooltipContent = useMemo(() => {
    if (!object) return null;

    const { properties } = object;
    const isZone = layer.id === 'zone';

    // Cache area calculation
    const area = turf.area(object);
    const footprintArea = Math.round(area * 1000) / 1000;

    if (isZone || layer.id === 'surroundings') {
      const heightAg = Number(properties?.height_ag ?? 0);
      const heightBg = Number(properties?.height_bg ?? 0);
      const floorsAg = Number(properties?.floors_ag ?? 0);
      const floorsBg = Number(properties?.floors_bg ?? 0);
      const voidDeck = Number(properties?.void_deck ?? 0);
      const gfaArea =
        Math.round(
          Math.max(0, (floorsAg + floorsBg - voidDeck) * area) * 1000,
        ) / 1000;

      return (
        <div className="tooltip-content">
          <b style={{ fontSize: '1.2em', marginBottom: '4px' }}>
            {properties[INDEX_COLUMN]}
          </b>

          {properties?.year && (
            <div className="tooltip-grid">
              <div>Year</div>
              <b style={{ marginLeft: 'auto' }}>{properties.year}</b>
            </div>
          )}

          <table className="tooltip-table">
            <thead>
              <tr>
                <th>Ground</th>
                <th>Above</th>
                {isZone && <th>Below</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Height</td>
                <td>
                  <b>{heightAg} m</b>
                </td>
                {isZone && (
                  <td>
                    <b>{heightBg} m</b>
                  </td>
                )}
              </tr>
              <tr>
                <td>Floors</td>
                <td>{<b>{floorsAg}</b>}</td>
                {isZone && <td>{<b>{floorsBg}</b>}</td>}
              </tr>
              {isZone && (
                <tr>
                  <td>Void deck</td>
                  <td>{<b>{voidDeck}</b>}</td>
                  <td>-</td>
                </tr>
              )}
            </tbody>
          </table>

          <div>
            <div className="tooltip-section-title">Floor Area</div>
            <div className="tooltip-grid">
              <div>Footprint</div>
              <b style={{ marginLeft: 'auto' }}>
                {footprintArea.toLocaleString()} m<sup>2</sup>
              </b>
              {isZone && (
                <>
                  <div>GFA</div>
                  <b style={{ marginLeft: 'auto' }}>
                    {gfaArea.toLocaleString()} m<sup>2</sup>
                  </b>
                </>
              )}
            </div>
          </div>

          {isZone && (
            <div>
              <div className="tooltip-section-title">Use Types</div>
              {[1, 2, 3].map((i) => {
                const usetype = properties?.[`use_type${i}`];
                const ratio = properties?.[`use_type${i}r`];

                if (!usetype || usetype === 'NONE' || !ratio || ratio <= 0) {
                  return null;
                }

                return (
                  <div key={i} className="tooltip-grid">
                    <div>
                      {i}:{' '}
                      <span
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {usetype}
                      </span>
                    </div>
                    <b style={{ marginLeft: 'auto' }}>
                      ({Math.round(ratio * 1000) / 10}%)
                    </b>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (layer.id === `${THERMAL_NETWORK}-edges`) {
      const length = properties?.length_m
        ? Math.round(properties?.length_m * 1000) / 1000
        : null;

      const pipeDiameter = properties?.pipe_DN
        ? Math.round(Number(properties.pipe_DN) * 100) / 100
        : null;

      const peakMassFlow =
        properties?.peak_mass_flow != null
          ? Math.round(Number(properties.peak_mass_flow) * 1000) / 1000
          : null;

      return (
        <div className="tooltip-content">
          <b style={{ fontSize: '1.2em', marginBottom: '4px' }}>Network Pipe</b>

          <div className="tooltip-grid">
            <div>ID</div>
            <b style={{ marginLeft: 'auto' }}>{object?.id}</b>
          </div>

          <div className="tooltip-grid">
            {length !== null && (
              <>
                <div>Length</div>
                <b style={{ marginLeft: 'auto' }}>{length} m</b>
              </>
            )}
            {pipeDiameter !== null && (
              <>
                <div>Nominal pipe diameter (DN)</div>
                <b style={{ marginLeft: 'auto' }}>{pipeDiameter}</b>
              </>
            )}
          </div>

          <div className="tooltip-grid">
            <div>Peak Mass Flow</div>
            <b style={{ marginLeft: 'auto' }}>
              {peakMassFlow !== null ? `${peakMassFlow} kg/s` : 'N/A'}
            </b>
          </div>
        </div>
      );
    } else if (layer.id === `${THERMAL_NETWORK}-nodes`) {
      if (properties?.type === 'NONE') return null;

      return (
        <div className="tooltip-content">
          <b style={{ fontSize: '1.2em', marginBottom: '4px' }}>Network Node</b>
          <div className="tooltip-grid">
            <div>ID</div>
            <b style={{ marginLeft: 'auto' }}>{object?.id}</b>
          </div>

          <div className="tooltip-grid">
            <div>Building</div>
            <b style={{ marginLeft: 'auto' }}>{properties?.building}</b>
            <div>Type</div>
            <b style={{ marginLeft: 'auto' }}>{properties?.type}</b>
          </div>
        </div>
      );
    }

    // Default fallback for other layer types
    return Object.keys(properties).map((key) => (
      <div key={key}>
        <b>{key}</b>: {properties[key]}
      </div>
    ));
  }, [object, layer]);

  if (!tooltipContent) return null;

  return (
    <div
      ref={tooltipRef}
      id="map-tooltip"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {tooltipContent}
    </div>
  );
};

export default MapTooltip;
