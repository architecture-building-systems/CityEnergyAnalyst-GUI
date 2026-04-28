import { create } from 'zustand';

/**
 * Canvas Builder store.
 *
 * Views:
 *   'launch'          — entry point, single column
 *   'inter-scenario'  — columns = different scenarios, shared cards
 *   'inter-whatif'    — columns = what-if variants, shared cards
 *
 * Column shapes:
 *   { type: 'scenario', scenario }
 *   { type: 'whatif',   scenario, whatif }
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
const makeId = (prefix) => `${prefix}-${crypto.randomUUID().replace(/-/g, '')}`;

// Default card size in grid units. See CanvasColumn's <GridLayout>
// config for the pixel mapping. Map's default footprint
// (MAP_DEFAULT_W/H) lives in CanvasColumn and is mirrored below as
// MAP_ANCHOR_W/H — used to place new cards adjacent to the map.
export const DEFAULT_CARD_W = 6;
export const DEFAULT_CARD_H = 10;
export const MAP_ANCHOR_W = 6;
export const MAP_ANCHOR_H = 5;

// Initial primary-map tile position. Used both by the store's
// `mapPos` field at boot and by `startOver` to reset.
const DEFAULT_MAP_POS = { x: 0, y: 0, w: MAP_ANCHOR_W, h: MAP_ANCHOR_H };

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

  // Launch view's draft card grid. Single column, owned by the
  // store (rather than `LaunchView`'s local state) so the autosave
  // hook can persist a draft before the user has even decided what
  // comparison mode to enter. Promoted to `sharedCards` on
  // `enterInterScenario` / `enterInterWhatif`.
  launchCards: [],
  // Shared card grid for both comparison views — every column
  // (scenarios in inter-scenario, what-ifs in inter-whatif) renders
  // the same card list, one row per card.
  sharedCards: [],

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

  // ── Persistence ──────────────────────────────────────────────
  // Display name of the currently-open canvas — also the on-disk
  // folder under `<scenario>/outputs/canvas/<name>/`. Set when the
  // user opens a saved canvas (load), creates one via the
  // navigator's "Create new canvas" modal (POST /api/canvas/), or
  // imports a zip. `null` only in the empty entry state (between
  // a Start Over and the next create / open). The persistence
  // hook keys every debounced PUT off this name.
  canvasName: null,
  setCanvasName: (value) => set({ canvasName: value || null }),

  // Bumped every time external state lands in the store from
  // outside the user's editing flow (loading a saved canvas,
  // resuming on app start, importing a zip, creating a fresh
  // canvas). The autosave hook watches this counter so it can
  // resync its diff baseline *without* flushing the just-loaded
  // state back to the backend — otherwise opening a saved canvas
  // would immediately re-write it on top of itself.
  loadVersion: 0,

  // Autosave activity status. 'idle' = nothing happening (no
  // indicator shown); 'saving' = a PUT to the saved folder is in
  // flight (spinner); 'saved' = a flush just landed (brief check,
  // auto-reverts to 'idle' after ~1.5 s). Updated exclusively by
  // `useCanvasPersistence`; the navigator subscribes to drive the
  // status icon to the left of the dashboard switcher.
  autosaveStatus: 'idle',
  setAutosaveStatus: (value) => set({ autosaveStatus: value || 'idle' }),

  // Manual realignment counter. Bumped by the "Realign" button
  // next to the origin's `+` in compare mode. Mirror columns
  // (lockedReadOnly) include this in their card keys so a click
  // forces every mirror's react-grid-layout to rebuild from the
  // current `sharedCards.row` values — the workaround for rgl
  // not always re-syncing layout-prop positions on subsequent
  // renders. Origin's card keys are insensitive to this counter
  // so its plots survive the click without losing Plotly state.
  alignmentRevision: 0,
  bumpAlignmentRevision: () =>
    set((state) => ({ alignmentRevision: state.alignmentRevision + 1 })),

  // Primary map tile's position and size in grid units. Shared
  // across every column so origin's drag/resize of the map (e.g.
  // moving it below the feature cards) propagates to every
  // mirror. Lifted out of `CanvasColumn`'s local useState because
  // per-column state meant mirrors kept their map at (0, 0) while
  // origin's map was elsewhere — the layout never matched.
  mapPos: { ...DEFAULT_MAP_POS },
  setMapPos: (next) =>
    set((state) => {
      const cur = state.mapPos;
      if (
        next.x === cur.x &&
        next.y === cur.y &&
        next.w === cur.w &&
        next.h === cur.h
      ) {
        return {};
      }
      return { mapPos: next };
    }),

  // ── Compare mode ────────────────────────────────────────────
  // Saved Compare-mode picks. Decoupled from the live `view`
  // field so the user can "Stop comparing" (revert `view` to
  // `launch`) without losing their chosen scenarios / what-ifs.
  // Shape:
  //   { kind: 'inter-scenario', scenarios: [...] }
  //   { kind: 'inter-whatif',   parentScenario, whatifs: [...] }
  // `null` until the user first enters Compare mode for this
  // canvas. The CompareButton in the navigator reads this to
  // decide between "Compare" (no setup) and "Resume comparing"
  // (setup exists but view === 'launch').
  comparisonSetup: null,
  setComparisonSetup: (setup) => set({ comparisonSetup: setup || null }),

  /**
   * Replace the editable slice of state with a deserialised canvas
   * read from the backend. Pass the partial returned by
   * `deserializeCanvas`; this layer handles the load-version bump
   * so the persistence hook resyncs its snapshot baseline silently.
   */
  applyLoadedCanvas: (partial) =>
    set((state) => ({
      ...partial,
      loadVersion: state.loadVersion + 1,
    })),

  // ── View transitions ────────────────────────────────────────

  // The view-transition actions carry the user's launch-view draft
  // forward into the chosen comparison mode, so cards built on the
  // launch surface aren't lost when Compare is clicked. Both modes
  // share the same `sharedCards` list — one row per card, mirrored
  // across every column.
  //
  // ``scenarios`` is the *full* column list, origin-first (caller
  // is expected to put the project's active scenario at index 0).
  // The leftmost column is treated as the "origin" by convention;
  // editing affordances only appear there.
  //
  // Both helpers also persist the picks to ``comparisonSetup`` so
  // the user can later Stop comparing and Resume without losing
  // their selection.
  enterInterScenario: (scenarios) => {
    const columns = scenarios.map((s) => ({ type: 'scenario', scenario: s }));
    set((state) => ({
      view: 'inter-scenario',
      columns,
      parentScenario: null,
      sharedCards:
        state.view === 'launch' ? state.launchCards : state.sharedCards,
      launchCards: state.view === 'launch' ? [] : state.launchCards,
      comparisonSetup: {
        kind: 'inter-scenario',
        scenarios: scenarios.slice(1),
      },
    }));
  },

  enterInterWhatif: (parentScenario, whatifs) => {
    const columns = whatifs.map((w) => ({
      type: 'whatif',
      scenario: parentScenario,
      whatif: w,
    }));
    set((state) => ({
      view: 'inter-whatif',
      columns,
      parentScenario,
      sharedCards:
        state.view === 'launch' ? state.launchCards : state.sharedCards,
      launchCards: state.view === 'launch' ? [] : state.launchCards,
      comparisonSetup: {
        kind: 'inter-whatif',
        parentScenario,
        whatifs: whatifs.slice(1),
      },
    }));
  },

  /**
   * Re-enter the previously-saved Compare mode using the persisted
   * ``comparisonSetup``. The leftmost column is rebuilt from the
   * project's active scenario (passed by the caller via
   * ``activeScenario``); the remaining columns come from the saved
   * picks. No-op if there's no saved setup.
   */
  enterCompareMode: (activeScenario) => {
    const setup = get().comparisonSetup;
    if (!setup) return;
    if (setup.kind === 'inter-scenario') {
      const cols = [activeScenario, ...(setup.scenarios || [])];
      get().enterInterScenario(cols);
    } else if (setup.kind === 'inter-whatif') {
      const cols = [activeScenario, ...(setup.whatifs || [])];
      get().enterInterWhatif(setup.parentScenario || activeScenario, cols);
    }
  },

  /**
   * Revert ``view`` to ``launch`` while keeping ``comparisonSetup``
   * intact so the user can Resume later. Cards survive — the
   * shared list folds back into ``launchCards`` so the single
   * column shows the same content that was being mirrored.
   */
  stopCompareMode: () =>
    set((state) => ({
      view: 'launch',
      columns: [],
      parentScenario: null,
      launchCards: state.sharedCards,
      sharedCards: [],
    })),

  /**
   * Reset card / column / launch state to a fresh canvas — keeps
   * `canvasName` so the autosave hook flushes the empty state
   * back to the same on-disk folder. Also drops the saved
   * ``comparisonSetup`` since "Start Over" implies starting from
   * scratch including the comparison picks.
   */
  startOver: () =>
    set({
      view: 'launch',
      columns: [],
      parentScenario: null,
      launchCards: [],
      sharedCards: [],
      comparisonSetup: null,
      mapPos: { ...DEFAULT_MAP_POS },
    }),

  // ── Column management ───────────────────────────────────────

  addColumn: (column) => {
    const { columns } = get();
    const isDuplicate = columns.some((c) => {
      if (c.type !== column.type) return false;
      if (c.type === 'scenario') return c.scenario === column.scenario;
      if (c.type === 'whatif')
        return c.scenario === column.scenario && c.whatif === column.whatif;
      return false;
    });
    if (isDuplicate) return;
    set({ columns: [...columns, column] });
  },

  removeColumn: (index) => {
    const { columns } = get();
    const next = columns.filter((_, i) => i !== index);
    // When the last non-origin column is dropped (`columns` falls
    // to ≤ 1) there's nothing left to compare — fold back to
    // launch view so the user isn't stranded in a single-column
    // compare layout. Cards survive (`sharedCards` → `launchCards`)
    // and `comparisonSetup` stays intact so the `+` button can
    // re-enter with the previous picks pre-filled.
    if (next.length <= 1) {
      set((state) => ({
        view: 'launch',
        columns: [],
        parentScenario: null,
        launchCards: state.sharedCards,
        sharedCards: [],
      }));
      return;
    }
    set({ columns: next });
  },

  // ── Card helpers ────────────────────────────────────────────

  // Read the cards array for a given dispatch target. Two cases:
  //   `'launch'` → the launch view's draft cards
  //   anything else → the shared grid (mirrored across every
  //                   column in inter-scenario / inter-whatif)
  // The `columnIndex` parameter is preserved on every action so
  // callers don't have to know which slice they're targeting; the
  // dispatcher handles it.
  getCards: (columnIndex) => {
    const state = get();
    if (columnIndex === 'launch') return state.launchCards;
    return state.sharedCards;
  },

  setCards: (columnIndex, next) => {
    if (columnIndex === 'launch') {
      set({ launchCards: next });
    } else {
      set({ sharedCards: next });
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
   * Apply a batch of position/size updates emitted by
   * react-grid-layout's `onLayoutChange`. Each update is
   * `{ id, row?, col?, w?, h? }` — fields are sparse so the caller
   * can omit dimensions that compact-layout mode forces (e.g.
   * `col` and `w` are not user-controlled in compare mode and
   * shouldn't be overwritten on every drag). Cards not in the
   * batch are left alone.
   */
  applyCardLayouts: (columnIndex, updates) => {
    const { getCards, setCards } = get();
    const byId = new Map(updates.map((u) => [u.id, u]));
    const next = getCards(columnIndex).map((c) => {
      const u = byId.get(c.id);
      if (!u) return c;
      // Spread the update directly; `c.id` and `u.id` are equal,
      // so the spread is a no-op for the id field.
      return { ...c, ...u };
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
