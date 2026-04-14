import { useRef, useEffect, useState, useMemo } from 'react';
import * as turf from '@turf/turf';
import { INDEX_COLUMN } from 'features/input-editor/constants';
import {
  THERMAL_NETWORK,
  EMISSIONS_EMBODIED,
  EMISSIONS_OPERATIONAL,
  FINAL_ENERGY,
  DEMAND,
} from 'features/map/constants';

const formatNumberCompact = (value, { unit = '', decimals = 2 } = {}) => {
  if (value == null || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  let scaled = value;
  let suffix = '';
  if (abs >= 1e9) {
    scaled = value / 1e9;
    suffix = 'B';
  } else if (abs >= 1e6) {
    scaled = value / 1e6;
    suffix = 'M';
  } else if (abs >= 1e3) {
    scaled = value / 1e3;
    suffix = 'k';
  }
  return `${scaled.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}${unit ? ` ${unit}` : ''}`;
};

const rgbToCss = (rgb) => {
  if (!Array.isArray(rgb) || rgb.length < 3) return '#888';
  const [r, g, b] = rgb;
  return `rgb(${r}, ${g}, ${b})`;
};

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

    // Stacked ColumnLayer hover — Lifecycle Emissions, Operational
    // Emissions, Energy by Carrier, and End-use Demand. Each data item
    // carries `{name, category, rawValue, rawValues, categories, layerLabel, unitLabel}`.
    if (
      (layer?.id?.startsWith(`${EMISSIONS_EMBODIED}-`) ||
        layer?.id?.startsWith(`${EMISSIONS_OPERATIONAL}-`) ||
        layer?.id?.startsWith(`${FINAL_ENERGY}-`) ||
        layer?.id?.startsWith(`${DEMAND}-`)) &&
      object?.categories &&
      object?.rawValues
    ) {
      const {
        name: entityName,
        category: hoveredCategory,
        rawValues,
        categories,
        layerLabel,
        unitLabel,
      } = object;
      const unit = unitLabel ?? 'kgCO₂e';
      const total = categories.reduce(
        (sum, c) => sum + Math.max(rawValues[c.name] || 0, 0),
        0,
      );

      return (
        <div className="tooltip-content">
          <b style={{ fontSize: '1.2em', marginBottom: '4px' }}>{entityName}</b>
          {layerLabel && (
            <div style={{ opacity: 0.7, marginBottom: 4 }}>{layerLabel}</div>
          )}

          <table className="tooltip-table" style={{ width: '100%' }}>
            <tbody>
              {categories.map((c) => {
                const v = rawValues[c.name] || 0;
                const isHovered = c.name === hoveredCategory;
                return (
                  <tr
                    key={c.name}
                    style={
                      isHovered ? { fontWeight: 'bold' } : { opacity: 0.85 }
                    }
                  >
                    <td style={{ paddingRight: 8 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          backgroundColor: rgbToCss(c.rgb),
                          marginRight: 6,
                          border: '1px solid rgba(0,0,0,0.2)',
                        }}
                      />
                      {c.name}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatNumberCompact(v, { unit })}
                    </td>
                  </tr>
                );
              })}
              <tr
                style={{
                  borderTop: '1px solid rgba(0,0,0,0.2)',
                  fontWeight: 'bold',
                }}
              >
                <td style={{ paddingTop: 4 }}>Total</td>
                <td style={{ textAlign: 'right', paddingTop: 4 }}>
                  {formatNumberCompact(total, { unit })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    // HexagonLayer hover for single-category mode (lifecycle-emissions,
    // operational-emissions, energy-by-carrier). deck.gl 9 does NOT
    // expose the raw source records on HexagonLayer hex bins — the
    // hover object is { col, row, position, colorValue, elevationValue }
    // so we can only show aggregated stats. `elevationValue` is the sum
    // of `getElevationWeight` (= d.value) across all points in the bin.
    const hexLayerId = layer?.id;
    if (
      hexLayerId === `${EMISSIONS_EMBODIED}-hex` ||
      hexLayerId === `${EMISSIONS_OPERATIONAL}-hex` ||
      hexLayerId === `${FINAL_ENERGY}-hex` ||
      hexLayerId === `${DEMAND}-hex`
    ) {
      const aggregateValue =
        typeof object?.elevationValue === 'number'
          ? object.elevationValue
          : typeof object?.colorValue === 'number'
            ? object.colorValue
            : null;
      if (aggregateValue == null) return null;
      let title;
      let unit;
      if (hexLayerId === `${FINAL_ENERGY}-hex`) {
        title = 'Energy by Carrier';
        unit = 'kWh';
      } else if (hexLayerId === `${EMISSIONS_OPERATIONAL}-hex`) {
        title = 'Operational Emissions';
        unit = 'kgCO₂e';
      } else if (hexLayerId === `${DEMAND}-hex`) {
        title = 'End-use Demand';
        unit = 'kWh';
      } else {
        title = 'Lifecycle Emissions';
        unit = 'kgCO₂e';
      }
      return (
        <div className="tooltip-content">
          <b style={{ fontSize: '1.2em', marginBottom: '4px' }}>{title}</b>
          <div className="tooltip-grid">
            <div>Bin total</div>
            <b style={{ marginLeft: 'auto' }}>
              {formatNumberCompact(aggregateValue, { unit })}
            </b>
          </div>
        </div>
      );
    }

    const { properties } = object;
    if (!properties) return null;
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
    } else if (
      layer.id === `${THERMAL_NETWORK}-none-nodes` ||
      layer.id === `${THERMAL_NETWORK}-consumer-nodes` ||
      layer.id === `${THERMAL_NETWORK}-plant-nodes`
    ) {
      if (properties?.type === 'NONE') return null;

      // Determine node type (handles PLANT, PLANT_hs_ww, PLANT_cs, etc.)
      const isPlantNode = properties?.type?.startsWith?.('PLANT');
      const isConsumerNode = properties?.type === 'CONSUMER';

      const nodeTitle = isPlantNode
        ? 'Plant Node'
        : isConsumerNode
          ? 'Building Node'
          : 'Network Node';

      // Format number with decimals
      const fmt = (val, decimals = 1) => {
        if (val == null || val === 'null') return null;
        return typeof val === 'number'
          ? val.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })
          : null;
      };

      return (
        <div className="tooltip-content">
          <b style={{ fontSize: '1.2em', marginBottom: '4px' }}>{nodeTitle}</b>

          {/* Basic Info */}
          <div className="tooltip-grid">
            <div>ID</div>
            <b style={{ marginLeft: 'auto' }}>{object?.id}</b>
          </div>

          {isConsumerNode && properties?.building && (
            <div className="tooltip-grid">
              <div>Building</div>
              <b style={{ marginLeft: 'auto' }}>{properties.building}</b>
            </div>
          )}

          {/* Building Node Metrics */}
          {isConsumerNode && (
            <>
              {(properties?.annual_energy_MWh != null ||
                properties?.annual_booster_MWh != null) && (
                <div>
                  <div className="tooltip-section-title">Annual Energy</div>
                  {properties?.annual_energy_MWh != null && (
                    <div className="tooltip-grid">
                      <div>Network Energy</div>
                      <b style={{ marginLeft: 'auto' }}>
                        {fmt(properties.annual_energy_MWh)} MWh
                      </b>
                    </div>
                  )}
                  {properties?.annual_booster_MWh != null && (
                    <div className="tooltip-grid">
                      <div>Booster Energy</div>
                      <b style={{ marginLeft: 'auto' }}>
                        {fmt(properties.annual_booster_MWh)} MWh
                      </b>
                    </div>
                  )}
                </div>
              )}

              {properties?.peak_load_kW != null && (
                <div className="tooltip-grid">
                  <div>Peak Load</div>
                  <b style={{ marginLeft: 'auto' }}>
                    {fmt(properties.peak_load_kW)} kW
                  </b>
                </div>
              )}

              {(properties?.avg_supply_temp_C != null ||
                properties?.avg_return_temp_C != null) && (
                <div>
                  <div className="tooltip-section-title">Temperatures</div>
                  {properties?.avg_supply_temp_C != null && (
                    <div className="tooltip-grid">
                      <div>Avg Supply</div>
                      <b style={{ marginLeft: 'auto' }}>
                        {fmt(properties.avg_supply_temp_C)}°C
                      </b>
                    </div>
                  )}
                  {properties?.avg_return_temp_C != null && (
                    <div className="tooltip-grid">
                      <div>Avg Return</div>
                      <b style={{ marginLeft: 'auto' }}>
                        {fmt(properties.avg_return_temp_C)}°C
                      </b>
                    </div>
                  )}
                  {properties?.avg_delta_t_C != null && (
                    <div className="tooltip-grid">
                      <div>Avg ΔT</div>
                      <b style={{ marginLeft: 'auto' }}>
                        {fmt(properties.avg_delta_t_C)}°C
                      </b>
                    </div>
                  )}
                </div>
              )}

              {properties?.hex_area_m2 != null && (
                <div className="tooltip-grid">
                  <div>HEX Area</div>
                  <b style={{ marginLeft: 'auto' }}>
                    {fmt(properties.hex_area_m2)} m<sup>2</sup>
                  </b>
                </div>
              )}
            </>
          )}

          {/* Plant Node Metrics */}
          {isPlantNode && (
            <>
              <div className="tooltip-grid">
                <div>Type</div>
                <b style={{ marginLeft: 'auto' }}>{properties.type}</b>
              </div>

              {properties?.annual_output_MWh != null && (
                <div className="tooltip-grid">
                  <div>Annual Output</div>
                  <b style={{ marginLeft: 'auto' }}>
                    {fmt(properties.annual_output_MWh)} MWh
                  </b>
                </div>
              )}

              {properties?.peak_load_kW != null && (
                <div className="tooltip-grid">
                  <div>Peak Load</div>
                  <b style={{ marginLeft: 'auto' }}>
                    {fmt(properties.peak_load_kW)} kW
                  </b>
                </div>
              )}

              {properties?.capacity_factor_pct != null && (
                <div className="tooltip-grid">
                  <div>Capacity Factor</div>
                  <b style={{ marginLeft: 'auto' }}>
                    {fmt(properties.capacity_factor_pct)}%
                  </b>
                </div>
              )}

              {(properties?.operating_hours != null ||
                properties?.operating_hours_pct != null) && (
                <div className="tooltip-grid">
                  <div>Operating Hours</div>
                  <b style={{ marginLeft: 'auto' }}>
                    {properties?.operating_hours != null
                      ? `${fmt(properties.operating_hours, 0)} hrs`
                      : ''}
                    {properties?.operating_hours_pct != null
                      ? ` (${fmt(properties.operating_hours_pct)}%)`
                      : ''}
                  </b>
                </div>
              )}

              {(properties?.avg_supply_temp_C != null ||
                properties?.avg_return_temp_C != null) && (
                <div>
                  <div className="tooltip-section-title">Temperatures</div>
                  {properties?.avg_supply_temp_C != null && (
                    <div className="tooltip-grid">
                      <div>Avg Supply</div>
                      <b style={{ marginLeft: 'auto' }}>
                        {fmt(properties.avg_supply_temp_C)}°C
                      </b>
                    </div>
                  )}
                  {properties?.avg_return_temp_C != null && (
                    <div className="tooltip-grid">
                      <div>Avg Return</div>
                      <b style={{ marginLeft: 'auto' }}>
                        {fmt(properties.avg_return_temp_C)}°C
                      </b>
                    </div>
                  )}
                  {(properties?.min_supply_temp_C != null ||
                    properties?.max_supply_temp_C != null) && (
                    <div className="tooltip-grid">
                      <div>Supply Range</div>
                      <b style={{ marginLeft: 'auto' }}>
                        {properties?.min_supply_temp_C != null &&
                        properties?.max_supply_temp_C != null
                          ? `${fmt(properties.min_supply_temp_C)} - ${fmt(properties.max_supply_temp_C)}°C`
                          : ''}
                      </b>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
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
