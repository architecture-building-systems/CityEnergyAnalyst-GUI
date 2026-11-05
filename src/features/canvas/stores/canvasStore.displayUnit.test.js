import { useCanvasStore } from './canvasStore';

const kpiCards = () =>
  useCanvasStore.getState().launchCards.filter((c) => c.type === 'kpi');

beforeEach(() => {
  useCanvasStore.setState({ launchCards: [] });
});

describe('KPI card displayUnit', () => {
  it('is card state, separate from locatorArgs', () => {
    useCanvasStore.getState().addCard('launch', {
      targetCardId: 'MAP',
      direction: 'right',
      type: 'kpi',
      kpiId: 'solar.annual_pv_generation_kwh',
      locatorArgs: { panel_type: 'mono' },
      displayUnit: 'MWh/yr',
    });
    const [card] = kpiCards();
    expect(card.displayUnit).toBe('MWh/yr');
    expect(card.locatorArgs).toEqual({ panel_type: 'mono' });
  });

  it('defaults to null (the base unit)', () => {
    useCanvasStore.getState().addCard('launch', {
      targetCardId: 'MAP',
      direction: 'right',
      type: 'kpi',
      kpiId: 'demand.eui_kwh_m2',
    });
    expect(kpiCards()[0].displayUnit).toBeNull();
  });

  it('changing the unit on replace leaves locatorArgs untouched', () => {
    const { addCard, replaceKpiCard } = useCanvasStore.getState();
    const id = addCard('launch', {
      targetCardId: 'MAP',
      direction: 'right',
      type: 'kpi',
      kpiId: 'solar.annual_pv_generation_kwh',
      locatorArgs: { panel_type: 'mono' },
    });
    replaceKpiCard('launch', id, {
      kpiId: 'solar.annual_pv_generation_kwh',
      locatorArgs: { panel_type: 'mono' },
      displayUnit: 'GWh/yr',
    });
    const [card] = kpiCards();
    expect(card.displayUnit).toBe('GWh/yr');
    expect(card.locatorArgs).toEqual({ panel_type: 'mono' });
  });
});
