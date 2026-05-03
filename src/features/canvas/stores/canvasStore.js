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

// Shallow object equality used to short-circuit no-op writes from
// `setCardMapLayerParameters` (the per-card store-sync effect re-
// emits the same parameters object on every render until the user
// changes a control).
const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is(a[k], b[k]));
};

// Default card size in grid units. See CanvasColumn's <GridLayout>
// config for the pixel mapping. Map's default footprint
// (MAP_DEFAULT_W/H) lives in CanvasColumn and is mirrored below as
// MAP_ANCHOR_W/H — used to place new cards adjacent to the map.
export const DEFAULT_CARD_W = 6;
export const DEFAULT_CARD_H = 10;
export const MAP_ANCHOR_W = 6;
export const MAP_ANCHOR_H = 5;

// Cap the undo history at 20 steps (oldest dropped on overflow).
// Sized to match what the user expects from a desktop editor —
// large enough to recover from a frantic drag-then-regret without
// pinning indefinite memory growth on long sessions.
const UNDO_STACK_LIMIT = 20;

// Slice that round-trips through `canvas.yml` / `layout.yml` /
// `feature_card.yml` and that the undo stack snapshots. Single
// source of truth — `useCanvasPersistence` imports it as
// `canvasPersistableSelector` to share the shape.
export const canvasPersistableSelector = (state) => ({
  view: state.view,
  parentScenario: state.parentScenario,
  columns: state.columns,
  launchCards: state.launchCards,
  columnCards: state.columnCards,
  mapsLinked: state.mapsLinked,
  fixLayout: state.fixLayout,
  mapPos: state.mapPos,
  comparisonSetup: state.comparisonSetup,
  pathwayView: state.pathwayView,
});

// Initial primary-map tile position. Used both by the store's
// `mapPos` field at boot and by `startOver` to reset.
const DEFAULT_MAP_POS = { x: 0, y: 0, w: MAP_ANCHOR_W, h: MAP_ANCHOR_H };

// Text cards take the standard card width (matches plot / map /
// kpi cards so the perimeter `+` lines up across types) but the
// shortest sensible default height — annotations are typically
// one or two lines. The user can drag down to a single row
// (`CanvasColumn` overrides `minH` for text cards) or up to fit
// longer copy.
const TEXT_CARD_DEFAULT_H = 2;

// Divider cards default to a thin rule across the standard card
// width when horizontal and a tall single-column rule when
// vertical. Settings live on `card.divider`.
const DEFAULT_DIVIDER_CONFIG = {
  orientation: 'horizontal',
  style: 'solid',
  thickness: 1,
  color: '#000000',
};

// Build the child-scenario path for a pathway state year. Mirrors
// the backend's ``InputLocator.get_state_in_time_scenario_folder``
// layout (``scenario/outputs/pathways/{name}/state_{year}``) so the
// frontend can hand a state-folder path to map / plot endpoints
// without an extra round-trip to resolve it.
const childStateScenarioPath = (parentScenario, pathwayName, year) => {
  if (!parentScenario || !pathwayName || year == null) return null;
  // Mixed separators — works for both POSIX and Windows scenarios
  // (backend joins with `os.path.join`, which normalises). The
  // frontend only stores the resolved path for downstream APIs that
  // expect a scenario path string; no path math happens here.
  const sep = parentScenario.includes('\\') ? '\\' : '/';
  return [parentScenario, 'outputs', 'pathways', pathwayName, `state_${year}`].join(
    sep,
  );
};

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
}) => {
  const cardType = type ?? 'plot';
  const isText = cardType === 'text';
  const isDivider = cardType === 'divider';
  return {
    id: makeId('card'),
    type: cardType,
    row,
    col,
    w: w ?? DEFAULT_CARD_W,
    h: h ?? (isText ? TEXT_CARD_DEFAULT_H : isDivider ? 1 : DEFAULT_CARD_H),
    feature,
    category,
    layer,
    plots: plotConfig != null ? [{ id: makeId('plot'), plotConfig }] : [],
    // Text cards carry their own per-column HTML (set via
    // `setCardText`); start empty so the placeholder is visible.
    html: isText ? '' : undefined,
    // Divider config is a small shared blob — orientation, style,
    // thickness, colour. Mutated by `setCardDividerConfig` which fans
    // out across columns: the divider is structural chrome, not
    // per-column content like the text card's `html`.
    divider: isDivider ? { ...DEFAULT_DIVIDER_CONFIG } : undefined,
  };
};

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
  // Optional override for compare-mode fan-out: every column
  // gets the SAME card id and plot identities at insert time so
  // the per-column dispatch can find the card across columns
  // by id later. Plot configs may diverge over time via
  // per-column edits.
  override = {},
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
  const card = makeCard({
    row,
    col,
    type,
    feature,
    plotConfig,
    category,
    layer,
  });
  // Apply override AFTER `makeCard` so the override's id / plots
  // win over the freshly-generated ones.
  if (override.id) card.id = override.id;
  if (override.plots) card.plots = override.plots;
  return [...shifted, card];
};

