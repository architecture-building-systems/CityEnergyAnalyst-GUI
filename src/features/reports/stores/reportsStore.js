import { create } from 'zustand';

/**
 * Reports Mode store.
 *
 * Views:
 *   'launch'          — entry point, single column + 3 action buttons
 *   'inter-scenario'  — columns = different scenarios, shared cards
 *   'inter-whatif'    — columns = what-if variants under one parent scenario, shared cards
 *   'inter-feature'   — columns = different feature result sets, independent cards
 *
 * Column shapes:
 *   Inter-scenario: { type: 'scenario', scenario: string }
 *   Inter-whatif:   { type: 'whatif',   scenario: string, whatif: string }
 *   Inter-feature:  { type: 'feature',  scenario: string, feature: string }
 *
 * Cards are first-class:
 *   { id, row, col, feature, plots: [{ id, plotConfig }] }
 *
 * `sharedCards`  — used by inter-scenario and inter-whatif (every column
 *                  renders the same grid of cards).
 * `columnCards`  — used by inter-feature (one grid per column index).
 *
 * Card positions form a 2D grid inside a column. `row` / `col` are
 * 0-indexed, sparse (not every row/col needs a card). Card insertion
 * with `direction: 'right' | 'bottom'` shifts existing cards to make
 * room so the new card lands immediately next to its neighbour.
 */

let nextId = 1;
const makeId = (prefix) => `${prefix}-${nextId++}`;

const makeCard = ({ row, col, feature, plotConfig }) => ({
  id: makeId('card'),
  row,
  col,
  feature,
  plots:
    plotConfig != null
      ? [{ id: makeId('plot'), plotConfig }]
      : [],
});

// Shift any card in `cards` whose row/col matches the shift rule by +1.
// `direction === 'right'` shifts along the same row; 'bottom' shifts
// along the same column. A null direction means no shift (append).
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

// Generic add-card: handles shared (columnIndex === null) and per-column.
const insertCardInto = (cards, { targetCard, direction, feature, plotConfig }) => {
  let row = 0;
  let col = 0;
  if (targetCard) {
    if (direction === 'right') {
      row = targetCard.row;
      col = targetCard.col + 1;
    } else if (direction === 'bottom') {
      row = targetCard.row + 1;
      col = targetCard.col;
    }
  }
  const shifted = shiftForInsert(cards, { row, col, direction });
  return [...shifted, makeCard({ row, col, feature, plotConfig })];
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
   * @param {string} opts.feature
   * @param {object|null} opts.plotConfig — if provided, seeds first plot
   * @returns {string} the new card's id
   */
  addCard: (columnIndex, { targetCardId, direction, feature, plotConfig }) => {
    const { getCards, setCards } = get();
    const cards = getCards(columnIndex);
    const targetCard = targetCardId
      ? cards.find((c) => c.id === targetCardId)
      : null;
    const next = insertCardInto(cards, {
      targetCard,
      direction,
      feature,
      plotConfig,
    });
    setCards(columnIndex, next);
    return next[next.length - 1].id;
  },

  removeCard: (columnIndex, cardId) => {
    const { getCards, setCards } = get();
    setCards(columnIndex, getCards(columnIndex).filter((c) => c.id !== cardId));
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
