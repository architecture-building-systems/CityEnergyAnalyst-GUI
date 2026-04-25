import { create } from 'zustand';

/**
 * Reports Mode store.
 *
 * Views:
 *   'launch'          — entry point, single column + 3 action buttons
 *   'inter-scenario'  — columns = different scenarios, shared cards
 *   'inter-whatif'    — columns = what-if variants, shared cards
 *   'inter-feature'   — columns = different feature result sets, per-column cards
 *
 * Column shapes:
 *   { type: 'scenario', scenario }
 *   { type: 'whatif',   scenario, whatif }
 *   { type: 'feature',  scenario, feature }
 *
 * Cards are first-class:
 *   { id, type, row, col, w, h, feature, plots: [{ id, plotConfig }] }
 *
 * `type` ('plot' | 'kpi' | 'map') selects which FeatureCard variant
 * renders the card. `plots[]` is only meaningful for 'plot' cards.
 *
 * Card positions form a sparse 2D grid (sized in `react-grid-layout`
 * units; see `ReportColumn`). `addCard({ direction })` shifts existing
 * cards so the new card lands immediately next to its anchor.
 */

let nextId = 1;
const makeId = (prefix) => `${prefix}-${nextId++}`;

// Default card size in grid units. See ReportColumn's <GridLayout>
// config for the pixel mapping. Map's default footprint
// (MAP_DEFAULT_W/H) lives in ReportColumn and is mirrored below as
// MAP_ANCHOR_W/H — used to place new cards adjacent to the map.
export const DEFAULT_CARD_W = 6;
export const DEFAULT_CARD_H = 10;
export const MAP_ANCHOR_W = 6;
export const MAP_ANCHOR_H = 5;

const makeCard = ({ row, col, feature, plotConfig, w, h, type }) => ({
  id: makeId('card'),
  type: type ?? 'plot',
  row,
  col,
  w: w ?? DEFAULT_CARD_W,
  h: h ?? DEFAULT_CARD_H,
  feature,
  plots: plotConfig != null ? [{ id: makeId('plot'), plotConfig }] : [],
});

// Shift cards along the affected row ('right') or column ('bottom') by
// +1 to open space at (row, col). `direction === null` is a no-op.
const shiftForInsert = (cards, { row, col, direction }) => {
  if (direction === 'right') {
    return cards.map((c) =>
      c.row === row && c.col >= col ? { ...c, col: c.col + 1 } : c,
    );
  }
  if (direction === 'bottom') {
    return cards.map((c) =>
      c.col === col && c.row >= row ? { ...c, row: c.row + 1 } : c,
    );
  }
  return cards;
};

// `targetCard === 'MAP'` is the sentinel from the map tile's edge `+`
// buttons: right → just past the map, bottom → just below it. Any
// other truthy `targetCard` is an actual card to anchor against.
const insertCardInto = (
  cards,
  { targetCard, direction, type, feature, plotConfig },
) => {
  let row = 0;
  let col = 0;
  if (targetCard === 'MAP') {
    if (direction === 'bottom') {
      row = MAP_ANCHOR_H;
    } else {
      col = MAP_ANCHOR_W;
    }
  } else if (targetCard) {
    if (direction === 'right') {
      row = targetCard.row;
      col = targetCard.col + 1;
    } else if (direction === 'bottom') {
      row = targetCard.row + 1;
      col = targetCard.col;
    }
  }
  const shifted = shiftForInsert(cards, { row, col, direction });
  return [...shifted, makeCard({ row, col, type, feature, plotConfig })];
};

