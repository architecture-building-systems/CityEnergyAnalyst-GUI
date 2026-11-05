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
