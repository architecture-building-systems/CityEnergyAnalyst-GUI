import { createContext, useContext, useMemo } from 'react';
import { create, createStore, useStore } from 'zustand';

import { COLOR_MODES, useMapStore } from 'features/map/stores/mapStore';
import { defaultViewState } from 'features/map/utils';
import {
  useMapLayerCategories,
  useMapCategoryStore,
} from 'features/project/components/Cards/MapLayersCard/store';

import { useReportsStore } from '../stores/reportsStore';

/**
 * Per-card map state for Reports' `FeatureCardMap`.
 *
 * The layer-rendering slice (category, selected layer, parameter
 * values, computed deck.gl layers, colour/elevation range) lives on a
 * per-card zustand store so multiple Map cards in one column can show
 * different overlays. View-state (camera, zoom, layer-type visibility,
 * colour mode) stays on the singleton `useMapStore`.
 *
 * `FeatureCardMap` creates the store, provides it through
 * `MapInstanceContext`, and publishes it in the registry below so
 * `BottomCard` can wrap its `MapLayerPropertiesCard` in the same
 * provider when the card is the active edit target. Consumers read
 * via the scoped hooks; outside a provider they transparently fall
 * back to the singleton, leaving the main viewport untouched.
 */

export const MapInstanceContext = createContext(null);

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
    // mapping in `Map.jsx`. Set from the fetched data in
    // `useGetMapLayers` (the BottomCard hides its Legend, which is
    // what would otherwise set range on the singleton); also written
    // back by the Legend embedded in `FeatureCardMap` when the user
    // toggles between total / period range modes.
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
  const linked = useReportsStore((s) => s.mapsLinked);
  const ctx = useContext(MapInstanceContext);
  const fromCtx = useStore(ctx ?? NULL_STORE, (s) => s?.[key]);
  const fromSingleton = useMapStore((s) => s[key]);
  return ctx && !linked ? fromCtx : fromSingleton;
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
// `FeatureCardMap` publishes its store under `card.id` so the
// page-level `BottomCard` can look it up by the `activeMapCardId`
// it gets from `ReportsPage`. Backed by a zustand store so
// subscribers re-render when a card (un)registers.

const useCardStoresRegistry = create(() => ({}));

export const registerMapCardStore = (cardId, store) => {
  useCardStoresRegistry.setState((s) => ({ ...s, [cardId]: store }));
};

export const unregisterMapCardStore = (cardId) => {
  useCardStoresRegistry.setState((s) => {
    if (!(cardId in s)) return s;
    const next = { ...s };
    delete next[cardId];
    return next;
  });
};

/**
 * Look up a card's per-card map store by id. Returns `null` when no
 * card is active or the card hasn't registered yet (briefly possible
 * between insert and mount).
 */
export const useMapCardStore = (cardId) =>
  useCardStoresRegistry((s) => (cardId ? (s[cardId] ?? null) : null));
