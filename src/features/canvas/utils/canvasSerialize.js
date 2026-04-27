/**
 * Convert the in-memory canvasStore state to the on-disk YAML
 * shape (and back).
 *
 * The store keeps cards as positional records:
 *   `{ id, type, row, col, w, h, feature, plots, category, layer }`
 * — `row/col` because that's what `react-grid-layout` consumes.
 *
 * The YAML splits this into two slices keyed by card id:
 *   layout.yml       → `{ cards: { id: { x, y, w, h } } }`
 *   feature_card.yml → `{ cards: { id: { type, feature, plots, … } } }`
 *
 * Splitting lets the autosave path flush a layout-only change
 * (drag/resize) without rewriting card configs, and lets the
 * zip-export pass round-trip the full state with no extra metadata.
 *
 * Either `cards` or `column_cards` is populated depending on the
 * canvas's view:
 *   - `launch` / `inter-scenario` / `inter-whatif` → `cards`
 *   - `inter-feature`                              → `column_cards`
 *
 * Launch view's `launchCards` slice maps to the same `cards` field
 * on disk (single shared grid). The view name carried in
 * `canvas.yml` tells the load path which store slice to populate
 * back into.
 */

const SCHEMA_VERSION = 1;

const cardLayoutFromStore = (card) => ({
  x: card.col ?? 0,
  y: card.row ?? 0,
  w: card.w ?? 1,
  h: card.h ?? 1,
});

const cardConfigFromStore = (card) => ({
  type: card.type,
  feature: card.feature ?? null,
  // The store names plot configs `plotConfig`; the YAML uses
  // snake_case `plot_config` to match the Pydantic schema.
  plots: (card.plots || []).map((p) => ({
    id: p.id,
    plot_config: p.plotConfig ?? {},
  })),
  category: card.category ?? null,
  layer: card.layer ?? null,
});

/**
 * Build the `{ canvas, layout, feature_card }` payload for a sparse
 * autosave PUT. Always returns the full bundle — the backend
 * accepts any subset, but we're not trying to track per-slice diffs
 * yet (cheaper to just resend everything for now).
 */
export function serializeCanvas(state) {
  const canvas = {
    schema_version: SCHEMA_VERSION,
    name: state.canvasName ?? null,
    view: state.view,
    project: state.project ?? null,
    parent_scenario: state.parentScenario ?? null,
    columns: (state.columns || []).map((c) => ({
      type: c.type,
      scenario: c.scenario ?? null,
      whatif: c.whatif ?? null,
      feature: c.feature ?? null,
    })),
    maps_linked: !!state.mapsLinked,
    fix_layout: !!state.fixLayout,
  };

  const layout = {
    schema_version: SCHEMA_VERSION,
    map_positions: [],
    cards: {},
    column_cards: {},
  };

  const featureCard = {
    schema_version: SCHEMA_VERSION,
    cards: {},
    column_cards: {},
  };

  if (state.view === 'inter-feature') {
    Object.entries(state.columnCards || {}).forEach(([idx, cards]) => {
      layout.column_cards[idx] = {};
      featureCard.column_cards[idx] = {};
      (cards || []).forEach((card) => {
        layout.column_cards[idx][card.id] = cardLayoutFromStore(card);
        featureCard.column_cards[idx][card.id] = cardConfigFromStore(card);
      });
    });
  } else {
    // Launch / inter-scenario / inter-whatif all share the same
    // single-grid shape on disk.
    const sourceCards =
      state.view === 'launch'
        ? state.launchCards || []
        : state.sharedCards || [];
    sourceCards.forEach((card) => {
      layout.cards[card.id] = cardLayoutFromStore(card);
      featureCard.cards[card.id] = cardConfigFromStore(card);
    });
  }

  return { canvas, layout, feature_card: featureCard };
}

/**
 * Hydrate the store from a `{ canvas, layout, feature_card }` bundle
 * received from the backend (Open / draft load paths). Returns the
 * partial state to merge in via `useCanvasStore.setState(…)`.
 */
export function deserializeCanvas({ canvas, layout, feature_card }) {
  const next = {
    view: canvas.view || 'launch',
    columns: (canvas.columns || []).map((c) => ({
      type: c.type,
      scenario: c.scenario ?? undefined,
      whatif: c.whatif ?? undefined,
      feature: c.feature ?? undefined,
    })),
    parentScenario: canvas.parent_scenario ?? null,
    mapsLinked: !!canvas.maps_linked,
    fixLayout: !!canvas.fix_layout,
    canvasName: canvas.name ?? null,
    launchCards: [],
    sharedCards: [],
    columnCards: {},
  };

  const buildCard = (id, layoutEntry, configEntry) => ({
    id,
    type: configEntry.type,
    row: layoutEntry?.y ?? 0,
    col: layoutEntry?.x ?? 0,
    w: layoutEntry?.w ?? 1,
    h: layoutEntry?.h ?? 1,
    feature: configEntry.feature ?? undefined,
    plots: (configEntry.plots || []).map((p) => ({
      id: p.id,
      plotConfig: p.plot_config ?? {},
    })),
    category: configEntry.category ?? undefined,
    layer: configEntry.layer ?? undefined,
  });

  if (next.view === 'inter-feature') {
    Object.entries(feature_card?.column_cards || {}).forEach(
      ([idx, configs]) => {
        const layoutForCol = (layout?.column_cards || {})[idx] || {};
        next.columnCards[idx] = Object.entries(configs).map(([id, cfg]) =>
          buildCard(id, layoutForCol[id], cfg),
        );
      },
    );
  } else {
    // Launch / inter-scenario / inter-whatif share the same single
    // grid on disk; route into `launchCards` vs `sharedCards`
    // based on the canvas's recorded view.
    const targetSlice =
      next.view === 'launch' ? next.launchCards : next.sharedCards;
    Object.entries(feature_card?.cards || {}).forEach(([id, cfg]) => {
      targetSlice.push(buildCard(id, (layout?.cards || {})[id], cfg));
    });
  }

  return next;
}
