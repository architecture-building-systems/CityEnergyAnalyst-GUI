import { describe, expect, it } from 'vitest';

import { formatKpiNumber, formatKpiValue } from './formatKpiValue';

describe('formatKpiNumber', () => {
  it('applies an SI prefix from 1k up', () => {
    expect(formatKpiNumber(60_000, 'kgCO2e')).toBe('60k');
    expect(formatKpiNumber(1_200_000, 'kWh/yr')).toBe('1.2M');
    expect(formatKpiNumber(7e9, 'kWh/yr')).toBe('7G');
    expect(formatKpiNumber(-3000, 'kWh/yr')).toBe('-3k');
  });

  it('keeps one or two decimals below 1k', () => {
    expect(formatKpiNumber(78.42, 'kWh/m²/yr')).toBe('78.4');
    expect(formatKpiNumber(0.45, 'kWh/m²/yr')).toBe('0.45');
    expect(formatKpiNumber(0, 'kWh/yr')).toBe('0.00');
  });

  it('keeps two significant figures below 0.01', () => {
    // 1,500 kWh/yr shown in GWh/yr.
    expect(formatKpiNumber(0.0015, 'GWh/yr')).toBe('0.0015');
    expect(formatKpiNumber(-0.00234, 'GWh/yr')).toBe('-0.0023');
    expect(formatKpiNumber(0.01, 'GWh/yr')).toBe('0.01');
  });

  it('formats percentages and years on their own rules', () => {
    expect(formatKpiNumber(30.303, '%')).toBe('30.3');
    expect(formatKpiNumber(30, '%')).toBe('30');
    expect(formatKpiNumber(0.001, '%')).toBe('0');
    expect(formatKpiNumber(2030.0, 'years')).toBe('2030');
  });

  it('renders missing values as a placeholder', () => {
    expect(formatKpiNumber(null, 'kWh/yr')).toBe('—');
    expect(formatKpiNumber(undefined, 'kWh/yr')).toBe('—');
    expect(formatKpiNumber(NaN, 'kWh/yr')).toBe('—');
  });
});

describe('formatKpiValue', () => {
  it('joins the number and unit with a non-breaking space', () => {
    expect(formatKpiValue(78.42, 'kWh/m²/yr')).toBe('78.4 kWh/m²/yr');
    expect(formatKpiValue(null, 'kWh/m²/yr')).toBe('—');
    expect(formatKpiValue(12.3, '')).toBe('12.3');
  });
});
