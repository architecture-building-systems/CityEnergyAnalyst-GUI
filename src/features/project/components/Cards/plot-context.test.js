import { describe, it, expect, vi } from 'vitest';

// plot-tool.jsx pulls in the whole tool form; only its pure helpers are under test.
vi.mock('features/tools/components/Tools/Tool', () => ({
  default: () => null,
}));
vi.mock('features/map/stores/mapStore', () => ({
  useMapStore: () => null,
  useSelectedMapLayer: () => null,
}));
vi.mock('features/project/stores/tool-card', () => ({
  useSelectedPlotToolSeed: () => null,
  useToolCardStore: () => null,
}));

import { buildPlotContext, plotContextProblem } from './plot-tool';

describe('buildPlotContext', () => {
  it('names the feature after the script, whatever the map shows', () => {
    const context = buildPlotContext({
      script: 'plot-final-energy',
      panelTech: 'PV',
      panelType: 'PV1',
    });
    expect(context.feature).toBe('final-energy');
    expect(context.solar_panel_types).toEqual({});
  });

  it('takes the solar technology and panel type from the map layer', () => {
    const context = buildPlotContext({
      script: 'plot-solar',
      panelTech: 'PV',
      panelType: 'PV2',
      period: [1, 365],
    });
    expect(context).toEqual({
      feature: 'pv',
      period_start: 0,
      period_end: 8760,
      solar_panel_types: { pv: 'PV2' },
    });
  });

  it('splits the compound PVT panel type into its PV and SC halves', () => {
    const context = buildPlotContext({
      script: 'plot-solar',
      panelTech: 'PVT',
      panelType: 'PV1 + SC1',
    });
    expect(context.feature).toBe('pvt');
    expect(context.solar_panel_types).toEqual({ pv: 'PV1', sc: 'SC1' });
  });

  it('uses the timeline, not the hourly period, for lifecycle plots', () => {
    const context = buildPlotContext({
      script: 'plot-lifecycle-emissions',
      period: [1, 365],
      timeline: [2000, 2060],
    });
    expect(context.period_start).toBe(2000);
    expect(context.period_end).toBe(2060);
  });
});

describe('plotContextProblem', () => {
  const solar = (overrides) =>
    buildPlotContext({ script: 'plot-solar', ...overrides });

  it('accepts a solar context with its technology and panel type', () => {
    expect(
      plotContextProblem(
        'plot-solar',
        solar({ panelTech: 'SC', panelType: 'SC1' }),
      ),
    ).toBeNull();
  });

  // No solar map layer selected: the feature falls back to the script's name.
  it('rejects plot-solar with no technology selected', () => {
    expect(plotContextProblem('plot-solar', solar({}))).toMatch(
      /solar technology/,
    );
  });

  it('rejects plot-solar with a technology but no panel type', () => {
    expect(
      plotContextProblem('plot-solar', solar({ panelTech: 'PV' })),
    ).toMatch(/panel type/);
  });

  it('rejects PVT with only one of its two panel types', () => {
    expect(
      plotContextProblem(
        'plot-solar',
        solar({ panelTech: 'PVT', panelType: 'PV1' }),
      ),
    ).not.toBeNull();
  });

  it('has nothing to check for other plots', () => {
    const context = buildPlotContext({ script: 'plot-demand' });
    expect(plotContextProblem('plot-demand', context)).toBeNull();
  });
});
