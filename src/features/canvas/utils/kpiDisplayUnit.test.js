import { describe, expect, it } from 'vitest';

import { convertKpiValue, resolveDisplayUnit } from './kpiDisplayUnit';

const entry = {
  id: 'solar.annual_pv_generation_kwh',
  unit: 'kWh/yr',
  display_units: [
    { unit: 'kWh/yr', factor: 1 },
    { unit: 'MWh/yr', factor: 0.001 },
    { unit: 'GWh/yr', factor: 0.000001 },
  ],
};

describe('convertKpiValue', () => {
  it('keeps the base unit', () => {
    expect(convertKpiValue(3000, entry, 'kWh/yr')).toEqual({
      value: 3000,
      unit: 'kWh/yr',
    });
    expect(convertKpiValue(3000, entry, null)).toEqual({
      value: 3000,
      unit: 'kWh/yr',
    });
  });

  it('converts to a listed unit', () => {
    expect(convertKpiValue(3000, entry, 'MWh/yr')).toEqual({
      value: 3,
      unit: 'MWh/yr',
    });
  });

  it('falls back to the base unit when the saved unit is not listed', () => {
    expect(convertKpiValue(3000, entry, 'TWh/yr')).toEqual({
      value: 3000,
      unit: 'kWh/yr',
    });
  });

  it('shows the base unit when display_units is empty', () => {
    const pct = { id: 'x', unit: '%', display_units: [] };
    expect(convertKpiValue(40, pct, 'MWh/yr')).toEqual({
      value: 40,
      unit: '%',
    });
  });

  it('uses the fallback unit before the registry loads', () => {
    expect(convertKpiValue(5, undefined, 'MWh/yr', 'kWh/yr')).toEqual({
      value: 5,
      unit: 'kWh/yr',
    });
  });

  it('passes a missing value through', () => {
    expect(convertKpiValue(null, entry, 'MWh/yr').value).toBeNull();
    expect(convertKpiValue(undefined, entry, 'MWh/yr').value).toBeUndefined();
  });
});

describe('resolveDisplayUnit', () => {
  it('returns the saved unit only when the entry offers it', () => {
    expect(resolveDisplayUnit(entry, 'GWh/yr')).toBe('GWh/yr');
    expect(resolveDisplayUnit(entry, 'bogus')).toBe('kWh/yr');
    expect(resolveDisplayUnit(entry, null)).toBe('kWh/yr');
  });
});
