import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useMapStore } from 'features/map/stores/mapStore';
import { useMapLayerCategories } from 'features/project/components/Cards/MapLayersCard/store';
import { useGetMapLayers } from 'features/map/hooks/map-layers';
import { apiClient } from 'lib/api/axios';
import { scenarioHeaders } from 'lib/api/scenarioContext';
import Legend, {
  LegendFilterRow,
} from 'features/map/components/Map/Layers/Legend';
import { iconMap } from 'features/plots/constants';
import {
  CEA_PURPLE,
  BORDER_SUBTLE,
  ERROR_RED,
  SYSTEM_FONT_STACK,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from 'constants/theme';

import { useCanvasStore } from '../stores/canvasStore';
import CanvasMap from './CanvasMap';
import {
  FeatureCardShell,
  findFamilyForFeature,
  sectionDividerStyle,
} from './featureCardCommon';
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
  const setCardMapLayerParameters = useCanvasStore(
    (s) => s.setCardMapLayerParameters,
  );
  const setCardFilters = useCanvasStore((s) => s.setCardFilters);

  // Lazy initializer keeps the store stable across renders. Three
  // seeds matter: (a) the singleton's view-state, so a card mounted
  // while `mapsLinked === false` opens at the overview map's
  // current camera/zoom; (b) any saved `mapLayerParameters`, so
  // reload restores the user's selections before
  // `FeatureCardMapBody`'s autonomous init can refetch first-choice
  // defaults over them; (c) any saved `filters` (radius / scale /
  // range), so the slider knobs come back where the user left them.
  const [store] = useState(() => {
    const s = createMapInstanceStore({ category, layer });
    s.setState(snapshotViewState());
    if (card.mapLayerParameters != null) {
      s.setState({ mapLayerParameters: card.mapLayerParameters });
    }
    if (card.filters != null) {
      s.setState({ filters: card.filters });
    }
    return s;
  });

  // Round-trip per-card edits onto the canvasStore so autosave
  // persists them. `mapLayerParameters` is skipped while null —
  // `MapLayerPropertiesCard`'s reset and `ChoiceSelector`'s
  // pre-fetch render both null it transiently and we don't want
  // autosave to flush an empty payload. `filters` only resets to
  // `{}` on initial mount, before SliderSelector seeds defaults;
  // skip empty likewise.
  useEffect(() => {
    return store.subscribe((state, prev) => {
      if (state.mapLayerParameters !== prev.mapLayerParameters) {
        if (state.mapLayerParameters != null) {
          setCardMapLayerParameters(columnIndex, id, state.mapLayerParameters);
        }
      }
      if (state.filters !== prev.filters) {
        if (state.filters && Object.keys(state.filters).length) {
          setCardFilters(columnIndex, id, state.filters);
        }
      }
    });
  }, [store, columnIndex, id, setCardMapLayerParameters, setCardFilters]);
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

  // Mirror columns (numeric `columnIndex > 0` in compare mode) are
  // read-only follower columns. `originWhatifName` is the value
  // the origin column has currently picked — used by
  // `FeatureCardMapBody` to align mirrors to the same comparison
  // axis (and surface a mismatch overlay when origin's pick isn't
  // available in the mirror's scenario).
  const isMirror = typeof columnIndex === 'number' && columnIndex > 0;
  const originWhatifName = useCanvasStore((s) => {
    if (!isMirror) return null;
    const originCards = s.columnCards?.[0] || [];
    const originCard = originCards.find((c) => c.id === id);
    const value = originCard?.mapLayerParameters?.whatif_name;
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  });

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
            isMirror={isMirror}
            originWhatifName={originWhatifName}
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
  // Compare-mode signals: mirrors track origin's `whatif_name`
  // (the comparison axis). When origin's pick isn't in this
  // column's `/choices` we surface a mismatch overlay rather
  // than silently substituting a different what-if — see
  // `whatifMismatch` below.
  isMirror = false,
  originWhatifName = null,
}) => {
  // Resolve a complete, scenario-valid parameter set before the
  // first layer fetch. Static defaults (`default != null`) come
  // straight from the schema; dynamic params (`selector === 'choice'`
  // with `default: null`, e.g. `whatif_name`) need a `/choices` round
  // trip — copying their `null` defaults verbatim would 400 the fetch
  // and paint a false-positive error overlay.
  const mapLayerParameters = useScopedMapLayerParameters();
  const setMapLayerParameters = useScopedSetMapLayerParameters();
  // Mismatch error specific to the mirror "origin's what-if isn't in
  // this column" case. Distinct from the layer-fetch error so we
  // can render a different overlay copy. Holds the offending value
  // *and* the column's available choices so the overlay can list
  // alternatives the user could pick instead.
  const [whatifMismatch, setWhatifMismatch] = useState(null);
  const initialisedKeyRef = useRef(null);
  // Origin's pick is part of the init key — when origin changes
  // (or first lands after mirror's mount), the effect re-runs and
  // re-resolves whatif_name against the new value.
  const initKey = `${project}::${scenario}::${categoryInfo?.name}::${layerInfo?.name}::${originWhatifName ?? ''}`;
  useEffect(() => {
    if (!project || !scenario) return;
    if (!categoryInfo?.name || !layerInfo?.parameters) return;
    if (initialisedKeyRef.current === initKey) return;

    const paramSchema = layerInfo.parameters;
    let cancelled = false;

    const resolveDefaults = async () => {
      // Start from the existing parameters so re-runs (origin
      // changing) preserve other params the user may have edited.
      const out = { ...(mapLayerParameters || {}) };
      let mismatch = null;
      for (const [key, value] of Object.entries(paramSchema)) {
        if (value?.default != null && out[key] === undefined) {
          out[key] = value.default;
        }
      }
      // Schema iteration order matches `expected_parameters` insertion
      // order, so `depends_on` chains (e.g. `data-column` depends on
      // `whatif_name`) see prior resolutions in `out`.
      for (const [key, value] of Object.entries(paramSchema)) {
        if (value?.selector !== 'choice') continue;
        // For mirrors with a known origin pick, we need to verify
        // it against this column's choices regardless of whether
        // the slot is already filled — origin may have changed
        // since the last init. For other params, skip when set.
        const isWhatifSync =
          isMirror && key === 'whatif_name' && originWhatifName != null;
        if (!isWhatifSync && out[key] !== undefined) continue;
        try {
          const resp = await apiClient.post(
            `/api/map_layers/${categoryInfo.name}/${layerInfo.name}/${key}/choices`,
            { parameters: out },
            { headers: scenarioHeaders({ project, scenarioName: scenario }) },
          );
          const data = resp.data;
          const choices = Array.isArray(data) ? data : data?.choices;
          if (isWhatifSync) {
            const choiceValues = (choices || []).map((c) => c?.value ?? c);
            if (choiceValues.includes(originWhatifName)) {
              out[key] = value.multi ? [originWhatifName] : originWhatifName;
            } else {
              // Mark the mismatch and drop the param so the layer
              // fetch doesn't 400 with an invalid what-if. Carry
              // the column's available choices so the overlay can
              // list them as substitutes.
              mismatch = {
                missing: originWhatifName,
                available: choiceValues,
              };
              delete out[key];
            }
            continue;
          }
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
      // Mark complete only on success — a cancelled run (e.g.
      // React strict-mode double-mount) leaves the ref unchanged
      // so the follow-up run can still do the work.
      initialisedKeyRef.current = initKey;
      setWhatifMismatch(mismatch);
      setMapLayerParameters(out);
    };

    resolveDefaults();
    return () => {
      cancelled = true;
    };
  }, [
    initKey,
    project,
    scenario,
    categoryInfo,
    layerInfo,
    isMirror,
    originWhatifName,
    mapLayerParameters,
    setMapLayerParameters,
  ]);

  const { error: layerError } = useGetMapLayers(
    categoryInfo,
    project,
    scenario,
    mapLayerParameters,
  );

  // Surface the active what-if name (if the layer has one) so
  // the user can read it without opening BottomCard. LCA layers
  // declare the parameter as `whatif_name`; layers without one
  // (thermal-network, demand, …) leave the subtitle absent.
  const whatifValue = formatParamValue(mapLayerParameters?.whatif_name);

  return (
    <>
      {whatifValue && (
        <div style={subtitleStyle} title={whatifValue}>
          {whatifValue}
        </div>
      )}
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
        {whatifMismatch && mapLayerParameters?.whatif_name == null ? (
          <div style={errorOverlayStyle}>
            <div style={errorCardStyle}>
              <div style={errorTitleStyle}>
                what-if-name{' '}
                <span style={{ color: CEA_PURPLE }}>
                  {whatifMismatch.missing}
                </span>{' '}
                not available in{' '}
                <span style={{ color: CEA_PURPLE }}>{scenario}</span>
              </div>
              <ul style={errorListStyle}>
                {whatifMismatch.available.length > 0 && (
                  <li>
                    Pick from{' '}
                    <span style={{ color: CEA_PURPLE }}>
                      {whatifMismatch.available.join(', ')}
                    </span>
                  </li>
                )}
                <li>
                  Run{' '}
                  {findFamilyForFeature(layerInfo?.name)?.label ||
                    layerInfo?.label ||
                    'the upstream tool'}{' '}
                  for{' '}
                  <span style={{ color: CEA_PURPLE }}>
                    {whatifMismatch.missing}
                  </span>
                </li>
                <li>Remove this row</li>
              </ul>
            </div>
          </div>
        ) : (
          layerError && (
            <div style={errorOverlayStyle}>
              <div style={errorCardStyle}>
                <div style={errorTitleStyle}>
                  {`No ${layerInfo?.label || 'layer'} data for `}
                  <span style={{ color: CEA_PURPLE }}>{scenario}</span>
                </div>
                <div style={errorBodyStyle}>
                  Run the upstream tool for this scenario first.
                </div>
              </div>
            </div>
          )
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

// Stringify a parameter value for display. Choice params can be
// single-valued (string) or multi-valued (array); other shapes
// (number, boolean) round-trip through `String(...)`. Returns
// `null` for null/empty so the caller can skip rendering.
const formatParamValue = (value) => {
  if (value == null) return null;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    return value.join(', ');
  }
  return String(value);
};

const subtitleStyle = {
  fontSize: 12,
  color: TEXT_SECONDARY,
  marginBottom: 8,
  fontFamily: SYSTEM_FONT_STACK,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
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
  maxWidth: 320,
  padding: '12px 14px',
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

const errorListStyle = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 12,
  color: TEXT_SECONDARY,
  lineHeight: 1.5,
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
