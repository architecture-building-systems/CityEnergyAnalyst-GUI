import { createContext, useContext, useMemo } from 'react';
import { create, createStore, useStore } from 'zustand';

import { COLOR_MODES, useMapStore } from 'features/map/stores/mapStore';
import { defaultViewState } from 'features/map/utils';
import {
  useMapLayerCategories,
  useMapCategoryStore,
} from 'features/project/components/Cards/MapLayersCard/store';
import { useProjectStore } from 'features/project/stores/projectStore';

import { useCanvasStore } from '../stores/canvasStore';

/**
 * Per-column override for the `(project, scenarioName)` pair that
 * map-layer choice/range/generate fetches use. Compare-mode mirrors
 * publish their column's scenario through this context so dependent
 * dropdowns (what-if-name, network-name, …) source options from
 * *that* column rather than the project store's active scenario.
 *
 * `null` outside any provider → consumers fall through to the
 * project store, preserving main-viewport behaviour.
 */
export const MapLayerScenarioOverrideContext = createContext(null);

/**
 * Reads `(project, scenarioName, childScenario)` honouring the override above.
 * Drop-in replacement for direct `useProjectStore` reads in components that
 * may be mounted under a per-column canvas scope.
 *
 * `childScenario` is only populated from the store when no per-column override
 * is present (main-viewport path). Canvas column overrides pin a specific
 * scenario and have no child-scenario concept, so `childScenario` is `null`
 * there — callers building X-CEA-Child-Scenario tokens should check this.
 */
export const useScopedProjectScenario = () => {
  const override = useContext(MapLayerScenarioOverrideContext);
  const projectFallback = useProjectStore((s) => s.project);
  const scenarioFallback = useProjectStore((s) => s.scenario);
  const childScenarioFallback = useProjectStore((s) => s.childScenario);
  const isOverride = override != null;
  return {
    project: override?.project ?? projectFallback,
    scenarioName: override?.scenarioName ?? scenarioFallback,
    // Child scenario only applies when using the active (non-override) scenario.
    childScenario: isOverride ? null : childScenarioFallback,
  };
};

/**
 * Per-column camera centre — `{ center, setCenter }` where
 * `center` is `{ latitude, longitude } | null` and `setCenter`
 * mutates that state.
 *
 * In compare mode, scenarios may live in different cities (e.g.
 * Zurich vs Singapore). The singleton's camera centre can only
 * point at one of them, so the others render empty ocean. This
 * context lets each column hold its own centre while
 * `zoom`/`bearing`/`pitch` still sync via the singleton — the
 * "frame the same way, look at different places" model.
 *
 * Consumers (`Map.jsx`) override the singleton's lat/lng with
 * `center` when this context is present, and route pan deltas to
 * `setCenter` instead of the singleton's `setViewState`. Outside
 * any provider (main viewport, launch view) the singleton owns
 * lat/lng, exactly like before.
 */
export const MapColumnContext = createContext(null);

/**
 * Per-card map state for Canvas Builder's `FeatureCardMap`.
 *
 * Two slices on the per-card zustand store:
 *   1. **Layer-rendering** (always per-card): `category`,
 *      `selectedMapLayer`, `mapLayerParameters`, `mapLayers`,
 *      `mapLayerLegends`, `range`. Lets each card render a different
 *      overlay regardless of the `mapsLinked` toggle.
 *   2. **View-state** (per-card only when `mapsLinked === false`):
 *      `viewState`, `cameraOptions`, `extruded`, `visibility`,
 *      `mapLabels`, `colorMode`, `filters`. Mirrors the singleton
 *      shape so the same hook calls work on either store.
 *
 * Scoped hooks split into two families with matching shapes:
 *   - Layer-rendering hooks: `ctx ? per-card : singleton`.
 *   - View-state hooks (`makeScopedViewStateHook`):
 *     `ctx && !mapsLinked ? per-card : singleton`.
 *
 * `FeatureCardMap` creates the store, provides it through
 * `MapInstanceContext`, and publishes it in the registry below so
 * `BottomCard` can wrap its `MapLayerPropertiesCard` in the same
 * provider when the card is the active edit target. Outside any
 * provider (main viewport, primary overview tile) the scoped hooks
 * fall back to the singleton — main-viewport behaviour is untouched.
 */

export const MapInstanceContext = createContext(null);

/**
 * Subtree flag that forces the scoped view-state hooks to ALWAYS
 * read from `MapInstanceContext` (i.e. the per-card store),
 * bypassing the `mapsLinked` gate.
 *
 * Pathway-multi opts in: each row's title map shows a different
 * pathway-state scenario, so the global "Sync Maps" toggle (which
 * was designed for FeatureCardMaps that mirror the singleton when
 * linked) doesn't apply — every row genuinely needs its own
 * camera and view state regardless of the toggle.
 *
 * `false` outside any provider → standard `mapsLinked` semantics
 * (FeatureCardMap mirrors the singleton when linked).
 */
