/**
 * React Query wrappers around `GET /api/kpis/...`.
 *
 * Five hooks:
 *
 * - `useFetchKpiValue({ project, scenario, kpiId, locatorArgs?, whatif? })`
 *   fetches a single KPI value with optional per-card
 *   ``locatorArgs`` override. Used by canvas KPI cards and the
 *   OverviewCard ribbon's compact tiles. The query key includes
 *   ``locatorArgs`` so two cards with different overrides cache
 *   separately.
 *
 * - `useFetchKpiParameters({ project, scenario, kpiId })` returns
 *   the choice lists for a KPI's user-configurable parameters
 *   (drives the canvas picker's step-2 form).
 *
 * - `useFetchKpiSparkline({...})` fans out per-state-year fetches
 *   for pathway-state KPI cards. Currently uses the bulk
 *   ``/api/kpis/?feature=...`` endpoint; per-card ``locatorArgs``
 *   overrides aren't honoured here yet (TODO).
 *
 * - `useFetchKpiRegistry()` fetches the flat KPI catalogue
 *   (metadata only). Long stale time — registry contents are
 *   yml-baked.
 *
 * - `useKpiCacheInvalidator()` mounts once at app boot and drops
 *   the entire `['kpis']` query subtree whenever a CEA tool
 *   finishes (`cea-worker-success` socket event), so the next
 *   render of any consumer pulls fresh values automatically.
 *
 * Cache key shape uses ``null`` (not ``undefined``) for absent
 * fields so React Query distinguishes "no override requested"
 * from "override not yet known".
 */

import { useEffect, useMemo } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from 'lib/api/axios';
import { scenarioHeaders } from 'lib/api/scenarioContext';
import socket, { waitForConnection } from 'lib/socket';

import { childStateScenarioPath } from '../stores/canvasStore';

const KPIS_QUERY_ROOT = 'kpis';

// Stable JSON-stringify helper: undefined / null / empty-object
// all collapse to ``null`` so React Query treats them as the same
// cache key. Otherwise ``{}`` and ``undefined`` would land in
// different slots and pay duplicate fetches.
const _argsKey = (locatorArgs) => {
  if (!locatorArgs) return null;
  const keys = Object.keys(locatorArgs);
  if (keys.length === 0) return null;
  // Sorted keys so {a:1,b:2} and {b:2,a:1} collapse to one key.
  const sorted = {};
  for (const k of keys.sort()) sorted[k] = locatorArgs[k];
  return JSON.stringify(sorted);
};

export const useFetchKpiValue = ({
  project,
  scenario,
  kpiId,
  locatorArgs = null,
  whatif,
}) => {
  const argsKey = _argsKey(locatorArgs);
  return useQuery({
    queryKey: [
      KPIS_QUERY_ROOT,
      'value',
      project,
      scenario,
      kpiId,
      argsKey,
      whatif ?? null,
    ],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/kpis/${kpiId}/value`, {
        headers: scenarioHeaders({ project, scenarioName: scenario }),
        params: {
          locator_args: argsKey || undefined,
          whatif: whatif || undefined,
        },
      });
      return data;
    },
    enabled: !!project && !!scenario && !!kpiId,
    staleTime: 0,
  });
};

// Fetch the parameter spec for a KPI. ``args`` carries the
// user's current draft of parameter values; the backend forwards
// it to dependent generators (e.g. ``phases_for_plan`` filters
// by the picked ``plan_name``). The query key includes the args
// so distinct draft states cache separately and the picker
// re-fetches automatically when the user changes a dependency.
export const useFetchKpiParameters = ({
  project,
  scenario,
  kpiId,
  args = null,
}) => {
  const argsKey = _argsKey(args);
  return useQuery({
    queryKey: [
      KPIS_QUERY_ROOT,
      'parameters',
      project,
      scenario,
      kpiId,
      argsKey,
    ],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/kpis/${kpiId}/parameters`, {
        headers: scenarioHeaders({ project, scenarioName: scenario }),
        params: {
          args: argsKey || undefined,
        },
      });
      return data;
    },
    enabled: !!project && !!scenario && !!kpiId,
    staleTime: 30_000,
  });
};

/**
 * Per-state-year fan-out for a pathway sparkline. Issues one
 * ``useQuery`` per state year and returns the combined
 * ``[{ year, value }]`` series in chronological order.
 *
 * Years missing data carry ``value: null`` so consumers can break
 * the polyline at gaps. ``null`` points means the inputs are not
 * yet sufficient to fetch (no project, no state-years, etc.).
 *
 * NOTE: still hits the bulk ``/api/kpis/?feature=...`` endpoint
 * and ignores per-card ``locatorArgs`` overrides — a sparkline on
 * a card with a non-default ``panel_type`` will currently show
 * the yml-default series. To fix, switch each year's query to the
 * single-KPI ``/api/kpis/<id>/value`` endpoint with the card's
 * args forwarded.
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
    queries: yearsAndPaths.map(({ year, scenario }) => ({
      queryKey: [KPIS_QUERY_ROOT, project, scenario, feature, whatif ?? null],
      queryFn: async () => {
        const { data } = await apiClient.get('/api/kpis/', {
          headers: scenarioHeaders({
            project,
            scenarioName: parentScenario,
            childScenario: { pathway_name: pathwayName, year },
          }),
          params: {
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

export const useFetchKpiRegistry = () =>
  useQuery({
    queryKey: ['kpi-registry'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/kpis/registry');
      return data;
    },
    staleTime: 60 * 60_000, // 1h
  });

export const useKpiCacheInvalidator = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
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
