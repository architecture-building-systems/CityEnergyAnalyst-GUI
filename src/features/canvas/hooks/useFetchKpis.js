/**
 * React Query wrappers around `GET /api/kpis/`.
 *
 * Two hooks:
 *
 * - `useFetchKpis(project, scenario, feature, whatif?)` fetches every
 *   KPI in one feature for one scenario. Returns the standard React
 *   Query shape; data is the raw endpoint response
 *   `{ kpis: [...], metadata: {...} }`.
 *
 * - `useKpiCacheInvalidator()` mounts once at app boot and
 *   invalidates the entire `['kpis']` query subtree whenever a CEA
 *   tool finishes (the dashboard already emits
 *   `cea-worker-success`). With `staleTime: 0` on the fetch hook,
 *   the next render after a successful tool run pulls fresh values
 *   automatically.
 *
 * Cache key shape is intentional:
 *   ['kpis', project, scenario, feature, whatif ?? null]
 * — `null` (not `undefined`) so the cache distinguishes "no
 * what-if requested" from a what-if that hasn't loaded yet.
 */

import { useEffect, useMemo } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from 'lib/api/axios';
import socket, { waitForConnection } from 'lib/socket';

import { childStateScenarioPath } from '../stores/canvasStore';

const KPIS_QUERY_ROOT = 'kpis';

const kpisQueryKey = (project, scenario, feature, whatif) => [
  KPIS_QUERY_ROOT,
  project,
  scenario,
  feature,
  whatif ?? null,
];

/**
 * Fetch every KPI in one feature for one scenario.
 *
 * `staleTime: 0` so a tool re-run (which triggers
 * `useKpiCacheInvalidator` below) immediately re-fetches on the
 * next render. The backend's three-hash cache gate makes the
 * actual network round-trip cheap on cache hits.
 */
export const useFetchKpis = (project, scenario, feature, whatif) =>
  useQuery({
    queryKey: kpisQueryKey(project, scenario, feature, whatif),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/kpis/', {
        params: {
          project,
          scenario,
          feature,
          // `undefined` strips the param from the URL — the
          // backend treats it as "no what-if requested".
          whatif: whatif || undefined,
        },
      });
      return data;
    },
    enabled: !!project && !!scenario && !!feature,
    staleTime: 0,
  });

/**
 * Per-state-year fan-out for a pathway sparkline. Issues one
 * `useQuery` per state year (deduped by React Query against the
 * column-level fetches that already live in the cache for the
 * same `(scenario, feature, whatif)` key) and returns the
 * combined `[{ year, value }]` series in chronological order.
 *
 * Inputs:
 *   project          — the canvas project
 *   pathwayName      — selected pathway (from `comparisonSetup`)
 *   parentScenario   — pathway's parent scenario folder
 *   stateYears       — full list of years (e.g. [2020, 2030, 2040, 2050])
 *   feature, kpiId   — which KPI to extract from each year's response
 *   whatif           — optional, forwarded straight through
 *
 * Returns `{ points: Array<{year, value}> | null, isLoading, isError }`.
 * Years missing data carry `value: null` so consumers can break the
 * polyline at gaps. `null` ``points`` means the inputs are not yet
 * sufficient to fetch (no project, no state-years, etc.).
 */
export const useFetchKpiSparkline = ({
  project,
  pathwayName,
  parentScenario,
  stateYears,
  feature,
  kpiId,
  whatif,
}) => {
  const enabled =
    !!project &&
    !!parentScenario &&
    !!pathwayName &&
    !!feature &&
    !!kpiId &&
    Array.isArray(stateYears) &&
    stateYears.length > 1;

  const yearsAndPaths = useMemo(() => {
    if (!enabled) return [];
    return stateYears
      .map((year) => ({
        year,
        scenario: childStateScenarioPath(parentScenario, pathwayName, year),
      }))
      .filter((e) => !!e.scenario);
  }, [enabled, stateYears, parentScenario, pathwayName]);

  const queries = useQueries({
    queries: yearsAndPaths.map(({ scenario }) => ({
      queryKey: [
        KPIS_QUERY_ROOT,
        project,
        scenario,
        feature,
        whatif ?? null,
      ],
      queryFn: async () => {
        const { data } = await apiClient.get('/api/kpis/', {
          params: {
            project,
            scenario,
            feature,
            whatif: whatif || undefined,
          },
        });
        return data;
      },
      enabled,
      staleTime: 0,
    })),
  });

  const points = useMemo(() => {
    if (!enabled) return null;
    return yearsAndPaths.map(({ year }, i) => {
      const result = queries[i];
      const kpi = (result?.data?.kpis ?? []).find((k) => k.id === kpiId);
      const isAvailable = kpi && kpi.available !== false;
      return {
        year,
        value: isAvailable ? kpi.value : null,
      };
    });
  }, [enabled, yearsAndPaths, queries, kpiId]);

  return {
    points,
    isLoading: queries.some((q) => q?.isLoading),
    isError: queries.some((q) => q?.isError),
  };
};

/**
 * Fetch the KPI catalogue — metadata only, no scenario context.
 * Used by `KpiPicker` to render the flat grouped multi-select.
 *
 * Long stale time: the registry is yml-baked and changes only
 * when a CEA release ships, so a per-session fetch is enough.
 * Not invalidated by tool-finish events — registry contents are
 * independent of any scenario's tool runs.
 */
export const useFetchKpiRegistry = () =>
  useQuery({
    queryKey: ['kpi-registry'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/kpis/registry');
      return data;
    },
    staleTime: 60 * 60_000, // 1h
  });

/**
 * App-level subscriber: invalidates every `['kpis', ...]` query
 * whenever a CEA tool finishes, so any open canvas / ribbon
 * re-fetches without a manual reload.
 *
 * Mount once near the QueryClientProvider (`HomePage.jsx`). The
 * effect handles socket reconnect by registering on every
 * `connect` event, mirroring the pattern in `StatusBar.jsx`.
 */
export const useKpiCacheInvalidator = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      // Drop everything under the `kpis` root; React Query
      // re-fetches on next render of any consumer.
      queryClient.invalidateQueries({ queryKey: [KPIS_QUERY_ROOT] });
    };

    // `waitForConnection` ensures we attach after the socket has
    // actually connected — registering against a disconnected
    // socket silently no-ops on reconnect otherwise.
    let cleanup = () => {};
    waitForConnection(() => {
      socket.on('cea-worker-success', handler);
      cleanup = () => socket.off('cea-worker-success', handler);
    });
    return () => cleanup();
  }, [queryClient]);
};