export const ForceScopedMapContext = createContext(false);

/**
 * Build a fresh per-card store. Setters mirror the singleton's names
 * (`setMapLayerParameters`, `setMapLayers`, etc.) so consumers can
 * swap reads/writes onto either store without renaming.
 */
export const createMapInstanceStore = ({ category, layer } = {}) =>
  createStore((set) => ({
    category: category ?? null,
    selectedMapLayer: layer ?? null,
    mapLayerParameters: null,
    mapLayers: null,
    mapLayerLegends: null,
    // Drives `HexagonLayer.elevationDomain` and the colour-gradient
    // mapping in `Map.jsx`. Seeded from the fetched data in
    // `useGetMapLayers` and updated by the Legend embedded in
    // `FeatureCardMap` when the user toggles between total / period
    // range modes.
    range: [0, 0],
    setCategory: (next) => set({ category: next }),
    setSelectedMapLayer: (next) => set({ selectedMapLayer: next }),
    // Mirrors the singleton's functional-update signature: callers
    // (Slider/Choice/base.changeHandler) pass `(prev) => next`. Without
    // this unwrap, the function itself would be stored as the value
    // and `Object.keys(parameters)` checks downstream would see no
    // keys, stalling the fetch in `useGetMapLayers`.
    setMapLayerParameters: (value) =>
      set((state) => ({
        mapLayerParameters:
          typeof value === 'function' ? value(state.mapLayerParameters) : value,
      })),
    setMapLayers: (next) => set({ mapLayers: next }),
    setMapLayerLegends: (next) => set({ mapLayerLegends: next }),
    setRange: (next) => set({ range: next }),

    // ── View-state slice ─────────────────────────────────────────
    // Mirrors the singleton's shape so a `mapsLinked=false` card
    // can drive its own camera, layer toggles, colour mode, and
    // filters. While `mapsLinked=true`, scoped hooks read from the
    // singleton — these fields stay dormant.
    viewState: defaultViewState,
    cameraOptions: null,
    extruded: false,
    visibility: {},
    mapLabels: true,
    colorMode: COLOR_MODES.DEFAULT,
    filters: {},

    setViewState: (value) =>
      set((state) => ({
        viewState: typeof value === 'function' ? value(state.viewState) : value,
      })),
    updateViewState: (value) =>
      set((state) => ({ viewState: { ...state.viewState, ...value } })),
    setCameraOptions: (value) => set({ cameraOptions: value }),
    resetCameraOptions: () => set({ cameraOptions: null }),
    setExtruded: (value) => set({ extruded: value }),
    setVisibility: (layer, value) =>
      set((state) => ({ visibility: { ...state.visibility, [layer]: value } })),
    setMapLabels: (value) => set({ mapLabels: value }),
    setColorMode: (value) => set({ colorMode: value }),
    setFilters: (key, value) =>
      set((state) => ({
        filters: {
          ...state.filters,
          [key]:
            typeof value === 'function' ? value(state.filters[key]) : value,
        },
      })),
  }));

// ── Scoped hooks ───────────────────────────────────────────────────
//
// Each hook returns the per-card value when a provider is in scope,
// the singleton otherwise. Both subscriptions run on every render
// (rules of hooks); when no context is active we feed `useStore` an
// empty no-op store so the call stays valid but produces nothing.

const NULL_STORE = createStore(() => ({}));

export const useScopedSelectedMapLayer = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.selectedMapLayer);
  const fromSingleton = useMapStore((s) => s.selectedMapLayer);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedSetSelectedMapLayer = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.setSelectedMapLayer);
  const fromSingleton = useMapStore((s) => s.setSelectedMapLayer);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedMapLayerParameters = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.mapLayerParameters);
  const fromSingleton = useMapStore((s) => s.mapLayerParameters);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedSetMapLayerParameters = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.setMapLayerParameters);
  const fromSingleton = useMapStore((s) => s.setMapLayerParameters);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedMapLayers = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.mapLayers);
  const fromSingleton = useMapStore((s) => s.mapLayers);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedSetMapLayers = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.setMapLayers);
  const fromSingleton = useMapStore((s) => s.setMapLayers);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedRange = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.range);
  const fromSingleton = useMapStore((s) => s.range);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedSetRange = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.setRange);
  const fromSingleton = useMapStore((s) => s.setRange);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedMapLayerLegends = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.mapLayerLegends);
  const fromSingleton = useMapStore((s) => s.mapLayerLegends);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedSetMapLayerLegends = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.setMapLayerLegends);
  const fromSingleton = useMapStore((s) => s.setMapLayerLegends);
  return ctx ? fromCtx : fromSingleton;
};

// ── View-state scoped hooks ──────────────────────────────────────
//
// 3-way decision: when `mapsLinked` is on the cards mirror the
// singleton (overview-map drives them), so always read singleton
// regardless of provider. When off and a Provider is in scope
// (FeatureCardMap), read per-card. Outside any Provider (main
// viewport, primary tile) → singleton, just like the data hooks.

