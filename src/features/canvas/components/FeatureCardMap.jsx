import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useMapStore } from 'features/map/stores/mapStore';
import { useMapLayerCategories } from 'features/project/components/Cards/MapLayersCard/store';
import { useGetMapLayers } from 'features/map/hooks/map-layers';
import { apiClient } from 'lib/api/axios';
import Legend, {
  LegendFilterRow,
} from 'features/map/components/Map/Layers/Legend';
import { iconMap } from 'features/plots/constants';
import {
  ACCENT_PURPLE,
  BORDER_SUBTLE,
  ERROR_RED,
  SYSTEM_FONT_STACK,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from 'constants/theme';

import { useCanvasStore } from '../stores/canvasStore';
import CanvasMap from './CanvasMap';
import { FeatureCardShell, sectionDividerStyle } from './featureCardCommon';
import {
  MapInstanceContext,
  MapLayerScenarioOverrideContext,
  createMapInstanceStore,
  registerMapCardStore,
  unregisterMapCardStore,
  useScopedMapLayerParameters,
  useScopedSetMapLayerParameters,
} from './mapInstance';

// Singleton fields whose snapshot we copy into each per-card store
// at two moments: (a) when a new card mounts so it inherits the
// overview map's current view, and (b) when the user flips
// `mapsLinked` from on → off so every existing card continues from
// the overview map's current view instead of jumping to the per-
// card defaults. Mirrored back during the on-state via the scoped
// hooks.
const VIEW_STATE_KEYS = [
  'viewState',
  'cameraOptions',
  'extruded',
  'visibility',
  'mapLabels',
  'colorMode',
  'filters',
];

const snapshotViewState = () => {
  const singleton = useMapStore.getState();
  const seed = {};
  for (const key of VIEW_STATE_KEYS) seed[key] = singleton[key];
  return seed;
};

/**
 * Map-only feature card. Renders the column's `<CanvasMap>` widget
 * (same DeckGL map + 4-button toolbar suite as the primary map tile)
 * bound to a specific category + layer. The properties form launches
 * at the page bottom — same pattern Plot cards use.
 *
 * Owns a per-card `mapInstance` store seeded with the card's category
 * and layer; the store is published in the registry so `BottomCard`
 * can wrap its `MapLayerPropertiesCard` in the matching provider when
 * this card is the active edit target. See `mapInstance.js` for the
 * scoped read/write surface.
 */
const FeatureCardMap = ({
  card,
  project,
  scenario,
  onOpenBottom,
  onDeleteCard,
  editing = false,
  // Compare-mode mirrors share `card.id`; the column index keeps
  // each card's per-card store registered under a distinct slot.
  columnIndex = null,
}) => {
  const { id, category, layer } = card;
  const data = useMapLayerCategories();

  // `useState` lazy initializer keeps the store stable across renders
  // without the unsafe `useRef`-mutate-during-render pattern. Seeded
  // with the singleton's current view-state so a card mounted while
  // `mapsLinked === false` inherits the overview map's view (camera,
  // zoom, layer toggles, …) instead of opening at default world.
  const [store] = useState(() => {
    const s = createMapInstanceStore({ category, layer });
    s.setState(snapshotViewState());
    return s;
  });
  useEffect(() => {
    const { setCategory, setSelectedMapLayer: setLayer } = store.getState();
    setCategory(category);
    setLayer(layer);
  }, [store, category, layer]);

  useEffect(() => {
    registerMapCardStore(columnIndex, id, store);
    return () => unregisterMapCardStore(columnIndex, id);
  }, [columnIndex, id, store]);

  const handleEdit = useCallback(() => {
    onOpenBottom?.(id, columnIndex);
  }, [onOpenBottom, id, columnIndex]);

  // Hide the in-card 4-button toolbar when "Sync Maps" is on (the
  // overview map is the sole driver) or when "Enable Edit" is off
  // (snapshot mode — no editing chrome anywhere).
  const mapsLinked = useCanvasStore((s) => s.mapsLinked);
  const enableEdit = useCanvasStore((s) => s.enableEdit);

  // On the linked → unlinked transition, refresh the per-card view-
  // state from the singleton snapshot so cards continue from the
  // overview map's current view. The reverse transition needs no
  // work — scoped hooks read the singleton directly while linked,
  // so per-card values are dormant.
  const previouslyLinkedRef = useRef(mapsLinked);
  useEffect(() => {
    if (previouslyLinkedRef.current && !mapsLinked) {
      store.setState(snapshotViewState());
    }
    previouslyLinkedRef.current = mapsLinked;
  }, [mapsLinked, store]);

  const categoryInfo = data?.categories?.find((c) => c.name === category);
  const layerInfo = categoryInfo?.layers?.find((l) => l.name === layer);
  const title = layerInfo?.label || categoryInfo?.label || category || 'Map';
  const Icon = iconMap[category];

  // Compare-mode mirrors share `card.id`; this override scopes
  // descendant choice/range fetchers to *this column's* scenario.
  const scenarioOverride = useMemo(
    () => (project && scenario ? { project, scenarioName: scenario } : null),
    [project, scenario],
  );

  return (
    <MapInstanceContext.Provider value={store}>
      <MapLayerScenarioOverrideContext.Provider value={scenarioOverride}>
        <FeatureCardShell
          title={title}
          icon={Icon}
          onEdit={onOpenBottom ? handleEdit : undefined}
          onDeleteCard={onDeleteCard}
          editing={editing}
        >
          <div style={sectionDividerStyle} />
          <FeatureCardMapBody
            project={project}
            scenario={scenario}
            mapsLinked={mapsLinked}
            enableEdit={enableEdit}
            categoryInfo={categoryInfo}
            layerInfo={layerInfo}
          />
        </FeatureCardShell>
      </MapLayerScenarioOverrideContext.Provider>
    </MapInstanceContext.Provider>
  );
};

/**
 * Renders the map widget + legend, plus an error overlay when the
 * column's scenario has no data for the selected layer. Lives under
 * the `MapInstanceContext.Provider` so scoped hooks bind to the
 * card's per-card store.
 *
 * Mirror columns in compare mode each fetch their own layer data so
 * the overlay (and any error) is column-specific without waiting for
 * the user to open `MapLayerPropertiesCard` on every column.
 */
const FeatureCardMapBody = ({
  project,
  scenario,
  mapsLinked,
  enableEdit,
  categoryInfo,
  layerInfo,
}) => {
  // Resolve a complete, scenario-valid parameter set before the
  // first layer fetch. Static defaults (`default != null`) come
  // straight from the schema; dynamic params (`selector === 'choice'`
  // with `default: null`, e.g. `what_if_name`) need a `/choices` round
  // trip — copying their `null` defaults verbatim would 400 the fetch
  // and paint a false-positive error overlay.
  const mapLayerParameters = useScopedMapLayerParameters();
  const setMapLayerParameters = useScopedSetMapLayerParameters();
  const initialisedKeyRef = useRef(null);
  const initKey = `${project}::${scenario}::${categoryInfo?.name}::${layerInfo?.name}`;
  useEffect(() => {
    if (mapLayerParameters != null) return;
    if (!project || !scenario) return;
    if (!categoryInfo?.name || !layerInfo?.parameters) return;
    if (initialisedKeyRef.current === initKey) return;
    initialisedKeyRef.current = initKey;

    const paramSchema = layerInfo.parameters;
    let cancelled = false;

    const resolveDefaults = async () => {
      const out = {};
      for (const [key, value] of Object.entries(paramSchema)) {
        if (value?.default != null) out[key] = value.default;
      }
      // Schema iteration order matches `expected_parameters` insertion
      // order, so `depends_on` chains (e.g. `data-column` depends on
      // `whatif_name`) see prior resolutions in `out`.
      for (const [key, value] of Object.entries(paramSchema)) {
        if (value?.default != null) continue;
        if (value?.selector !== 'choice') continue;
        try {
          const resp = await apiClient.post(
            `/api/map_layers/${categoryInfo.name}/${layerInfo.name}/${key}/choices`,
            { project, scenario_name: scenario, parameters: out },
          );
          const data = resp.data;
          const choices = Array.isArray(data) ? data : data?.choices;
          const first = choices?.[0];
          const firstValue = first?.value ?? first;
          if (firstValue != null) {
            out[key] = value.multi ? [firstValue] : firstValue;
          }
        } catch {
          // Upstream tool hasn't run for this scenario — leave the
          // param unset so the layer fetch's own error drives the
          // overlay copy.
        }
      }
      if (cancelled) return;
      if (Object.keys(out).length) setMapLayerParameters(out);
    };

    resolveDefaults();
    return () => {
      cancelled = true;
    };
  }, [
    initKey,
    mapLayerParameters,
    project,
    scenario,
    categoryInfo,
    layerInfo,
    setMapLayerParameters,
  ]);

  const { error: layerError } = useGetMapLayers(
    categoryInfo,
    project,
    scenario,
    mapLayerParameters,
  );

  return (
    <>
      <div style={mapBodyStyle}>
        <CanvasMap
          project={project}
          scenario={scenario}
          showToolbar={!mapsLinked && enableEdit}
          // The column's primary tile keeps the basemap; feature
          // cards drop it to halve their WebGL contexts and stay
          // under the browser cap in compare mode (3+ columns).
          showBasemap={false}
        />
        {layerError && (
          <div style={errorOverlayStyle}>
            <div style={errorCardStyle}>
              <div style={errorTitleStyle}>
                {`No ${layerInfo?.label || 'layer'} data for `}
                <span style={{ color: ACCENT_PURPLE }}>{scenario}</span>
              </div>
              <div style={errorBodyStyle}>
                Run the upstream tool for this scenario first.
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={legendBodyStyle}>
        <Legend
          style={legendOverrideStyle}
          extras={layerInfo ? <LegendFilterRow layers={[layerInfo]} /> : null}
        />
      </div>
    </>
  );
};

const mapBodyStyle = {
  flex: 1,
  minHeight: 0,
  position: 'relative',
};

// Mirrors the calmer error style used by the backend-rendered plot
// error templates (cea/visualisation/.../*.py) — white card, subtle
// border, 3px red left accent, no bold heading.
const errorOverlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  background: 'rgba(255, 255, 255, 0.92)',
  zIndex: 1,
};

const errorCardStyle = {
  maxWidth: '90%',
  padding: '14px 18px',
  border: `1px solid ${BORDER_SUBTLE}`,
  borderLeft: `3px solid ${ERROR_RED}`,
  borderRadius: 8,
  background: '#fff',
  fontFamily: SYSTEM_FONT_STACK,
};

const errorTitleStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: TEXT_PRIMARY,
  marginBottom: 4,
};

const errorBodyStyle = {
  fontSize: 12,
  color: TEXT_SECONDARY,
};

// Hosts the Legend below the map. Width spans the card; height grows
// with the legend's own content (no `flex: 1` so the map keeps the
// remaining space).
const legendBodyStyle = {
  marginTop: 12,
  width: '100%',
};

// Override Legend's sidebar defaults: span the full card width and
// drop the card chrome (shadow + opaque background) so the legend
// reads as part of the FeatureCardMap surface, not its own card.
const legendOverrideStyle = {
  width: '100%',
  marginRight: 0,
  boxShadow: 'none',
  backgroundColor: 'transparent',
  padding: 0,
};

export default FeatureCardMap;
