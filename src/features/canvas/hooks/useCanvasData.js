import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';

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

export const useFetchScenarios = (project) =>
  useQuery({
    queryKey: ['reports', 'scenarios', project],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/reports/scenarios', {
        params: { project },
      });
      return data.scenarios;
    },
    enabled: !!project,
    staleTime: 30_000,
  });

export const useFetchWhatifs = (project, scenario) =>
  useQuery({
    queryKey: ['reports', 'whatifs', project, scenario],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/reports/whatifs', {
        params: { project, scenario },
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
      const { data } = await apiClient.get('/api/reports/features');
      return data.features;
    },
    staleTime: 5 * 60_000,
  });

export const useFetchSummary = (project, scenario, feature, whatif) =>
  useQuery({
    queryKey: ['reports', 'summary', project, scenario, feature, whatif],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/reports/summary', {
        params: { project, scenario, feature, whatif: whatif || undefined },
      });
      return data;
    },
    enabled: !!project && !!scenario && !!feature,
    staleTime: 30_000,
  });

export const useFetchToolParams = (script, scenario) =>
  useQuery({
    queryKey: ['tools', script, scenario],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/tools/${script}`, {
        params: scenario ? { scenario_name: scenario } : {},
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

export const useFetchCustomPlot = (plotConfig, scenario) =>
  useQuery({
    queryKey: ['reports', 'custom-plot', plotConfig, scenario],
    queryFn: async () => {
      const { data } = await apiClient.post(
        '/api/reports/plot-custom',
        {
          script: plotConfig.script,
          parameters: serializeParameters(plotConfig.parameters),
          scenario,
        },
        { responseType: 'text' },
      );
      return data;
    },
    enabled: !!plotConfig?.script,
    staleTime: 30_000,
  });
