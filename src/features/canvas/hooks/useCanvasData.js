import { useQuery } from '@tanstack/react-query';
import { getScenarioClient } from 'lib/api/axios';
import { scenarioHeaders } from 'lib/api/scenarioContext';

import { VIEW_PLOT_RESULTS } from 'features/plots/constants';
import { findFamilyForFeature } from 'features/canvas/components/featureCardCommon';
import { useProjectStore } from 'features/project/stores/projectStore';

import { listSavedCanvases } from '../api/canvas';

// Shared so create / duplicate / import / delete handlers in the
// navigator can invalidate the same react-query cache the switcher
// reads from, without re-spelling the array literal in every site.
export const savedCanvasesQueryKey = (project, scenario) => [
  'canvas',
  'saved',
  project,
  scenario,
];

// Reverse `VIEW_PLOT_RESULTS` (feature → script) so we can look
// up a feature key from a plot script name. Used by
// `featureLabelForScript` to walk the existing `PLOT_GROUPS`
// nesting and pick the human-readable family label — same source
// the navigator's plot picker reads, so feature labels stay in
// sync without a duplicated mapping.
const PLOT_SCRIPT_TO_FEATURE = Object.fromEntries(
  Object.entries(VIEW_PLOT_RESULTS)
    .filter(([, script]) => Boolean(script))
    .map(([feature, script]) => [script, feature]),
);

const featureLabelForScript = (script) => {
  if (!script) return null;
  const feature = PLOT_SCRIPT_TO_FEATURE[script];
  if (!feature) return null;
  return findFamilyForFeature(feature)?.label ?? null;
};

/**
 * Names of every saved canvas under `<project, scenario>`. Used by
 * the navigator's dashboard switcher to populate its options. Stale
 * time is short (10 s) so a freshly created / duplicated / imported
 * canvas appears promptly; the matching handlers also explicitly
 * invalidate this key for instant refresh.
 */
export const useFetchSavedCanvases = (project, scenario) =>
  useQuery({
    queryKey: savedCanvasesQueryKey(project, scenario),
    queryFn: () => listSavedCanvases({ project, scenario }),
    enabled: !!project && !!scenario,
    staleTime: 10_000,
  });

// Reads the project store's `scenariosList` directly instead of an
// independent `/api/project/` fetch - that route requires a session
// and isn't mounted under the demo sub-app, but `scenariosList` is
// already kept fresh there (seeded on demo entry, refetched on every
// project load / scenario create-duplicate-delete), so no network
// call is needed here at all.
export const useSiblingScenarios = (project) => {
  const activeProject = useProjectStore((s) => s.project);
  const scenariosList = useProjectStore((s) => s.scenariosList);
  return { data: project && project === activeProject ? scenariosList : [] };
};

export const useFetchWhatifs = (project, scenario) =>
  useQuery({
    queryKey: ['reports', 'whatifs', project, scenario],
    queryFn: async () => {
      const { data } = await getScenarioClient().get('/api/reports/whatifs', {
        headers: scenarioHeaders({ project, scenarioName: scenario }),
      });
      return data.whatifs;
    },
    enabled: !!project && !!scenario,
    staleTime: 30_000,
  });

export const useFetchFeatures = () =>
  useQuery({
    queryKey: ['reports', 'features'],
    queryFn: async () => {
      const { data } = await getScenarioClient().get('/api/reports/features');
      return data.features;
    },
    staleTime: 5 * 60_000,
  });

export const useFetchSummary = (project, scenario, feature, whatif) =>
  useQuery({
    queryKey: ['reports', 'summary', project, scenario, feature, whatif],
    queryFn: async () => {
      const { data } = await getScenarioClient().get('/api/reports/summary', {
        headers: scenarioHeaders({ project, scenarioName: scenario }),
        params: { feature, whatif: whatif || undefined },
      });
      return data;
    },
    enabled: !!project && !!scenario && !!feature,
    staleTime: 30_000,
  });

export const useFetchToolParams = (script, scenario, project) =>
  useQuery({
    queryKey: ['tools', script, project, scenario],
    queryFn: async () => {
      const { data } = await getScenarioClient().get(`/api/tools/${script}`, {
        headers: scenarioHeaders({ project, scenarioName: scenario }),
      });
      return data;
    },
    enabled: !!script,
    staleTime: 30_000,
  });

// Backend quirk: `/plot-custom` calls `parameter.decode(str(value))` per
// field, so dict-typed values (e.g. plot-form `context`) must arrive as
// JSON strings — `str(pythonDict)` produces single-quoted Python repr
// and `json.loads` fails. Stringify objects up front.
const serializeParameters = (params) => {
  if (!params) return {};
  const out = {};
  for (const [key, value] of Object.entries(params)) {
    out[key] =
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? JSON.stringify(value)
        : value;
  }
  return out;
};

// scenarioContext = { scenarioName, pathwayName?, year? }
// Pathway-single columns supply pathwayName + year so the backend
// resolves the child state via X-CEA-Child-Scenario instead of
// receiving the filesystem subpath in the body.
export const useFetchCustomPlot = (plotConfig, scenarioContext, project) => {
  const { scenarioName, pathwayName, year } = scenarioContext ?? {};
  const isPathwayChild = !!pathwayName && year != null;
  return useQuery({
    queryKey: ['reports', 'custom-plot', plotConfig, scenarioContext, project],
    queryFn: async () => {
      // Strip any `scenario` field from `parameters` before sending.
      // The top-level `scenario` field already sets the backend's
      // `config.scenario_name` via `render_plot_html`. The plot-tool
      // form bakes the user's selected scenario into
      // `parameters.scenario` too, and the backend's parameter loop
      // (`config.matching_parameters` → `parameter.set(...)`) would
      // otherwise *override* the top-level scenario with the form's
      // baked-in value — so every comparison column would render
      // origin's data instead of its own. Top-level wins.
      // eslint-disable-next-line no-unused-vars
      const { scenario: _scenario, ...rest } = plotConfig.parameters || {};
      const { data } = await getScenarioClient().post(
        '/api/reports/plot-custom',
        {
          script: plotConfig.script,
          parameters: serializeParameters(rest),
          // Scenario context is fully expressed in the X-CEA-* headers for
          // all column types — effective_scenario resolves to the target
          // path via headers alone, so no body `scenario` is needed.
          // Human-readable feature label (from `PLOT_GROUPS`) so
          // the backend's styled error cards can read e.g.
          // "Run Energy by Carrier for baseline" instead of the
          // CLI script name. Optional — backend falls back to
          // `script_name` when absent.
          feature_label: featureLabelForScript(plotConfig.script),
        },
        {
          responseType: 'text',
          headers: scenarioHeaders({
            project,
            scenarioName,
            ...(isPathwayChild
              ? { childScenario: { pathway_name: pathwayName, year } }
              : {}),
          }),
        },
      );
      return data;
    },
    enabled: !!plotConfig?.script,
    staleTime: 30_000,
  });
};