export const useCanvasStore = create((set, get) => ({
  // ── View state ──────────────────────────────────────────────
  view: 'launch',
  parentScenario: null,
  columns: [],

  // Launch view's draft card grid. Single column, owned by the
  // store (rather than `LaunchView`'s local state) so the autosave
  // hook can persist a draft before the user has even decided what
  // comparison mode to enter. Cloned into every entry of
  // `columnCards` when the user enters Compare mode.
  launchCards: [],
  // Per-column card grid for comparison views. Keyed by column
  // index as a string ("0", "1", …). Layout fields (row, col, w,
  // h) stay in sync across columns — `applyCardLayouts` fans out
  // any drag/resize so visual rows line up. Plot / category /
  // layer content is *per column*: editing a plot in column 1
  // doesn't propagate to column 0. Add / remove of a card row
  // also fans out so the row skeleton stays consistent.
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

  // Master switch for Pathway View — turns the canvas into a
  // pathway-comparison surface. Two derived modes (set up by the
  // upcoming `enterPathwaySingle` / `enterPathwayMulti` actions):
  //   * one selected pathway → columns are state years
  //     (`Y_2020`, `Y_2030`, …), each pointing at the child
  //     scenario `state_{year}` folder, with a spanning Emission
  //     Timeline strip above the columns.
  //   * multiple pathways → row-based layout, one row per pathway,
  //     each row holding a final-year title map plus an Emission
  //     Pathway plot, with the timescale aligned across rows.
  // Visibility-gated upstream by "active scenario has ≥1 fully-baked
  // pathway"; flipping the toggle while a non-pathway compare view
  // is active triggers a confirmation modal at the call site, then
  // re-enters via the relevant `enterPathway*` action.
  pathwayView: false,
  setPathwayView: (value) => set({ pathwayView: !!value }),

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

  // ── Undo ────────────────────────────────────────────────────
  // Snapshot stack capped at `UNDO_STACK_LIMIT`. Each entry is a
  // `canvasPersistableSelector`-shape snapshot, pushed by
  // `useCanvasPersistence` on every debounced edit-flush — so a
  // drag burst becomes a single undo step.
  //
  // `undoVersion` bumps on every undo apply. The persistence
  // subscriber watches it so the undone state still gets flushed
  // to disk but isn't re-pushed onto the stack.
  undoStack: [],
  undoVersion: 0,
  pushUndoSnapshot: (snapshot) =>
    set((state) => {
      const next = state.undoStack.concat([snapshot]);
      if (next.length > UNDO_STACK_LIMIT) next.shift();
      return { undoStack: next };
    }),
  undo: () =>
    set((state) => {
      if (!state.undoStack.length) return {};
      const last = state.undoStack[state.undoStack.length - 1];
      return {
        ...last,
        undoStack: state.undoStack.slice(0, -1),
        undoVersion: state.undoVersion + 1,
      };
    }),

  // Compare-mode mirror lock. When `true` (default) mirror columns
  // strip layout affordances and inherit origin's positions / sizes
  // / order via the layout fan-out in `applyCardLayouts`. When
  // `false` every column edits its own layout independently — the
  // fan-out is gated and drag/resize works on mirror cards / their
  // title maps. Structural edits (add/delete card, add/edit/delete
  // plot) and the title-map toolbar stay origin-only regardless, so
  // every column shares the same row skeleton and the same
  // singleton-driven map view. The Refresh button calls
  // `resyncMirrorsToOrigin` to copy origin's positions back into
  // every mirror — useful after a divergent unlock session.
  mirrorsLocked: true,
  setMirrorsLocked: (next) =>
    set((state) =>
      state.mirrorsLocked === next ? {} : { mirrorsLocked: next },
    ),

  // Copy origin column's per-card `row` / `col` / `w` / `h` into
  // every other column. Used by the Refresh button so mirror
  // layouts snap back to origin's even after the user drove them
  // apart with the lock off. No-op outside compare mode.
  resyncMirrorsToOrigin: () => {
    const state = get();
    const cols = state.columnCards || {};
    const origin = cols[0];
    if (!origin) return;
    const positionById = new Map(
      origin.map((c) => [c.id, { row: c.row, col: c.col, w: c.w, h: c.h }]),
    );
    const updated = {};
    Object.entries(cols).forEach(([idx, cards]) => {
      if (Number(idx) === 0) {
        updated[idx] = cards;
        return;
      }
      updated[idx] = cards.map((c) => {
        const pos = positionById.get(c.id);
        return pos ? { ...c, ...pos } : c;
      });
    });
    // Promote origin's effective map size to the singleton before
    // clearing overrides — origin may have resized its title map
    // while mirrors were unlocked (the resize landed in
    // `columnMapPos['0']`, not in `mapPos`), and the user expects
    // refresh to snap *every* column to origin's *current* size,
    // not the stale singleton from before the unlock session.
    const originMapPos = state.columnMapPos['0'] ?? state.mapPos;
    set({
      columnCards: updated,
      mapPos: originMapPos,
      columnMapPos: {},
      alignmentRevision: state.alignmentRevision + 1,
    });
  },

  // Counter the refresh button bumps to refit every column's
  // primary map back to its zone-bbox centre. Each `CanvasColumn`
  // watches it and resets its local `MapColumnContext.center` —
  // restores cross-geography compare mode after the user has
  // panned individual columns away from their home positions.
  columnRefitVersion: 0,
  bumpColumnRefitVersion: () =>
    set((state) => ({ columnRefitVersion: state.columnRefitVersion + 1 })),

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

  // Per-column override for the title-map tile size. When mirrors
  // are unlocked, each column writes its own resize here so the
  // singleton `mapPos` (origin's size) doesn't propagate. When
  // mirrors are locked again, the override is ignored — every
  // column reads `mapPos`. Refresh clears every override so the
  // row snaps back to origin's size.
  columnMapPos: {},
  setColumnMapPos: (columnIndex, next) =>
    set((state) => {
      const key = String(columnIndex);
      const cur = state.columnMapPos[key];
      if (
        cur &&
        next.x === cur.x &&
        next.y === cur.y &&
        next.w === cur.w &&
        next.h === cur.h
      ) {
        return {};
      }
      return { columnMapPos: { ...state.columnMapPos, [key]: next } };
    }),

  // Each column publishes the row allowance its own legend needs
  // (`columnLegendRows[columnKey] = rows`); every column then sizes
  // its title-map tile to the *max* across the row, so the column
  // with the tallest legend has zero (or near-zero, modulo grid
  // rounding) whitespace below its legend and shorter columns pad
  // up to the same tile bottom. Without the per-column map, mirrors
  // either overflowed (origin shorter) or carried excess whitespace
  // (origin tallest by far). Cleanup runs on column unmount so
  // stale entries from closed columns don't pin the tile tall.
  columnLegendRows: {},
  setColumnLegendRows: (columnKey, rows) =>
    set((state) => {
      const cur = state.columnLegendRows;
      if (rows == null) {
        if (!(columnKey in cur)) return {};
        const next = { ...cur };
        delete next[columnKey];
        return { columnLegendRows: next };
      }
      if (cur[columnKey] === rows) return {};
      return { columnLegendRows: { ...cur, [columnKey]: rows } };
    }),

  // ── Compare mode ────────────────────────────────────────────
  // Saved Compare-mode picks. Decoupled from the live `view`
  // field so the user can "Stop comparing" (revert `view` to
  // `launch`) without losing their chosen scenarios / what-ifs.
  // Shape:
  //   { kind: 'inter-scenario',  scenarios: [...] }
  //   { kind: 'inter-whatif',    parentScenario, whatifs: [...] }
  //   { kind: 'pathway-single',  pathwayName, stateYears: [...] }
  //   { kind: 'pathway-multi',   pathwayNames: [...] }
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
      // Drop history — undo across a canvas swap would jump
      // between unrelated documents.
      undoStack: [],
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
      // Seed every column with a clone of the source cards so the
      // initial config matches across columns. Per-column edits
      // diverge from there. Coming *from* a previous compare
      // mode, keep that mode's columnCards (the user's per-column
      // edits survive the kind-switch).
      columnCards:
        state.view === 'launch'
          ? cloneCardsAcrossColumns(state.launchCards, columns.length)
          : reshapeColumnCards(state.columnCards, columns.length),
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
      columnCards:
        state.view === 'launch'
          ? cloneCardsAcrossColumns(state.launchCards, columns.length)
          : reshapeColumnCards(state.columnCards, columns.length),
      launchCards: state.view === 'launch' ? [] : state.launchCards,
      comparisonSetup: {
        kind: 'inter-whatif',
        parentScenario,
        whatifs: whatifs.slice(1),
      },
    }));
  },

  /**
   * Enter Pathway View — single pathway. One column per state year of
   * the chosen pathway; each column points at a child scenario at
   * ``{parentScenario}/outputs/pathways/{pathwayName}/state_{year}``.
   * The column header renders ``Y_{year}`` instead of the scenario
   * name (see ``CanvasColumn``). Phase 5 will add a spanning Emission
   * Timeline strip above the columns; until then this is just an
   * inter-scenario-style compare with state folders.
   */
  enterPathwaySingle: (parentScenario, pathwayName, stateYears) => {
    const years = (stateYears || []).map((y) => Number(y)).sort((a, b) => a - b);
    const columns = years.map((year) => ({
      type: 'pathway-state',
      pathwayName,
      year,
      scenario: childStateScenarioPath(parentScenario, pathwayName, year),
    }));
    set((state) => ({
      view: 'pathway-single',
      columns,
      parentScenario,
      columnCards:
        state.view === 'launch'
          ? cloneCardsAcrossColumns(state.launchCards, columns.length)
          : reshapeColumnCards(state.columnCards, columns.length),
      launchCards: state.view === 'launch' ? [] : state.launchCards,
      comparisonSetup: {
        kind: 'pathway-single',
        pathwayName,
        stateYears: years,
        parentScenario,
      },
    }));
  },

  /**
   * Enter Pathway View — multi pathway. Row-based layout; one row per
   * pathway, each row pinned to the pathway's final-year state
   * scenario. The full row machinery (final-year title map + Emission
   * Pathway plot, shared timescale) lands in Phase 6 — for now the
   * action just records the picks and flips ``view``.
   */
  enterPathwayMulti: (parentScenario, pathwayNames) => {
    const columns = (pathwayNames || []).map((pathwayName) => ({
      type: 'pathway',
      pathwayName,
      scenario: parentScenario,
    }));
    set((state) => ({
      view: 'pathway-multi',
      columns,
      parentScenario,
      columnCards:
        state.view === 'launch'
          ? cloneCardsAcrossColumns(state.launchCards, columns.length)
          : reshapeColumnCards(state.columnCards, columns.length),
      launchCards: state.view === 'launch' ? [] : state.launchCards,
      comparisonSetup: {
        kind: 'pathway-multi',
        pathwayNames: [...(pathwayNames || [])],
        parentScenario,
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
      // Fold the origin column's cards back into launchCards
      // (column 0 is the origin in compare mode; other columns'
      // per-column edits are discarded — they only existed for
      // the comparison view). The user can re-enter compare via
      // the saved `comparisonSetup` and the same starting cards
      // will be cloned into each new column.
      launchCards: state.columnCards?.[0] || [],
      columnCards: {},
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
      columnCards: {},
      comparisonSetup: null,
      mapPos: { ...DEFAULT_MAP_POS },
      pathwayView: false,
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
    const { columns, columnCards } = get();
    const next = columns.filter((_, i) => i !== index);
    // When the last non-origin column is dropped (`columns` falls
    // to ≤ 1) there's nothing left to compare — fold back to
    // launch view so the user isn't stranded in a single-column
    // compare layout. Origin's cards survive as the new
    // `launchCards`; `comparisonSetup` stays intact so the `+`
    // button can re-enter with the previous picks pre-filled.
    if (next.length <= 1) {
      set({
        view: 'launch',
        columns: [],
        parentScenario: null,
        launchCards: columnCards?.[0] || [],
        columnCards: {},
      });
      return;
    }
    // Re-key the surviving columns so indices stay 0..n-1 (the
    // canvas columns array is positional, not name-keyed).
    const nextCards = {};
    next.forEach((_, newIdx) => {
      const oldIdx = newIdx >= index ? newIdx + 1 : newIdx;
      nextCards[newIdx] = columnCards[oldIdx] || [];
    });
    set({ columns: next, columnCards: nextCards });
  },

  // ── Card helpers ────────────────────────────────────────────

  // Read the cards array for a given dispatch target.
  //   `'launch'` → launch view's single draft list
  //   number     → comparison view's per-column list
  // Helpers for the per-column-cards model: row-level operations
  // (add / remove / applyCardLayouts) fan out across every
  // column; plot-level operations (add / update / remove plot)
  // touch only the target column.
  getCards: (columnIndex) => {
    const state = get();
    if (columnIndex === 'launch') return state.launchCards;
    return state.columnCards?.[columnIndex] || [];
  },

  setCards: (columnIndex, next) => {
    if (columnIndex === 'launch') {
      set({ launchCards: next });
    } else {
      set((state) => ({
        columnCards: { ...state.columnCards, [columnIndex]: next },
      }));
    }
  },

  // ── Card management ─────────────────────────────────────────

  /**
   * Add a new card. In launch view, appends to `launchCards`; in
   * compare view, fans out the *same* card (same id, same
   * content seed) into every column so the row skeleton stays
   * consistent across columns. The originating column is the one
   * whose `targetCardId` anchored the insert — its current cards
   * drive the position math; other columns get the card inserted
   * at the matching position keyed off the same `targetCardId`.
   */
  addCard: (
    columnIndex,
    { targetCardId, direction, type, feature, plotConfig, category, layer },
  ) => {
    const state = get();
    if (columnIndex === 'launch') {
      const cards = state.launchCards;
      const targetCard = resolveTargetCard(cards, targetCardId);
      const next = insertCardInto(cards, {
        targetCard,
        direction,
        type,
        feature,
        plotConfig,
        category,
        layer,
      });
      set({ launchCards: next });
      return next[next.length - 1].id;
    }
    // Compare mode: generate one id, build the card once, then
    // insert into every column at the matching anchor. Plot ids
    // are also generated once so each column starts with the
    // same plot identity (their plotConfigs can diverge later).
    const sharedId = makeId('card');
    const sharedPlots =
      plotConfig != null ? [{ id: makeId('plot'), plotConfig }] : [];
    const updatedColumnCards = {};
    Object.entries(state.columnCards || {}).forEach(([idx, cards]) => {
      const targetCard = resolveTargetCard(cards, targetCardId);
      updatedColumnCards[idx] = insertCardInto(
        cards,
        { targetCard, direction, type, feature, category, layer },
        // Force a stable id + pre-built plots across columns so
        // the per-column dispatch can find the card by id later.
        { id: sharedId, plots: sharedPlots },
      );
    });
    set({ columnCards: updatedColumnCards });
    return sharedId;
  },

  /**
   * Remove a card across every column (compare mode) or from
   * `launchCards` (launch view). Card row deletion is always a
   * row-level operation: per-column independence applies to plot
   * content, not to whether the row exists.
   */
  removeCard: (columnIndex, cardId) => {
    const state = get();
    if (columnIndex === 'launch') {
      set({
        launchCards: state.launchCards.filter((c) => c.id !== cardId),
      });
      return;
    }
    const updatedColumnCards = {};
    Object.entries(state.columnCards || {}).forEach(([idx, cards]) => {
      updatedColumnCards[idx] = cards.filter((c) => c.id !== cardId);
    });
    set({ columnCards: updatedColumnCards });
  },

  /**
   * Apply layout updates (row / col / w / h). In launch view,
   * targets `launchCards`. In compare view, fans out across every
   * column so the visual rows stay aligned even when the user
   * drags from one column. Sparse fields are spread-merged so
   * compact-mode (which omits `col`) doesn't clobber the stored
   * launch-view free-form positions.
   */
  applyCardLayouts: (columnIndex, updates) => {
    const state = get();
    const byId = new Map(updates.map((u) => [u.id, u]));
    // No-op guard: rgl fires `onLayoutChange` on mount and after
    // prop-driven re-renders with the *same* positions. Without
    // this dedup each such fire would write a fresh
    // `columnCards` reference, the autosave subscriber would log
    // it as an edit, and the user would need a second Cmd+Z to
    // revert one real change.
    let anyChanged = false;
    const merge = (cards) => {
      let changed = false;
      const next = cards.map((c) => {
        const u = byId.get(c.id);
        if (!u) return c;
        let same = true;
        for (const k in u) {
          if (k === 'id') continue;
          if (c[k] !== u[k]) {
            same = false;
            break;
          }
        }
        if (same) return c;
        changed = true;
        return { ...c, ...u };
      });
      if (changed) anyChanged = true;
      return changed ? next : cards;
    };
    if (columnIndex === 'launch') {
      const next = merge(state.launchCards);
      if (!anyChanged) return;
      set({ launchCards: next });
      return;
    }
    // When mirrors are unlocked, each column owns its own layout —
    // origin's drag/resize stays in column 0, mirrors' edits stay
    // in their column. When locked, fan out so every column tracks
    // origin's positions.
    if (state.mirrorsLocked === false) {
      const colCards = state.columnCards?.[columnIndex] || [];
      const nextCol = merge(colCards);
      if (!anyChanged) return;
      set({
        columnCards: { ...state.columnCards, [columnIndex]: nextCol },
      });
      return;
    }
    const updatedColumnCards = {};
    Object.entries(state.columnCards || {}).forEach(([idx, cards]) => {
      updatedColumnCards[idx] = merge(cards);
    });
    if (!anyChanged) return;
    set({ columnCards: updatedColumnCards });
  },

  // ── Plot management (inside a card) ─────────────────────────
  // - `addPlot` and `removePlot` are *row-level* in compare mode
  //   (fan out across every column) so the plot list stays
  //   aligned across columns.
  // - `updatePlot` is per-column — editing a plot's parameters
  //   in column 1 doesn't affect column 0's copy. That's where
  //   the per-column independence actually lives.

  addPlot: (columnIndex, cardId, plotConfig) => {
    const state = get();
    const isCompare = columnIndex !== 'launch';
    if (!isCompare) {
      const next = state.launchCards.map((c) =>
        c.id === cardId
          ? { ...c, plots: [...c.plots, { id: makeId('plot'), plotConfig }] }
          : c,
      );
      set({ launchCards: next });
      return;
    }
    // Compare mode: fan out the new plot across every column.
    // One shared plot id so per-column `updatePlot` can find the
    // matching plot across columns; one shared `plotConfig` seed
    // so each column starts with the same parameters (and may
    // diverge via per-column edits afterwards).
    const sharedPlotId = makeId('plot');
    const updated = {};
    Object.entries(state.columnCards || {}).forEach(([idx, cards]) => {
      updated[idx] = cards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              plots: [...c.plots, { id: sharedPlotId, plotConfig }],
            }
          : c,
      );
    });
    set({ columnCards: updated });
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

  /**
   * Persist a map-card's parameter selections (what-if-name,
   * carrier, …) onto the card so reload restores them. Per-column
   * by design — mirrors keep their own selections. Driven by
   * `FeatureCardMap`'s store-sync effect.
   */
  setCardMapLayerParameters: (columnIndex, cardId, mapLayerParameters) => {
    const { getCards, setCards } = get();
    const cards = getCards(columnIndex);
    const target = cards.find((c) => c.id === cardId);
    if (!target) return;
    if (shallowEqual(target.mapLayerParameters, mapLayerParameters)) return;
    const next = cards.map((c) =>
      c.id === cardId ? { ...c, mapLayerParameters } : c,
    );
    setCards(columnIndex, next);
  },

  /**
   * Persist a map-card's `filters` slice (radius / scale / range
   * sliders that deck.gl consumes directly, separate from the
   * fetch payload). Same per-column lifecycle as
   * `setCardMapLayerParameters`.
   */
  setCardFilters: (columnIndex, cardId, filters) => {
    const { getCards, setCards } = get();
    const cards = getCards(columnIndex);
    const target = cards.find((c) => c.id === cardId);
    if (!target) return;
    if (shallowEqual(target.filters, filters)) return;
    const next = cards.map((c) => (c.id === cardId ? { ...c, filters } : c));
    setCards(columnIndex, next);
  },

  /**
   * Persist a text card's HTML payload onto the card itself —
   * **per column only**. The text card row is mirrored across
   * columns (size + position via `applyCardLayouts`), but the
   * content is intentionally not fanned out so each column can
   * carry its own annotation. No store action ever copies `html`
   * between columns.
   */
  setCardText: (columnIndex, cardId, html) => {
    const { getCards, setCards } = get();
    const cards = getCards(columnIndex);
    const target = cards.find((c) => c.id === cardId);
    if (!target) return;
    if (target.html === html) return;
    const next = cards.map((c) => (c.id === cardId ? { ...c, html } : c));
    setCards(columnIndex, next);
  },

  /**
   * Update a divider card's config (orientation, style, thickness,
   * colour). Unlike `setCardText`, this **fans out** across every
   * column — the divider is shared structural chrome, not per-column
   * content. Pass a partial; the existing config is shallow-merged
   * in.
   *
   * When `orientation` flips, the card's `w` and `h` swap so the
   * card visually rotates instead of collapsing into the wrong
   * footprint (a 6 × 1 horizontal divider becomes 1 × 6 vertical).
   */
  setCardDividerConfig: (columnIndex, cardId, partial) => {
    const state = get();
    const isCompare = columnIndex !== 'launch';
    const sourceCards = isCompare
      ? state.columnCards?.[columnIndex] || []
      : state.launchCards;
    const target = sourceCards.find((c) => c.id === cardId);
    if (!target) return;
    const prevConfig = target.divider ?? DEFAULT_DIVIDER_CONFIG;
    const nextConfig = { ...prevConfig, ...partial };
    const flipping =
      partial.orientation && partial.orientation !== prevConfig.orientation;
    const apply = (cards) =>
      cards.map((c) => {
        if (c.id !== cardId) return c;
        const next = { ...c, divider: nextConfig };
        if (flipping) {
          next.w = c.h;
          next.h = c.w;
        }
        return next;
      });
    if (!isCompare) {
      set({ launchCards: apply(state.launchCards) });
      return;
    }
    const updated = {};
    Object.entries(state.columnCards || {}).forEach(([idx, cards]) => {
      updated[idx] = apply(cards);
    });
    set({ columnCards: updated });
  },

  removePlot: (columnIndex, cardId, plotId) => {
    const state = get();
    const isCompare = columnIndex !== 'launch';
    const updateOne = (cards) =>
      cards
        .map((c) => {
          if (c.id !== cardId) return c;
          return { ...c, plots: c.plots.filter((p) => p.id !== plotId) };
        })
        // Auto-clean empty cards in launch view only. In compare
        // mode the row skeleton is shared across columns, so the
        // empty-card auto-clean fires only when *every* column's
        // card ends up empty (handled below after the fan-out).
        .filter((c) => isCompare || c.plots.length > 0);
    if (!isCompare) {
      set({ launchCards: updateOne(state.launchCards) });
      return;
    }
    // Compare mode: fan out the deletion across every column so
    // the row stays in lock-step. Plot deletion is treated as a
    // row-level operation (just like card add / delete and
    // drag/resize); plot *editing* — `updatePlot` — remains
    // per-column.
    const updated = {};
    Object.entries(state.columnCards || {}).forEach(([idx, cards]) => {
      updated[idx] = updateOne(cards);
    });
    // If every column's card now has zero plots, drop the row
    // entirely from every column so an empty skeleton doesn't
    // linger.
    const allEmpty = Object.values(updated).every((cards) => {
      const c = cards.find((x) => x.id === cardId);
      return !c || c.plots.length === 0;
    });
    if (allEmpty) {
      Object.keys(updated).forEach((idx) => {
        updated[idx] = updated[idx].filter((c) => c.id !== cardId);
      });
    }
    set({ columnCards: updated });
  },
}));

