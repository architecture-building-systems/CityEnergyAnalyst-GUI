import { create } from 'zustand';

/**
 * Canvas Builder store.
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
 *   { id, type, row, col, w, h,
 *     feature?, plots?:[{ id, plotConfig }],   // type='plot'/'kpi'
 *     category?, layer? }                      // type='map'
 *
 * `type` ('plot' | 'kpi' | 'map') selects which FeatureCard variant
 * renders the card. Body fields are populated based on type.
 *
 * Card positions form a sparse 2D grid (sized in `react-grid-layout`
 * units; see `CanvasColumn`). `addCard({ direction })` shifts existing
 * cards so the new card lands immediately next to its anchor.
 */

// Globally-unique ID generator. Uses `crypto.randomUUID()` (the
// browser's UUID4 implementation) and strips the hyphens to mirror
// the backend's `uuid.uuid4().hex` shape — same convention used
// for job / project / dashboard rows server-side. Collision-safe
// across users + sessions, so cards persisted later can keep the
// same id without further migration.
const makeId = (prefix) =>
  `${prefix}-${crypto.randomUUID().replace(/-/g, '')}`;

// Default card size in grid units. See CanvasColumn's <GridLayout>
// config for the pixel mapping. Map's default footprint
// (MAP_DEFAULT_W/H) lives in CanvasColumn and is mirrored below as
// MAP_ANCHOR_W/H — used to place new cards adjacent to the map.
export const DEFAULT_CARD_W = 6;
export const DEFAULT_CARD_H = 10;
export const MAP_ANCHOR_W = 6;
export const MAP_ANCHOR_H = 5;

const makeCard = ({
  row,
  col,
  feature,
  plotConfig,
  w,
  h,
  type,
  category,
  layer,
}) => ({
  id: makeId('card'),
  type: type ?? 'plot',
  row,
  col,
  w: w ?? DEFAULT_CARD_W,
  h: h ?? DEFAULT_CARD_H,
  feature,
  category,
  layer,
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
  { targetCard, direction, type, feature, plotConfig, category, layer },
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
    // Place the new card just past the target's right or bottom
    // edge using the target's actual width / height. A naive `+ 1`
    // landed inside the target's footprint (cards default to
    // `DEFAULT_CARD_W: 6 / DEFAULT_CARD_H: 10`), and rgl's
    // collision resolution then shoved the new card down to the
    // next free row — making every right-insert silently turn
    // into a bottom-insert.
    if (direction === 'right') {
      row = targetCard.row;
      col = targetCard.col + targetCard.w;
    } else if (direction === 'bottom') {
      row = targetCard.row + targetCard.h;
      col = targetCard.col;
    }
  }
  const shifted = shiftForInsert(cards, { row, col, direction });
  return [
    ...shifted,
    makeCard({ row, col, type, feature, plotConfig, category, layer }),
  ];
};

