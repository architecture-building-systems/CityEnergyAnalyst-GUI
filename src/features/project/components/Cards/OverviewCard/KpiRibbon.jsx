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
 *  - Active map-layer parameters that match a KPI's
 *    `locator_args` keys (panel_type, whatif_name, network_type,
 *    network_name, district_energy_system_id) flow through as
 *    per-card `locatorArgs` overrides. So switching the
 *    renewable-energy-potentials layer's panel-type dropdown
 *    from monocrystalline to amorphous swaps the ribbon's solar
 *    KPI value to read the amorphous totals file instead.
 *
 * The "KPI" section divider lives inside this component (not
 * the parent OverviewCard) so the divider hides together with
 * the ribbon when the active layer has nothing to show.
 */

import { useMemo } from 'react';
import { Divider } from 'antd';

import { useMapStore } from 'features/map/stores/mapStore';

import OverviewKpiTile from './OverviewKpiTile';

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

// Pluck a subset of map-layer parameters into a KPI
// `locator_args` payload. Returns ``null`` when nothing maps so
// FeatureCardKpi falls through to the resolver's yml defaults
// (matches the canvas's "no override" behaviour).
const pickArgs = (parameters, mapping) => {
  const out = {};
  for (const [argKey, paramKey] of Object.entries(mapping)) {
    const raw = parameters?.[paramKey];
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (val !== undefined && val !== null && val !== '') {
      out[argKey] = val;
    }
  }
  return Object.keys(out).length ? out : null;
};

