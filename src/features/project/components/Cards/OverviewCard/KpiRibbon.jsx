/**
 * `KpiRibbon` — read-only KPI strip under the OverviewCard.
 *
 *   <KpiRibbon project="..." scenario="..." dataScenario="..." />
 *
 * Behaviour:
 *  - The displayed KPIs are driven by the active map layer + its
 *    parameters (no user picker, no localStorage). A demand layer
 *    surfaces demand KPIs; switching the demand "service" dropdown
 *    swaps the second KPI between heating-peak / cooling-peak /
 *    electricity-share. A renewable-energy-potentials layer's
 *    `surface` parameter swaps the second KPI between roof / south-
 *    facade / system-efficiency. Etc.
 *  - Layers without a meaningful KPI (solar-irradiation,
 *    lifecycle-emissions, emission-timeline) hide the ribbon
 *    entirely — including the section divider — instead of
 *    surfacing empty placeholders.
 *  - With no active layer, the ribbon falls back to a single
 *    Total-GFA card so the user always has at least the district
 *    footprint visible.
 *  - Pathway-state aware: when the OverviewCard timeline activates
 *    a state year, `dataScenario` overrides the parent path for
 *    fetches; KPI selection still tracks the active map layer.
 *  - `panel-type` (PV1 / PV2 / monocrystalline / amorphous) and
 *    other settings beyond the ones explicitly mapped below do
 *    NOT swap the KPI today — the v1 KPI registry hardcodes
 *    `panel_type: monocrystalline`. To make those reactive, the
 *    resolver would need to forward map-layer's parameters into
 *    `locator_args` at fetch time, which is out of scope here.
 *
 * The "KPI" section divider lives inside this component (not
 * the parent OverviewCard) so the divider hides together with
 * the ribbon when the active layer has nothing to show.
 */

import { useMemo } from 'react';
import { Divider } from 'antd';

import FeatureCardKpi from 'features/canvas/components/FeatureCardKpi';
import { useMapStore } from 'features/map/stores/mapStore';

const FALLBACK_KPI_IDS = ['architecture.total_gfa_m2'];

// Pull the first string out of a parameter that may be a single
// value or a multi-select array. Map-layer parameters with
// `multi: true` (e.g. demand's `data-column`) come through as
// arrays even when only one is selected.
const firstString = (val) => {
  if (Array.isArray(val)) {
    const head = val.find((v) => typeof v === 'string');
    return head ?? null;
  }
  if (typeof val === 'string') return val;
  return null;
};

// Layer-name → 2 KPI ids (or 1, or []). Settings-driven swaps
// for the "second" slot live inside each branch. Returning `[]`
// means "hide the ribbon entirely for this layer" — solar-
// irradiation / lifecycle-emissions / emission-timeline have no
// aggregate KPI in v1.
const getRibbonKpiIds = (layerName, parameters) => {
  if (!layerName) return FALLBACK_KPI_IDS;

  switch (layerName) {
    case 'demand': {
      const dc = firstString(parameters?.['data-column']);
      const second =
        dc === 'space_heating'
          ? 'demand.peak_heating_w_m2'
          : dc === 'space_cooling'
            ? 'demand.peak_cooling_w_m2'
            : dc === 'domestic_hot_water'
              ? 'demand.heating_share_pct'
              : 'demand.electricity_share_pct';
      return ['demand.eui_kwh_m2', second];
    }

    case 'renewable-energy-potentials': {
      const surface = firstString(parameters?.surface);
      const second =
        surface === 'roofs_top'
          ? 'solar.roof_share_pct'
          : surface === 'walls_south'
            ? 'solar.south_facade_share_pct'
            : 'solar.system_efficiency_pct';
      return ['solar.annual_pv_generation_kwh', second];
    }

    case 'thermal-network':
      return ['networks.total_length_m', 'networks.peak_thermal_load_kw'];

    case 'energy-by-carrier': {
      const carrier = parameters?.category;
      const second =
        carrier === 'GRID'
          ? 'final_energy.grid_share_pct'
          : carrier === 'DH'
            ? 'final_energy.district_heating_share_pct'
            : carrier === 'NATURALGAS' ||
                carrier === 'OIL' ||
                carrier === 'COAL'
              ? 'final_energy.fossil_share_pct'
              : 'final_energy.grid_share_pct';
      return ['final_energy.total_final_mwh', second];
    }

    case 'operational-emissions':
      return [
        'emissions.annual_operational_kgco2e',
        'emissions.fossil_fuel_share_pct',
      ];

    case 'anthropogenic-heat-rejection':
      return [
        'heat_rejection.annual_heat_rejection_mwh',
        'heat_rejection.peak_heat_rejection_kw',
      ];

    case 'solar-irradiation':
    case 'lifecycle-emissions':
    case 'emission-timeline':
      // No aggregate KPI fits these layers — hide the ribbon.
      return [];

    default:
      return FALLBACK_KPI_IDS;
  }
};

const KpiRibbon = ({ project, scenario, dataScenario = null, whatif }) => {
  // Track the active map layer + its parameters from the singleton
  // mapStore. The ribbon re-derives its KPI list whenever the user
  // picks a different layer or tweaks a parameter (data-column,
  // surface, carrier, etc.) — no debounce, the lookup is a switch
  // statement.
  const selectedMapLayer = useMapStore((s) => s.selectedMapLayer);
  const mapLayerParameters = useMapStore((s) => s.mapLayerParameters);

  const kpiIds = useMemo(
    () => getRibbonKpiIds(selectedMapLayer, mapLayerParameters),
    [selectedMapLayer, mapLayerParameters],
  );

  // Effective scenario for KPI fetches — child state path when
  // active, parent name otherwise. Mirrors the previous behaviour.
  const effectiveScenario = dataScenario ?? scenario;

  const cards = useMemo(
    () =>
      kpiIds.map((kpiId) => ({
        id: `overview-kpi-${kpiId}`,
        type: 'kpi',
        kpiId,
      })),
    [kpiIds],
  );

  // Hide the entire section (including the divider) when no
  // KPIs apply — beats showing "Run X to see this" placeholders
  // for layers that have no KPI mapping at all.
  if (cards.length === 0) return null;

  // 1-card layouts (GFA fallback when no layer is active) get a
  // single full-width column; 2-card layouts split 50/50. Same
  // 8 px gap so vertical alignment with the rest of the
  // OverviewCard's stack stays consistent.
  const columns = cards.length === 1 ? '1fr' : 'repeat(2, 1fr)';

  return (
    <>
      <Divider
        titlePlacement="right"
        orientationMargin={2}
        plain
        style={{ margin: 0, fontSize: 12, color: 'rgba(5, 5, 5, 0.25)' }}
      >
        KPI
      </Divider>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columns,
          gap: 8,
          alignItems: 'stretch',
        }}
        aria-label="Map-layer-driven KPIs"
      >
        {cards.map((card) => (
          <FeatureCardKpi
            key={card.id}
            card={card}
            project={project}
            scenario={effectiveScenario}
            whatif={whatif}
            readOnly
          />
        ))}
      </div>
    </>
  );
};

export default KpiRibbon;
