import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';

/**
 * Fetch available what-if names for a scenario.
 */
export const useFetchWhatifs = (project, scenario) => {
  return useQuery({
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
};

/**
 * Fetch supported features list.
 */
export const useFetchFeatures = () => {
  return useQuery({
    queryKey: ['reports', 'features'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/reports/features');
      return data.features;
    },
    staleTime: 5 * 60_000,
  });
};

/**
 * Fetch KPI summary for a scenario + feature + optional what-if.
 */
export const useFetchSummary = (project, scenario, feature, whatif) => {
  return useQuery({
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
};

/**
 * Fetch plot HTML for a scenario + feature + optional what-if.
 */
export const useFetchReportPlot = (project, scenario, feature, whatif) => {
  return useQuery({
    queryKey: ['reports', 'plot', project, scenario, feature, whatif],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/reports/plot', {
        params: { project, scenario, feature, whatif: whatif || undefined },
        responseType: 'text',
      });
      return data;
    },
    enabled: !!project && !!scenario && !!feature,
    staleTime: 30_000,
  });
};

/**
 * Fetch zone GeoJSON for a scenario (for map thumbnail).
 */
export const useFetchZoneGeoJSON = (project, scenario) => {
  return useQuery({
    queryKey: ['reports', 'zone-geojson', project, scenario],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/reports/zone-geojson', {
        params: { project, scenario },
      });
      return data;
    },
    enabled: !!project && !!scenario,
    staleTime: 5 * 60_000,
  });
};

/**
 * Fetch scenarios for a project (for inter-mode).
 */
export const useFetchScenarios = (project) => {
  return useQuery({
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
};

/**
 * Fetch parameters for a visualisation tool script.
 */
export const useFetchToolParams = (script, scenario) => {
  return useQuery({
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
};

/**
 * Render a custom plot via POST /api/reports/plot-custom.
 * plotConfig shape: { script, parameters }
 */
export const useFetchCustomPlot = (plotConfig, scenario) => {
  return useQuery({
    queryKey: ['reports', 'custom-plot', plotConfig, scenario],
    queryFn: async () => {
      const { data } = await apiClient.post(
        '/api/reports/plot-custom',
        {
          script: plotConfig.script,
          parameters: plotConfig.parameters || {},
          scenario,
        },
        { responseType: 'text' },
      );
      return data;
    },
    enabled: !!plotConfig?.script,
    staleTime: 30_000,
  });
};
