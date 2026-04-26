import { createContext } from 'react';
import { createStore } from 'zustand';

/**
 * Per-card map state for Reports' FeatureCardMap.
 *
 * Today, the singleton `useMapStore` + `useMapCategoryStore` are
 * shared across every Reports map card → multiple cards in a column
 * all render the same overlay. The plan is to move the *layer-
 * rendering* slice (category / selected layer / parameters / computed
 * deck.gl layers) into a per-card zustand store, while view-state
 * (camera, zoom, layer-type visibility, colour mode) keeps using the
 * singleton.
 *
 * This module is **Phase 1 only**: the context + factory are defined
 * but nothing imports them yet. Subsequent phases will:
 *
 *   2. `FeatureCardMap` creates a store via `createMapInstanceStore`
 *      and wraps its children in `<MapInstanceContext.Provider>`.
 *   3. Consumers (`MapLayerPropertiesCard`, the deck.gl feed inside
 *      `ReportMap`, `useGetMapLayers`) read from this store when
 *      inside a Provider; fall back to `useMapStore` otherwise.
 *   4. `BottomCard` looks up the active card's store via a registry
 *      and wraps `MapLayerPropertiesCard` in the matching Provider.
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