const makeScopedViewStateHook = (key) => () => {
  const linked = useCanvasStore((s) => s.mapsLinked);
  const forceScoped = useContext(ForceScopedMapContext);
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.[key]);
  const fromSingleton = useMapStore((s) => s[key]);
  // `forceScoped` (set by pathway-multi) overrides the `mapsLinked`
  // gate: when each row shows a different scenario, mirroring the
  // singleton would collapse all rows onto one camera.
  return ctx && (forceScoped || !linked) ? fromCtx : fromSingleton;
};

export const useScopedViewState = makeScopedViewStateHook('viewState');
export const useScopedSetViewState = makeScopedViewStateHook('setViewState');
export const useScopedUpdateViewState =
  makeScopedViewStateHook('updateViewState');
export const useScopedCameraOptions = makeScopedViewStateHook('cameraOptions');
export const useScopedSetCameraOptions =
  makeScopedViewStateHook('setCameraOptions');
export const useScopedResetCameraOptions =
  makeScopedViewStateHook('resetCameraOptions');
export const useScopedExtruded = makeScopedViewStateHook('extruded');
export const useScopedSetExtruded = makeScopedViewStateHook('setExtruded');
export const useScopedVisibility = makeScopedViewStateHook('visibility');
export const useScopedSetVisibility = makeScopedViewStateHook('setVisibility');
export const useScopedMapLabels = makeScopedViewStateHook('mapLabels');
export const useScopedSetMapLabels = makeScopedViewStateHook('setMapLabels');
export const useScopedColorMode = makeScopedViewStateHook('colorMode');
export const useScopedSetColorMode = makeScopedViewStateHook('setColorMode');
export const useScopedFilters = makeScopedViewStateHook('filters');
export const useScopedSetFilters = makeScopedViewStateHook('setFilters');

// The singleton "active category" lives on `useMapCategoryStore`,
// not on `useMapStore`, so the field name differs (`active` vs
// `category`). Both hooks unconditionally subscribe; the conditional
// is on which subscription to return.
export const useScopedActiveCategory = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.category);
  const fromSingleton = useMapCategoryStore((s) => s.active);
  return ctx ? fromCtx : fromSingleton;
};

export const useScopedSetActiveCategory = () => {
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.setCategory);
  const fromSingleton = useMapCategoryStore((s) => s.setActive);
  return ctx ? fromCtx : fromSingleton;
};

/**
 * `true` only when (a) we're rendered inside a `MapInstanceContext`
 * provider (i.e. a canvas `FeatureCardMap` subtree) and (b) Canvas
 * Builder's master `enableEdit` flag is off. Lets shared components
 * like `Legend` strip their editing chrome in canvas snapshot mode
 * while leaving the main viewport (no provider) untouched.
 */
export const useCanvasEditDisabled = () => {
  const ctx = useContext(MapInstanceContext);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  return ctx != null && !enableEdit;
};

/**
 * Scoped equivalent of `useSelectedMapCategoryInfo` — picks the active
 * name from the per-card store (or singleton fallback) and looks it up
 * in the live `useMapLayerCategories` response.
 */
export const useScopedSelectedCategoryInfo = () => {
  const active = useScopedActiveCategory();
  const categories = useMapLayerCategories();
  return useMemo(
    () => categories?.categories?.find((c) => c.name === active) ?? null,
    [active, categories],
  );
};

// ── Card-store registry ────────────────────────────────────────────
//
// `FeatureCardMap` publishes its store under `(columnIndex, cardId)`.
// Compare-mode mirrors share `card.id`, so the column index is what
// keeps each column's slot distinct in the registry — without it,
// later mirrors would clobber earlier ones and BottomCard's edit
// would land on whichever store happened to mount last.

const useCardStoresRegistry = create(() => ({}));

const registryKey = (columnIndex, cardId) =>
  `${columnIndex ?? 'launch'}::${cardId}`;

export const registerMapCardStore = (columnIndex, cardId, store) => {
  const key = registryKey(columnIndex, cardId);
  useCardStoresRegistry.setState((s) => ({ ...s, [key]: store }));
};

export const unregisterMapCardStore = (columnIndex, cardId) => {
  const key = registryKey(columnIndex, cardId);
  useCardStoresRegistry.setState((s) => {
    if (!(key in s)) return s;
    const next = { ...s };
    delete next[key];
    return next;
  });
};

/**
 * Look up a per-card map store by `(columnIndex, cardId)`. Returns
 * `null` when no card is active or the card hasn't registered yet
 * (briefly possible between insert and mount).
 */
export const useMapCardStore = (columnIndex, cardId) => {
  const key = cardId ? registryKey(columnIndex, cardId) : null;
  return useCardStoresRegistry((s) => (key ? (s[key] ?? null) : null));
};
