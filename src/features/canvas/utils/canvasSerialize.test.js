import { DEFAULT_CANVAS_TOGGLES } from '../stores/canvasStore';
import { deserializeCanvas, serializeCanvas } from './canvasSerialize';

const toggles = ({ mapsLinked, fixLayout, enableEdit, showKpiDeltas }) => ({
  mapsLinked,
  fixLayout,
  enableEdit,
  showKpiDeltas,
});

describe('canvas navigator toggles', () => {
  it('save and load with each canvas', () => {
    const changed = {
      mapsLinked: false,
      fixLayout: true,
      enableEdit: false,
      showKpiDeltas: true,
    };
    const saved = serializeCanvas({ view: 'launch', columns: [], ...changed });
    expect(toggles(deserializeCanvas(saved))).toEqual(changed);
  });

  it('load a canvas saved before Enable Edit and Show Deltas were saved', () => {
    const saved = serializeCanvas({
      view: 'launch',
      columns: [],
      ...DEFAULT_CANVAS_TOGGLES,
    });
    delete saved.canvas.enable_edit;
    delete saved.canvas.show_kpi_deltas;
    expect(toggles(deserializeCanvas(saved))).toEqual(DEFAULT_CANVAS_TOGGLES);
  });
});

describe('KPI card display unit', () => {
  const load = (cfg) => {
    const saved = serializeCanvas({
      view: 'launch',
      columns: [],
      ...DEFAULT_CANVAS_TOGGLES,
    });
    saved.feature_card = {
      cards: { c1: { type: 'kpi', kpi_id: 'solar.x', ...cfg } },
    };
    return deserializeCanvas(saved).launchCards[0];
  };

  it('moves a legacy locator_args.unit to displayUnit and strips it', () => {
    const card = load({
      locator_args: { unit: 'MWh/yr', panel_type: 'mono' },
    });
    expect(card.displayUnit).toBe('MWh/yr');
    expect(card.locatorArgs).toEqual({ panel_type: 'mono' });
  });

  it('leaves no locator args when unit was the only one', () => {
    const card = load({ locator_args: { unit: 'MW' } });
    expect(card.displayUnit).toBe('MW');
    expect(card.locatorArgs).toBeNull();
  });

  it('prefers a saved display_unit and round-trips it', () => {
    const card = load({ display_unit: 'GWh/yr', locator_args: null });
    expect(card.displayUnit).toBe('GWh/yr');
    expect(card.locatorArgs).toBeUndefined();

    const saved = serializeCanvas({
      view: 'launch',
      columns: [],
      launchCards: [card],
      ...DEFAULT_CANVAS_TOGGLES,
    });
    expect(saved.feature_card.cards.c1.display_unit).toBe('GWh/yr');
  });
});