// Resolve a `targetCardId` into either the literal `'MAP'`
// sentinel (for the map-tile edge `+`), the matching card object,
// or `null` (insert from a corner).
function resolveTargetCard(cards, targetCardId) {
  if (targetCardId === 'MAP') return 'MAP';
  if (!targetCardId) return null;
  return cards.find((c) => c.id === targetCardId) ?? null;
}

// Deep-clone the launch-view cards into N column entries. Each
// column gets its own card / plot identities so per-column edits
// stay isolated.
function cloneCardsAcrossColumns(launchCards, columnCount) {
  const out = {};
  for (let i = 0; i < columnCount; i++) {
    out[i] = (launchCards || []).map((card) => ({
      ...card,
      plots: (card.plots || []).map((plot) => ({
        id: plot.id,
        plotConfig: { ...plot.plotConfig },
      })),
    }));
  }
  return out;
}

// When transitioning between compare modes (e.g. inter-scenario →
// inter-whatif via a Compare-modal re-pick) the new column count
// may differ. Pad short with clones of column 0; truncate long.
function reshapeColumnCards(prev, columnCount) {
  const next = {};
  const seed = prev?.[0] || [];
  for (let i = 0; i < columnCount; i++) {
    if (prev?.[i]) {
      next[i] = prev[i];
    } else {
      next[i] = seed.map((card) => ({
        ...card,
        plots: (card.plots || []).map((plot) => ({
          id: plot.id,
          plotConfig: { ...plot.plotConfig },
        })),
      }));
    }
  }
  return next;
}
