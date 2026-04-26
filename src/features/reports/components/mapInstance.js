import { createContext, useContext, useMemo } from 'react';
import { create, createStore, useStore } from 'zustand';

import { useMapStore } from 'features/map/stores/mapStore';
import {
  useMapLayerCategories,
  useMapCategoryStore,
} from 'features/project/components/Cards/MapLayersCard/store';

/**
 * Per-card map state for Reports' FeatureCardMap.
 *
 * The singleton `useMapStore` + `useMapCategoryStore` are shared
 * across the entire app. To let multiple Reports map cards in one
 * column show different overlays, the *layer-rendering* slice
 * (category / selected layer / parameters / computed deck.gl layers)
 * lives in a per-card zustand store; view-state (camera, zoom,
 * layer-type visibility, colour mode) stays singleton.
 *
 * How it fits together:
 *   - `FeatureCardMap` creates a per-card store via
 *     `createMapInstanceStore` and provides it through
 *     `<MapInstanceContext>`. The same store is also published in
 *     the registry below under `card.id`.
 *   - The deck.gl layer feed inside `Map.jsx`,
 *     `MapLayerPropertiesCard`, and `useGetMapLayers` all read/write
 *     through the scoped hooks; when no provider is in scope they
 *     transparently fall back to the singleton (main viewport keeps
 *     working untouched).
 *   - `ReportsPage` tracks `activeMapCardId`; `BottomCard` looks up
 *     the matching store from the registry and wraps its own
 *     `MapLayerPropertiesCard` in `<MapInstanceContext>` so the
 *     bottom form drives the active card's state.
 */

/**
 * React context whose value is a zustand `StoreApi` for the per-card
 * map state. `null` means "no provider in scope" — consumers should
 * fall back to the singleton stores.
 */
export const MapInstanceContext = createContext(null);

/**
 * Build a fresh per-card store seeded with the card's category +
 * layer. Each `FeatureCardMap` should create one of these via
 * `useRef` so the store persists across renders for that card.
 *
 * Shape mirrors the relevant slice of `useMapStore`/`useMapCategoryStore`:
 *   - `category`              — active category for this card
 *   - `selectedMapLayer`      — chosen layer name
 *   - `mapLayerParameters`    — parameter form values
 *   - `mapLayers`             — computed deck.gl layer array
 *
 * Setters use the same names as the singleton equivalents so
 * consumers can swap reads/writes onto this store without renaming.
 */
export const createMapInstanceStore = ({ category, layer } = {}) =>
  createStore((set) => ({
    category: category ?? null,
    selectedMapLayer: layer ?? null,
    mapLayerParameters: null,
    mapLayers: null,
    setCategory: (next) => set({ category: next }),
    setSelectedMapLayer: (next) => set({ selectedMapLayer: next }),
    setMapLayerParameters: (next) => set({ mapLayerParameters: next }),
    setMapLayers: (next) => set({ mapLayers: next }),
  }));

// ── Scoped hooks ───────────────────────────────────────────────────
//
// Each hook returns the per-card value when `MapInstanceContext` has
// a store in scope; otherwise falls back to the singleton so main-
// viewport consumers (and any Reports component rendered outside a
// provider) keep working untouched.
//
// All hooks call `useStore` and the singleton hook unconditionally
// (rules of hooks). When no context is in scope we pass an empty
// "no-op" store so `useStore` is still satisfied.

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
 * Scoped equivalent of `useSelectedMapCategoryInfo` — looks up the
 * active category in the live `useMapLayerCategories` response, but
 * picks the active name from the per-card store (or singleton
 * fallback). Returns `null` while categories are still loading or
 * no active category is set.
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
// `FeatureCardMap` instances publish their per-card store under
// `card.id` so the page-level `BottomCard` can look it up by the
// `activeMapCardId` it gets from `ReportsPage`. A small zustand
// store backs the registry so subscribers re-render when a new card
// (un)registers.

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
 * card is active or the card hasn't registered yet (e.g. during the
 * brief window between insert and mount).
 */
export const useMapCardStore = (cardId) =>
  useCardStoresRegistry((s) => (cardId ? (s[cardId] ?? null) : null));
