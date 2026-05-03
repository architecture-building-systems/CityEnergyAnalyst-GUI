/**
 * Convert the in-memory canvasStore state to the on-disk YAML
 * shape (and back).
 *
 * The store keeps cards as positional records:
 *   `{ id, type, row, col, w, h, feature, plots, category, layer }`
 * — `row/col` because that's what `react-grid-layout` consumes.
 *
 * The YAML splits this into two slices:
 *   layout.yml       → `{ cards: { id: { x, y, w, h } } }`
 *                      (single shared map across columns; layout
 *                      stays in lock-step in compare mode)
 *   feature_card.yml → either `{ cards: ... }` (launch view) or
 *                      `{ column_cards: { 0: ..., 1: ... } }`
 *                      (compare views — per-column plot content)
 *
 * The view name carried in `canvas.yml` tells the load path which
 * shape to emit / read.
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
  // Map-card parameter selections (what-if-name, carrier, …).
  // Persisting them keeps reload from rerunning the autonomous
  // first-choice resolution in `FeatureCardMap` over the user's
  // picks.
  map_layer_parameters: card.mapLayerParameters ?? null,
  // Slider/range filters (radius, scale, range) — separate slice
  // because deck.gl consumes them directly, not via the layer
  // fetch. Persisted alongside parameters so the slider knobs
  // come back where the user left them.
  map_filters: card.filters ?? null,
  // Persisted high-water mark of the plot's reported pixel height
  // (`onPreferredHeight`). Carried so reload doesn't re-fire the
  // initial auto-grow against a user who has manually shrunk the
  // card.
  max_reported_height_px: card.maxReportedHeightPx ?? null,
  // Text card body (TipTap HTML). Per-column — the text card row
  // is mirrored across columns but the HTML is not fanned out, so
  // each column can hold its own annotation.
  html: card.html ?? null,
  // Divider card config (orientation, style, thickness, colour).
  // Shared across columns via `setCardDividerConfig`'s fan-out, so
  // the YAML carries the same blob in every column entry.
  divider: card.divider ?? null,
});

/**
 * Build the `{ canvas, layout, feature_card }` payload for a sparse
 * autosave PUT. Always returns the full bundle — the backend
 * accepts any subset, but we're not trying to track per-slice diffs
 * yet.
 */
export function serializeCanvas(state) {
  const canvas = {
    schema_version: SCHEMA_VERSION,
    name: state.canvasName ?? null,
    view: state.view,
    parent_scenario: state.parentScenario ?? null,
    columns: (state.columns || []).map((c) => ({
      type: c.type,
      scenario: c.scenario ?? null,
      whatif: c.whatif ?? null,
    })),
    maps_linked: !!state.mapsLinked,
    fix_layout: !!state.fixLayout,
    pathway_view: !!state.pathwayView,
    comparison_setup: state.comparisonSetup
      ? {
          kind: state.comparisonSetup.kind,
          scenarios: state.comparisonSetup.scenarios ?? null,
          whatifs: state.comparisonSetup.whatifs ?? null,
          parent_scenario: state.comparisonSetup.parentScenario ?? null,
          // Pathway-mode picks. `pathway_name` + `state_years` are
          // populated by `pathway-single`; `pathway_names` by
          // `pathway-multi`. Other kinds leave them null.
          pathway_name: state.comparisonSetup.pathwayName ?? null,
          state_years: state.comparisonSetup.stateYears ?? null,
          pathway_names: state.comparisonSetup.pathwayNames ?? null,
        }
      : null,
  };

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
    column_cards: {},
  };

  const isCompare = state.view !== 'launch';

  if (isCompare) {
    // Layout: take from column 0 (every column has the same
    // layout because `applyCardLayouts` fans out drag/resize
    // updates). Per-column `feature_card.column_cards` holds the
    // per-column plot / category / layer divergence.
    const cols = state.columnCards || {};
    const layoutSource = cols[0] || [];
    layoutSource.forEach((card) => {
      layout.cards[card.id] = cardLayoutFromStore(card);
    });
    Object.entries(cols).forEach(([idx, cards]) => {
      const map = {};
      (cards || []).forEach((card) => {
        map[card.id] = cardConfigFromStore(card);
      });
      featureCard.column_cards[idx] = map;
    });
  } else {
    // Launch view: single grid, single content map.
    (state.launchCards || []).forEach((card) => {
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
    })),
    parentScenario: canvas.parent_scenario ?? null,
    mapsLinked: !!canvas.maps_linked,
    fixLayout: !!canvas.fix_layout,
    pathwayView: !!canvas.pathway_view,
    canvasName: canvas.name ?? null,
    comparisonSetup: canvas.comparison_setup
      ? {
          kind: canvas.comparison_setup.kind,
          scenarios: canvas.comparison_setup.scenarios ?? null,
          whatifs: canvas.comparison_setup.whatifs ?? null,
          parentScenario: canvas.comparison_setup.parent_scenario ?? null,
          pathwayName: canvas.comparison_setup.pathway_name ?? null,
          stateYears: canvas.comparison_setup.state_years ?? null,
          pathwayNames: canvas.comparison_setup.pathway_names ?? null,
        }
      : null,
    launchCards: [],
    columnCards: {},
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
    mapLayerParameters: configEntry.map_layer_parameters ?? undefined,
    filters: configEntry.map_filters ?? undefined,
    maxReportedHeightPx: configEntry.max_reported_height_px ?? undefined,
    html: configEntry.html ?? undefined,
    divider: configEntry.divider ?? undefined,
  });

  const isCompare = next.view !== 'launch';
  const sharedLayout = layout?.cards || {};

  if (isCompare) {
    // Per-column content from `feature_card.column_cards`. Layout
    // is shared across columns so each column reads the same
    // entry from `layout.cards` keyed by card id.
    const cols = feature_card?.column_cards || {};
    Object.entries(cols).forEach(([idx, configs]) => {
      next.columnCards[idx] = Object.entries(configs).map(([id, cfg]) =>
        buildCard(id, sharedLayout[id], cfg),
      );
    });
  } else {
    // Launch view: single content map.
    Object.entries(feature_card?.cards || {}).forEach(([id, cfg]) => {
      next.launchCards.push(buildCard(id, sharedLayout[id], cfg));
    });
  }

  return next;
}
