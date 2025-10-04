import { useRef, useEffect, useState, useMemo } from 'react';
import * as turf from '@turf/turf';
import { INDEX_COLUMN } from 'features/input-editor/constants';
import { THERMAL_NETWORK } from 'features/map/constants';

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
    if (!x || !y || !tooltipRef.current) return;

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
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {properties[INDEX_COLUMN]}
          </div>

          {properties?.year && (
            <div className="tooltip-grid">
              <div>Year</div>
              <b style={{ marginLeft: 'auto' }}>{properties.year}</b>
            </div>
          )}

          <div>
            <table>
              <thead>
                <tr>
                  <th></th>
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
                    <td colSpan={2}>{<b>{voidDeck}</b>}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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

    if (
      layer.id === `${THERMAL_NETWORK}-nodes` ||
      layer.id === `${THERMAL_NETWORK}-edges`
    ) {
      const length = properties['Buildings']
        ? Math.round(turf.length(object) * 1000 * 1000) / 1000
        : null;

      return (
        <>
          {Object.keys(properties).map((key) => {
            if (key !== 'Building' && properties[key] === 'NONE') return null;
            if (key === 'type_mat') return null;

            return (
              <div key={key}>
                <b>{key}</b>: {properties[key]}
              </div>
            );
          })}
          {length !== null && (
            <>
              <br />
              <div>
                <b>length</b>: {length}m
              </div>
            </>
          )}
        </>
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