export const useCanvasStore = create((set, get) => ({
  // ── View state ──────────────────────────────────────────────
  view: 'launch',
  parentScenario: null,
  columns: [],

  // Shared card grid (inter-scenario / inter-whatif).
  sharedCards: [],
  // Per-column card grids keyed by column index (inter-feature).
  columnCards: {},

  // When `true`, every Map card mirrors the column's primary map
  // (camera, layer toggles, colour mode, etc.) and the FeatureCardMap
  // toolbars are hidden — only the primary tile drives the view.
  // When `false`, each card is free to set its own view state and
  // shows its own toolbar. Defaults to `true` to match the behaviour
  // before this toggle existed.
  mapsLinked: true,
  setMapsLinked: (value) => set({ mapsLinked: !!value }),

  // Master editing-affordance switch. When `true` (the default),
  // every Edit / Delete button, perimeter `+`, "Add a plot" pill,
  // map toolbar, range / scale / radius legend control is visible
  // — Canvas Builder behaves as a fully editable surface. When
  // `false`, all of those vanish and only the display content
  // (maps, plots, KPIs, legends, titles) remains; used to capture
  // a clean snapshot. Layout drag/resize is *not* affected by
  // this flag — that lives under `fixLayout` so users can lock
  // positions without giving up editing controls.
  enableEdit: true,
  setEnableEdit: (value) => set({ enableEdit: !!value }),

  // Layout lock. When `true`, every tile's drag handle + resize
  // affordance is suppressed and react-grid-layout's
  // `isDraggable / isResizable` flip off — the grid is frozen but
  // editing controls (Edit / Delete buttons, perimeter `+`,
  // Add-a-plot pill, map toolbars, legends) all stay visible
  // unless `enableEdit` is also off.
  fixLayout: false,
  setFixLayout: (value) => set({ fixLayout: !!value }),

  // ── Persistence (Phase 3 wiring) ────────────────────────────
  // `autoSave` ON (default) flushes every change to a backend temp
  // folder via `useCanvasPersistence`. OFF leaves the in-memory
  // state alone until the user hits Save explicitly. The toggle
  // sits next to Sync Maps / Fix Layout / Enable Edit on the
  // navigator.
  autoSave: true,
  setAutoSave: (value) => set({ autoSave: !!value }),

  // Backend handle for the live in-progress canvas. Allocated
  // server-side on the first autosave (`POST /api/canvas/temp`)
  // and used as the path target for every subsequent debounced
  // `PUT /api/canvas/temp/<uuid>`. `null` until the first edit
  // creates one.
  tempUuid: null,
  setTempUuid: (value) => set({ tempUuid: value || null }),

  // Display name of the currently-open canvas. `null` for an
  // untitled draft; set when the user opens a saved canvas or
  // commits a draft via Save. The `(canvasName, tempUuid)` pair
  // describes every legal state:
  //   (null, null) — fresh, nothing edited yet
  //   (null,  X )  — untitled draft being edited
  //   ( A , null)  — viewing saved canvas A (clean)
  //   ( A ,  X )   — dirty edit of saved canvas A
  // The backend's canvas.yml records the parent saved name itself
  // (`parent_canvas_name`), so the frontend doesn't track it.
  canvasName: null,
  setCanvasName: (value) => set({ canvasName: value || null }),

  // Wall-clock timestamp (ms) of the last successful autosave
  // flush. Drives the navigator's "Saved · Xm ago" indicator.
  lastSavedAt: null,
  setLastSavedAt: (value) => set({ lastSavedAt: value || null }),

  /**
   * Mark a successful Save: clear the live temp handle, adopt the
   * sanitised name returned by the backend, and stamp lastSavedAt.
   * The next persistable edit will then create a fresh temp seeded
   * from this saved canvas.
   */
  markSaved: (name) =>
    set({
      canvasName: name,
      tempUuid: null,
      lastSavedAt: Date.now(),
    }),

  // Bumped every time external state lands in the store from
  // outside the user's editing flow (loading a saved canvas,
  // resuming a draft on app start, importing a zip). The autosave
  // hook watches this counter so it can resync its diff baseline
  // *without* flushing the just-loaded state back to the backend
  // — otherwise opening a saved canvas would immediately create a
  // temp draft of itself.
  loadVersion: 0,

  /**
   * Replace the editable slice of state with a deserialised canvas
   * read from the backend. Pass the partial returned by
   * `deserializeCanvas`; this layer handles the bookkeeping
   * (clearing temp/timestamp, bumping `loadVersion`, leaving
   * navigator toggles like `autoSave` alone).
   */
  applyLoadedCanvas: (partial) =>
    set((state) => ({
      ...partial,
      tempUuid: null,
      lastSavedAt: null,
      loadVersion: state.loadVersion + 1,
    })),

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

  // `launchResetTick` bumps every time `startOver` runs so the
  // `LaunchView` (which keeps its draft cards in local `useState`)
  // can reset by re-mounting on this key. The store can't reach
  // into LaunchView's local state directly, and putting launch
  // cards in the store would create a second source of truth that
  // comparison views never read.
  launchResetTick: 0,
  startOver: () =>
    set((state) => ({
      view: 'launch',
      columns: [],
      parentScenario: null,
      sharedCards: [],
      columnCards: {},
      // Persistence state belongs to the discarded canvas; drop it
      // so Start Over leaves no dangling references. The associated
      // temp folder cleanup (`DELETE /api/canvas/temp/<uuid>`) is
      // an API call the navigator's handler runs *before* this so
      // the deletion can be awaited / surfaced on failure.
      tempUuid: null,
      canvasName: null,
      lastSavedAt: null,
      launchResetTick: state.launchResetTick + 1,
    })),

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
    { targetCardId, direction, type, feature, plotConfig, category, layer },
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
      category,
      layer,
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