export const useReportsStore = create((set, get) => ({
  // ── View state ──────────────────────────────────────────────
  view: 'launch',
  parentScenario: null,
  columns: [],

  // Shared card grid (inter-scenario / inter-whatif).
  sharedCards: [],
  // Per-column card grids keyed by column index (inter-feature).
  columnCards: {},

  // ── View transitions ────────────────────────────────────────

  enterInterScenario: (scenarios) => {
    const columns = scenarios.map((s) => ({ type: 'scenario', scenario: s }));
    set({
      view: 'inter-scenario',
      columns,
      parentScenario: null,
      sharedCards: [],
      columnCards: {},
    });
  },

  enterInterWhatif: (parentScenario, whatifs) => {
    const columns = whatifs.map((w) => ({
      type: 'whatif',
      scenario: parentScenario,
      whatif: w,
    }));
    set({
      view: 'inter-whatif',
      columns,
      parentScenario,
      sharedCards: [],
      columnCards: {},
    });
  },

  enterInterFeature: (featureColumns) => {
    const columns = featureColumns.map((fc) => ({
      type: 'feature',
      scenario: fc.scenario,
      feature: fc.feature,
    }));
    const columnCards = {};
    featureColumns.forEach((_, i) => {
      columnCards[i] = [];
    });
    set({
      view: 'inter-feature',
      columns,
      parentScenario: null,
      sharedCards: [],
      columnCards,
    });
  },

  startOver: () =>
    set({
      view: 'launch',
      columns: [],
      parentScenario: null,
      sharedCards: [],
      columnCards: {},
    }),

  // ── Column management ───────────────────────────────────────

  addColumn: (column) => {
    const { columns, view, columnCards } = get();
    const isDuplicate = columns.some((c) => {
      if (c.type !== column.type) return false;
      if (c.type === 'scenario') return c.scenario === column.scenario;
      if (c.type === 'whatif')
        return c.scenario === column.scenario && c.whatif === column.whatif;
      if (c.type === 'feature')
        return c.scenario === column.scenario && c.feature === column.feature;
      return false;
    });
    if (isDuplicate) return;

    const newColumns = [...columns, column];
    const updates = { columns: newColumns };
    if (view === 'inter-feature' && column.type === 'feature') {
      const newIndex = newColumns.length - 1;
      updates.columnCards = { ...columnCards, [newIndex]: [] };
    }
    set(updates);
  },

  removeColumn: (index) => {
    const { columns, columnCards } = get();
    const newColumns = columns.filter((_, i) => i !== index);
    const newColumnCards = {};
    Object.keys(columnCards).forEach((key) => {
      const k = Number(key);
      if (k < index) newColumnCards[k] = columnCards[k];
      else if (k > index) newColumnCards[k - 1] = columnCards[k];
    });
    set({ columns: newColumns, columnCards: newColumnCards });
  },

  // ── Card helpers ────────────────────────────────────────────

  // Read the cards array for a given column (null for shared).
  getCards: (columnIndex) => {
    const state = get();
    return columnIndex == null
      ? state.sharedCards
      : state.columnCards[columnIndex] || [];
  },

  setCards: (columnIndex, next) => {
    if (columnIndex == null) {
      set({ sharedCards: next });
    } else {
      const { columnCards } = get();
      set({ columnCards: { ...columnCards, [columnIndex]: next } });
    }
  },

  // ── Card management ─────────────────────────────────────────

  /**
   * Add a new card to the grid.
   * @param {number|null} columnIndex — null for shared modes
   * @param {object} opts
   * @param {string|null} opts.targetCardId — anchor card for `direction`
   * @param {'right'|'bottom'|null} opts.direction
   * @param {'plot'|'kpi'|'map'} [opts.type='plot']
   * @param {string} opts.feature
   * @param {object|null} opts.plotConfig — if provided, seeds first plot
   * @returns {string} the new card's id
   */
  addCard: (
    columnIndex,
    { targetCardId, direction, type, feature, plotConfig },
  ) => {
    const { getCards, setCards } = get();
    const cards = getCards(columnIndex);
    // Pass the 'MAP' sentinel straight through — it's not a card ID,
    // so `cards.find` would return nothing and the target would
    // collapse to null. `insertCardInto` interprets the sentinel
    // itself to decide the slot adjacent to the map.
    const targetCard =
      targetCardId === 'MAP'
        ? 'MAP'
        : targetCardId
          ? cards.find((c) => c.id === targetCardId)
          : null;
    const next = insertCardInto(cards, {
      targetCard,
      direction,
      type,
      feature,
      plotConfig,
    });
    setCards(columnIndex, next);
    return next[next.length - 1].id;
  },

  removeCard: (columnIndex, cardId) => {
    const { getCards, setCards } = get();
    setCards(
      columnIndex,
      getCards(columnIndex).filter((c) => c.id !== cardId),
    );
  },

  /**
   * Apply a batch of {id, row, col, w, h} updates emitted by
   * react-grid-layout's `onLayoutChange`. Cards not in the batch are
   * left alone. Used to persist user-driven drag + resize.
   */
  applyCardLayouts: (columnIndex, updates) => {
    const { getCards, setCards } = get();
    const byId = new Map(updates.map((u) => [u.id, u]));
    const next = getCards(columnIndex).map((c) => {
      const u = byId.get(c.id);
      return u ? { ...c, row: u.row, col: u.col, w: u.w, h: u.h } : c;
    });
    setCards(columnIndex, next);
  },

  // ── Plot management (inside a card) ─────────────────────────

  addPlot: (columnIndex, cardId, plotConfig) => {
    const { getCards, setCards } = get();
    const next = getCards(columnIndex).map((c) =>
      c.id === cardId
        ? {
            ...c,
            plots: [...c.plots, { id: makeId('plot'), plotConfig }],
          }
        : c,
    );
    setCards(columnIndex, next);
  },

  updatePlot: (columnIndex, cardId, plotId, plotConfig) => {
    const { getCards, setCards } = get();
    const next = getCards(columnIndex).map((c) =>
      c.id === cardId
        ? {
            ...c,
            plots: c.plots.map((p) =>
              p.id === plotId ? { ...p, plotConfig } : p,
            ),
          }
        : c,
    );
    setCards(columnIndex, next);
  },

  removePlot: (columnIndex, cardId, plotId) => {
    const { getCards, setCards } = get();
    const next = getCards(columnIndex)
      .map((c) => {
        if (c.id !== cardId) return c;
        return { ...c, plots: c.plots.filter((p) => p.id !== plotId) };
      })
      // Drop the card entirely if it ends up empty — keeps the grid tidy.
      .filter((c) => c.plots.length > 0);
    setCards(columnIndex, next);
  },
}));