// Layer-name → ``{ kpis: [...], locatorArgs: {kpiId: argsObj} }``.
// Settings-driven swaps for the "second" slot live inside each
// branch. ``kpis: []`` means "hide the ribbon entirely for this
// layer" — solar-irradiation / lifecycle-emissions /
// emission-timeline have no aggregate KPI in v1.
//
// `locatorArgs` is per-KPI keyed so the same map-layer parameter
// flows through to whichever KPIs actually accept it. KPIs with
// no entry in `locatorArgs` get ``undefined`` and the resolver
// uses yml defaults.
const getRibbonKpis = (layerName, parameters) => {
  if (!layerName) return { kpis: FALLBACK_KPI_IDS, locatorArgs: {} };

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
      // Demand KPIs take no locator_args — the layer's
      // data-column / period parameters drive WHICH KPI we
      // surface, not WHICH file the resolver reads.
      return { kpis: ['demand.eui_kwh_m2', second], locatorArgs: {} };
    }

    case 'renewable-energy-potentials': {
      const surface = firstString(parameters?.surface);
      const second =
        surface === 'roofs_top'
          ? 'solar.roof_share_pct'
          : surface === 'walls_south'
            ? 'solar.south_facade_share_pct'
            : 'solar.system_efficiency_pct';
      // Map layer's `panel-type` parameter forwards to the KPI's
      // `panel_type` locator_arg so PV1 / PV2 dropdown changes
      // swap the totals file the KPIs read.
      const args = pickArgs(parameters, { panel_type: 'panel-type' });
      const kpis = ['solar.annual_pv_generation_kwh', second];
      const locatorArgs = args
        ? Object.fromEntries(kpis.map((id) => [id, args]))
        : {};
      return { kpis, locatorArgs };
    }

    case 'thermal-network': {
      // Multi-phase plans appear in the map layer's `network-name`
      // dropdown with the literal `(Multi-Phase)` suffix. Per-phase
      // CSV outputs live under
      // ``thermal-network/phasing-plans/<plan>/<type>/<phase>/`` —
      // a different path from the single-phase
      // ``thermal-network/<name>/`` one the standard KPIs read.
      // Route to the multi-phase KPI variants in that case, with
      // ``plan_name`` (suffix-stripped) + ``phase`` (the layer's
      // active phase parameter) forwarded as `locatorArgs`.
      const networkName = firstString(parameters?.['network-name']);
      const isMultiPhase =
        !!networkName && networkName.endsWith(' (Multi-Phase)');
      if (isMultiPhase) {
        const planName = networkName.slice(
          0,
          networkName.length - ' (Multi-Phase)'.length,
        );
        const phase = firstString(parameters?.phase);
        const networkType = firstString(parameters?.['network-type']) || 'DH';
        // Without a phase pick the resolver can't figure out which
        // CSV to read. Hide the ribbon until the user picks one;
        // the layer auto-defaults to the first phase on selection
        // so this is a brief transient state.
        if (!phase) return { kpis: [], locatorArgs: {} };
        const args = {
          network_type: networkType,
          plan_name: planName,
          phase,
        };
        const kpis = [
          'networks.phase_total_length_m',
          'networks.phase_peak_thermal_load_kw',
        ];
        return {
          kpis,
          locatorArgs: Object.fromEntries(kpis.map((id) => [id, args])),
        };
      }
      const args = pickArgs(parameters, {
        network_type: 'network-type',
        network_name: 'network-name',
      });
      const kpis = ['networks.total_length_m', 'networks.peak_thermal_load_kw'];
      const locatorArgs = args
        ? Object.fromEntries(kpis.map((id) => [id, args]))
        : {};
      return { kpis, locatorArgs };
    }

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
      const args = pickArgs(parameters, { whatif_name: 'whatif_name' });
      const kpis = ['final_energy.total_final_mwh', second];
      const locatorArgs = args
        ? Object.fromEntries(kpis.map((id) => [id, args]))
        : {};
      return { kpis, locatorArgs };
    }

    case 'operational-emissions': {
      // Emissions KPIs migrated to `get_emissions_whatif_buildings_file`;
      // the layer's `whatif_name` forwards through to the resolver
      // so dropdown changes swap which what-if folder the values
      // come from. The 4 carrier-share KPIs were dropped during
      // the migration (no per-carrier breakdown in the whatif
      // file) — pair the headline KPI with the new GFA-normalised
      // intensity instead.
      const args = pickArgs(parameters, { whatif_name: 'whatif_name' });
      const kpis = [
        'emissions.annual_operational_kgco2e',
        'emissions.intensity_kgco2_m2',
      ];
      const locatorArgs = args
        ? Object.fromEntries(kpis.map((id) => [id, args]))
        : {};
      return { kpis, locatorArgs };
    }

    case 'anthropogenic-heat-rejection': {
      // Heat-rejection KPIs migrated to whatif locator; layer's
      // `whatif_name` forwards through to read the matching
      // analysis folder.
      const args = pickArgs(parameters, { whatif_name: 'whatif_name' });
      const kpis = [
        'heat_rejection.annual_heat_rejection_mwh',
        'heat_rejection.peak_heat_rejection_kw',
      ];
      const locatorArgs = args
        ? Object.fromEntries(kpis.map((id) => [id, args]))
        : {};
      return { kpis, locatorArgs };
    }

    case 'solar-irradiation':
    case 'lifecycle-emissions':
    case 'emission-timeline':
      // No aggregate KPI fits these layers — hide the ribbon.
      return { kpis: [], locatorArgs: {} };

    default:
      return { kpis: FALLBACK_KPI_IDS, locatorArgs: {} };
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

  const { kpis: kpiIds, locatorArgs: argsByKpiId } = useMemo(
    () => getRibbonKpis(selectedMapLayer, mapLayerParameters),
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
        // Per-KPI locator_args derived from the active map
        // layer. ``null`` for KPIs whose locators take no args
        // or where the layer doesn't expose a relevant
        // parameter.
        locatorArgs: argsByKpiId[kpiId] ?? null,
      })),
    [kpiIds, argsByKpiId],
  );

  // Hide the entire section (including the divider) when no
  // KPIs apply — beats showing "Run X to see this" placeholders
  // for layers that have no KPI mapping at all.
  if (cards.length === 0) return null;

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
      {/* Tiles stack as full-width landscape rows. Each row is
          its own card matching the OverviewCard's other section
          rows (Project / Scenario / Pathway) so the ribbon reads
          as part of the same vertical stack. */}
      <div style={stackStyle} aria-label="Map-layer-driven KPIs">
        {cards.map((card) => (
          <OverviewKpiTile
            key={card.id}
            card={card}
            project={project}
            scenario={effectiveScenario}
            whatif={whatif}
          />
        ))}
      </div>
    </>
  );
};

const stackStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

export default KpiRibbon;
