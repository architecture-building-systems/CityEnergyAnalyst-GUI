import MapLayerPropertiesCard from 'features/project/components/Cards/MapLayersCard/MapLayerPropertiesCard';

import {
  MapInstanceContext,
  MapLayerScenarioOverrideContext,
  useMapCardStore,
} from './mapInstance';

/**
 * Bottom card — hosts the map-layer properties form for Canvas Builder.
 *
 * Two entry points into the same form:
 *   - **Plot edit**: `PlotEditModal` sets the singleton's category
 *     and layer; `BottomCard` renders without an `activeMapCardId`,
 *     so the scoped hooks fall back to the singleton (legacy path).
 *   - **Map card edit**: `FeatureCardMap` publishes its per-card
 *     store; clicking Edit sets `activeMapCardId` and `BottomCard`
 *     wraps the form in `MapInstanceContext.Provider` so reads/writes
 *     route to that card's own state.
 *
 * `hideLayerSelector` / `hideLegend` strip Canvas Builder-irrelevant chrome.
 * `showClose` is only set for the map-card path (the plot drawer has
 * its own close).
 */
const BottomCard = ({
  activeMapCardId,
  // Pairs with `activeMapCardId` to look up the column-specific
  // per-card store; `null` during plot-edit flow.
  activeMapColumnIndex = null,
  // `{ project, scenarioName }` for the active card's column.
  // Forwarded into the form via `MapLayerScenarioOverrideContext`
  // so dependent dropdowns (what-if-name, network-name, …) fetch
  // choices scoped to the column instead of the project store's
  // active scenario. `null` → fall through to the project store.
  scenarioOverride = null,
  showClose = false,
  onClose,
}) => {
  const mapCardStore = useMapCardStore(activeMapColumnIndex, activeMapCardId);
  // Re-key on `(column, card)` so switching the active edit target
  // remounts the form. ParameterSelectors and ChoiceSelector hold
  // local `selected` state via `useState(value ?? defaultValue)`
  // that doesn't sync to a later prop change — without the
  // remount, the form would keep showing the previous column's
  // selections even though the underlying scoped store has
  // already pivoted.
  const formKey = `${activeMapColumnIndex ?? '∅'}::${activeMapCardId ?? '∅'}`;
  const form = (
    <MapLayerPropertiesCard key={formKey} hideLegend hideLayerSelector />
  );
  const wrapped = mapCardStore ? (
    <MapInstanceContext.Provider value={mapCardStore}>
      {form}
    </MapInstanceContext.Provider>
  ) : (
    form
  );
  return (
    <div style={wrapperStyle}>
      {showClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close layer parameters"
          style={closeButtonStyle}
        >
          &times;
        </button>
      )}
      <MapLayerScenarioOverrideContext.Provider value={scenarioOverride}>
        {wrapped}
      </MapLayerScenarioOverrideContext.Provider>
    </div>
  );
};

const wrapperStyle = {
  position: 'relative',
};

// Floating circular `×` clear of the bottom card — mirrors the
// pathway viewer's "exit child scenario" affordance so the close
// action reads consistently across the app. Background uses the
// `purple_light` swatch from the CEA backend palette
// (`cea/plots/colors.py` → "rgb(198,149,167)") to stay in family
// with the active card's CEA-purple `editing` stroke.
const closeButtonStyle = {
  position: 'absolute',
  top: -44,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 2,
  width: 32,
  height: 32,
  borderRadius: 999,
  border: '1px solid rgba(0, 0, 0, 0.12)',
  background: 'rgb(198, 149, 167)',
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  padding: 0,
};

export default BottomCard;
