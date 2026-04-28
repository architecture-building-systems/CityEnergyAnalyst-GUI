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
 * The view name carried in `canvas.yml` tells the load path which
 * store slice to populate back into:
 *   - `launch` → `launchCards`
 *   - `inter-scenario` / `inter-whatif` → `sharedCards`
 * Both populate the same single `cards` map on disk.
 */

import { MAP_ANCHOR_W, MAP_ANCHOR_H } from '../stores/canvasStore';

const SCHEMA_VERSION = 1;
const DEFAULT_MAP_POS = { x: 0, y: 0, w: MAP_ANCHOR_W, h: MAP_ANCHOR_H };

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
  // Persisted high-water mark of the plot's reported pixel height
  // (`onPreferredHeight`). Carried so reload doesn't re-fire the
  // initial auto-grow against a user who has manually shrunk the
  // card. Stays absent on cards that have never reported.
  max_reported_height_px: card.maxReportedHeightPx ?? null,
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
    })),
    maps_linked: !!state.mapsLinked,
    fix_layout: !!state.fixLayout,
    // Persisted Compare-mode picks; survives Stop-comparing so
    // Resume can re-enter without re-picking. snake_case mirrors
    // the Pydantic field name on `CanvasMeta`.
    comparison_setup: state.comparisonSetup
      ? {
          kind: state.comparisonSetup.kind,
          scenarios: state.comparisonSetup.scenarios ?? null,
          whatifs: state.comparisonSetup.whatifs ?? null,
          parent_scenario: state.comparisonSetup.parentScenario ?? null,
        }
      : null,
  };

  // Persist the shared `mapPos` as a single-entry list (every
  // column mirrors the same primary-map tile position now). Old
  // canvases without a stored mapPos fall back to defaults on
  // load.
  const layout = {
    schema_version: SCHEMA_VERSION,
    map_positions: state.mapPos
      ? [
          {
            x: state.mapPos.x ?? 0,
            y: state.mapPos.y ?? 0,
            w: state.mapPos.w ?? 1,
            h: state.mapPos.h ?? 1,
          },
        ]
      : [],
    cards: {},
  };

  const featureCard = {
    schema_version: SCHEMA_VERSION,
    cards: {},
  };

  // Single-grid shape on disk for every view: launch sources from
  // `launchCards`, comparison views source from `sharedCards`.
  const sourceCards =
    state.view === 'launch' ? state.launchCards || [] : state.sharedCards || [];
  sourceCards.forEach((card) => {
    layout.cards[card.id] = cardLayoutFromStore(card);
    featureCard.cards[card.id] = cardConfigFromStore(card);
  });

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
    })),
    parentScenario: canvas.parent_scenario ?? null,
    mapsLinked: !!canvas.maps_linked,
    fixLayout: !!canvas.fix_layout,
    canvasName: canvas.name ?? null,
    comparisonSetup: canvas.comparison_setup
      ? {
          kind: canvas.comparison_setup.kind,
          scenarios: canvas.comparison_setup.scenarios ?? null,
          whatifs: canvas.comparison_setup.whatifs ?? null,
          parentScenario: canvas.comparison_setup.parent_scenario ?? null,
        }
      : null,
    launchCards: [],
    sharedCards: [],
    // Restore the shared primary-map tile position. First entry of
    // `map_positions` only — all columns share it now. Falls back
    // to anchor defaults when the field is missing or empty.
    mapPos: layout?.map_positions?.[0]
      ? {
          x: layout.map_positions[0].x ?? DEFAULT_MAP_POS.x,
          y: layout.map_positions[0].y ?? DEFAULT_MAP_POS.y,
          w: layout.map_positions[0].w ?? DEFAULT_MAP_POS.w,
          h: layout.map_positions[0].h ?? DEFAULT_MAP_POS.h,
        }
      : { ...DEFAULT_MAP_POS },
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
    maxReportedHeightPx: configEntry.max_reported_height_px ?? undefined,
  });

  const targetSlice =
    next.view === 'launch' ? next.launchCards : next.sharedCards;
  Object.entries(feature_card?.cards || {}).forEach(([id, cfg]) => {
    targetSlice.push(buildCard(id, (layout?.cards || {})[id], cfg));
  });

  return next;
}
